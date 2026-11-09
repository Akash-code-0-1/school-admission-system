using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("holds")]
public class HoldsController : ControllerBase
{
    private readonly AppDbContext _context;

    public HoldsController(AppDbContext context)
    {
        _context = context;
    }

    // 5. GET /holds/{holdId}
    [HttpGet("{holdId}")]
    public async Task<IActionResult> GetHoldById(string holdId)
    {
        var hold = await _context.Holds.FirstOrDefaultAsync(h => h.Id == holdId);
        if (hold == null)
            return NotFound(new ErrorResponse("Hold not found."));

        // Dynamic status check if expired (§2.5 Rule 2)
        string effectiveStatus = hold.Status;
        if (effectiveStatus == "HELD" && hold.ExpiresAt <= DateTime.UtcNow)
        {
            effectiveStatus = "EXPIRED";
        }

        return Ok(new HoldStatusResponse(
            hold.Id,
            hold.ClassId,
            effectiveStatus,
            hold.ExpiresAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
        ));
    }

    // 6. POST /holds/{holdId}/confirm
    [HttpPost("{holdId}/confirm")]
    public async Task<IActionResult> ConfirmHold(string holdId, [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (string.IsNullOrWhiteSpace(studentId) || studentId.Length != 17 || !studentId.All(char.IsDigit))
        {
            return BadRequest(new ErrorResponse("Valid 17-digit X-Student-Id header required."));
        }

        var hold = await _context.Holds.FirstOrDefaultAsync(h => h.Id == holdId);
        if (hold == null)
            return NotFound(new ErrorResponse("Hold not found."));

        // Rule #4: Can only confirm own application
        if (hold.StudentId != studentId)
            return BadRequest(new ErrorResponse("You can only confirm your own application."));

        // Rule #5: Idempotent confirmation (একই আবেদনে confirm একাধিকবার এলেও confirmedSeats একবারই বাড়বে)
        if (hold.Status == "CONFIRMED")
        {
            return Ok(new HoldConfirmResponse(hold.Id, "CONFIRMED"));
        }

        // Rule #4: শুধু নিজের, মেয়াদ না পেরোনো HELD আবেদন confirm করা যাবে
        if (hold.Status != "HELD" || hold.ExpiresAt <= DateTime.UtcNow)
        {
            if (hold.Status == "HELD" && hold.ExpiresAt <= DateTime.UtcNow)
            {
                hold.Status = "EXPIRED";
                await _context.SaveChangesAsync();
            }
            return BadRequest(new ErrorResponse("Only active and unexpired HELD applications can be confirmed."));
        }

        hold.Status = "CONFIRMED";
        await _context.SaveChangesAsync();

        return Ok(new HoldConfirmResponse(hold.Id, "CONFIRMED"));
    }

    // 7. DELETE /holds/{holdId}
    [HttpDelete("{holdId}")]
    public async Task<IActionResult> CancelHold(string holdId, [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (string.IsNullOrWhiteSpace(studentId) || studentId.Length != 17 || !studentId.All(char.IsDigit))
        {
            return BadRequest(new ErrorResponse("Valid 17-digit X-Student-Id header required."));
        }

        var hold = await _context.Holds.FirstOrDefaultAsync(h => h.Id == holdId);
        if (hold == null)
            return NotFound(new ErrorResponse("Hold not found."));

        if (hold.StudentId != studentId)
            return BadRequest(new ErrorResponse("You can only cancel your own hold."));

        if (hold.Status == "CONFIRMED")
            return BadRequest(new ErrorResponse("Confirmed admissions cannot be cancelled."));

        hold.Status = "CANCELLED";
        await _context.SaveChangesAsync();

        return NoContent(); // 204 No Content
    }
}