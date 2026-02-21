using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Invite> Invites => Set<Invite>();
    public DbSet<Village> Villages => Set<Village>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<WorldTile> WorldTiles => Set<WorldTile>();
    public DbSet<TroopMovement> TroopMovements => Set<TroopMovement>();

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

        modelBuilder.Entity<WorldTile>()
            .HasIndex(t => new { t.X, t.Y })
            .IsUnique();

        modelBuilder.Entity<TroopMovement>()
            .HasOne(t => t.SourceVillage)
            .WithMany()
            .HasForeignKey(t => t.SourceVillageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TroopMovement>()
            .HasOne(t => t.TargetVillage)
            .WithMany()
            .HasForeignKey(t => t.TargetVillageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TroopMovement>()
            .HasIndex(t => t.ArrivesAt);
    }
}
