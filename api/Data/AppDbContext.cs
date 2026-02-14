using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Invite> Invites => Set<Invite>();
    public DbSet<Village> Villages => Set<Village>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Invite>().HasIndex(i => i.Code).IsUnique();

        modelBuilder.Entity<Invite>()
            .HasOne(i => i.CreatedByUser)
            .WithMany()
            .HasForeignKey(i => i.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Invite>()
            .HasOne(i => i.UsedByUser)
            .WithMany()
            .HasForeignKey(i => i.UsedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Village>()
            .HasOne(v => v.User)
            .WithMany(u => u.Villages)
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PasswordResetToken>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PasswordResetToken>().HasIndex(t => t.TokenHash);
    }
}
