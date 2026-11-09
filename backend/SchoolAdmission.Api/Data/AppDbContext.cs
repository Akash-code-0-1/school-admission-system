using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Models;

namespace SchoolAdmission.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<ClassEntity> Classes => Set<ClassEntity>();
    public DbSet<HoldEntity> Holds => Set<HoldEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ClassEntity>(entity =>
        {
            entity.HasIndex(e => e.Id);
        });

        modelBuilder.Entity<HoldEntity>(entity =>
        {
            entity.HasIndex(e => e.ClassId);
            entity.HasIndex(e => e.StudentId);
            entity.HasIndex(e => new { e.ClassId, e.Status });
        });
    }
}