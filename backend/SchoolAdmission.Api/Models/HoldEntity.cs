using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolAdmission.Api.Models;

[Table("holds")]
public class HoldEntity
{
    [Key]
    [Column("id")]
    [StringLength(50)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [Column("class_id")]
    [StringLength(50)]
    public string ClassId { get; set; } = string.Empty;

    [ForeignKey(nameof(ClassId))]
    public ClassEntity? Class { get; set; }

    [Required]
    [Column("student_id")]
    [StringLength(17)]
    public string StudentId { get; set; } = string.Empty;

    [Required]
    [Column("status")]
    [StringLength(20)]
    public string Status { get; set; } = "HELD"; // HELD, CONFIRMED, EXPIRED, CANCELLED

    [Required]
    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}