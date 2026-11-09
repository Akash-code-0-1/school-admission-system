using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolAdmission.Api.Models;

[Table("classes")]
public class ClassEntity
{
    [Key]
    [Column("id")]
    [StringLength(50)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [Column("name")]
    [StringLength(255)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("total_seats")]
    public int TotalSeats { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<HoldEntity> Holds { get; set; } = new List<HoldEntity>();
}