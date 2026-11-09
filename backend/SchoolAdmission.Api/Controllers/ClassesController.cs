using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Models;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
public class ClassesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public ClassesController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    // 1. POST /classes
    [HttpPost]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.TotalSeats <= 0)
        {
            return BadRequest(new ErrorResponse("Class name is required and totalSeats must be greater than 0."));
        }

        var newClass = new ClassEntity
        {
            Id = $"c_{Guid.NewGuid():N}"[..8],
            Name = request.Name.Trim(),
            TotalSeats = request.TotalSeats,
            CreatedAt = DateTime.UtcNow
        };

        _context.Classes.Add(newClass);
        await _context.SaveChangesAsync();

        return StatusCode(201, new ClassResponse(newClass.Id, newClass.Name, newClass.TotalSeats));
    }

    // 2. GET /classes
    [HttpGet]
    public async Task<IActionResult> GetAllClasses()
    {
        var now = DateTime.UtcNow;
        var classes = await _context.Classes
            .Include(c => c.Holds)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        var result = classes.Select(c =>
        {
            int confirmed = c.Holds.Count(h => h.Status == "CONFIRMED");
            int held = c.Holds.Count(h => h.Status == "HELD" && h.ExpiresAt > now);
            int available = Math.Max(0, c.TotalSeats - (confirmed + held));

            return new ClassDetailResponse(c.Id, c.Name, c.TotalSeats, held, confirmed, available);
        }).ToList();

        return Ok(result);
    }

    // 3. GET /classes/{classId}
    [HttpGet("{classId}")]
    public async Task<IActionResult> GetClassById(string classId)
    {
        var now = DateTime.UtcNow;
        var cls = await _context.Classes
            .Include(c => c.Holds)
            .FirstOrDefaultAsync(c => c.Id == classId);

        if (cls == null)
            return NotFound(new ErrorResponse("Class not found."));

        int confirmed = cls.Holds.Count(h => h.Status == "CONFIRMED");
        int held = cls.Holds.Count(h => h.Status == "HELD" && h.ExpiresAt > now);
        int available = Math.Max(0, cls.TotalSeats - (confirmed + held));

        return Ok(new ClassDetailResponse(cls.Id, cls.Name, cls.TotalSeats, held, confirmed, available));
    }

    // 4. POST /classes/{classId}/holds
    [HttpPost("{classId}/holds")]
    public async Task<IActionResult> CreateHold(string classId, [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        // 17-digit birth registration number validation (§1.4)
        if (string.IsNullOrWhiteSpace(studentId) || studentId.Length != 17 || !studentId.All(char.IsDigit))
        {
            return BadRequest(new ErrorResponse("X-Student-Id header must be a valid 17-digit number."));
        }

        int holdDurationSeconds = _config.GetValue<int>("HOLD_DURATION_SECONDS", 600);
        if (holdDurationSeconds <= 0) holdDurationSeconds = 600;

        // PostgreSQL Transaction with Row-Level Lock for concurrency safety (Rule #1 and Bonus #2.6)
        var executionStrategy = _context.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            using var tx = await _context.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
            try
            {
                // Lock the class row with SELECT ... FOR UPDATE
                var cls = await _context.Classes
                    .FromSqlRaw("SELECT * FROM classes WHERE id = {0} FOR UPDATE", classId)
                    .FirstOrDefaultAsync();

                if (cls == null)
                {
                    return (IActionResult)NotFound(new ErrorResponse("Class not found."));
                }

                var now = DateTime.UtcNow;

                // Rule #3: A student cannot have more than ONE active hold or confirmed admission in the same class
                bool hasActiveOrConfirmed = await _context.Holds.AnyAsync(h =>
                    h.ClassId == classId &&
                    h.StudentId == studentId &&
                    (h.Status == "CONFIRMED" || (h.Status == "HELD" && h.ExpiresAt > now)));

                if (hasActiveOrConfirmed)
                {
                    return Conflict(new ErrorResponse("Student already has an active hold or confirmed admission in this class."));
                }

                // Check seat availability
                int confirmedSeats = await _context.Holds.CountAsync(h => h.ClassId == classId && h.Status == "CONFIRMED");
                int heldSeats = await _context.Holds.CountAsync(h => h.ClassId == classId && h.Status == "HELD" && h.ExpiresAt > now);

                if (heldSeats + confirmedSeats >= cls.TotalSeats)
                {
                    return Conflict(new ErrorResponse("No available seats left in this class.")); // 409 Conflict
                }

                // Create Hold
                var hold = new HoldEntity
                {
                    Id = $"h_{Guid.NewGuid():N}"[..8],
                    ClassId = classId,
                    StudentId = studentId,
                    Status = "HELD",
                    ExpiresAt = now.AddSeconds(holdDurationSeconds),
                    CreatedAt = now
                };

                _context.Holds.Add(hold);
                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return StatusCode(201, new HoldCreatedResponse(
                    hold.Id,
                    hold.ClassId,
                    hold.StudentId,
                    hold.Status,
                    hold.ExpiresAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
                ));
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        });
    }
}