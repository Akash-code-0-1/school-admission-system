using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("me")]
public class MeController : ControllerBase
{
    private readonly AppDbContext _context;

    public MeController(AppDbContext context)
    {
        _context = context;
    }

    // 8. GET /me/holds
    [HttpGet("holds")]
    public async Task<IActionResult> GetMyHolds([FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (string.IsNullOrWhiteSpace(studentId) || studentId.Length != 17 || !studentId.All(char.IsDigit))
        {
            return BadRequest(new ErrorResponse("Valid 17-digit X-Student-Id header required."));
        }

        var now = DateTime.UtcNow;
        var holds = await _context.Holds
            .Include(h => h.Class)
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync();

        var result = holds.Select(h =>
        {
            string status = h.Status;
            if (status == "HELD" && h.ExpiresAt <= now)
            {
                status = "EXPIRED";
            }

            return new StudentHoldItem(
                h.Id,
                h.ClassId,
                h.Class?.Name ?? "Unknown Class",
                status,
                h.ExpiresAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
            );
        }).ToList();

        return Ok(result);
    }
}