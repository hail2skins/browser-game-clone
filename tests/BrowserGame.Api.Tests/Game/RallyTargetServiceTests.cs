using api.Data;
using api.Game;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace BrowserGame.Api.Tests.Game;

public class RallyTargetServiceTests
{
    [Fact]
    public async Task AddFavoriteAsync_AddsOrUpdatesFavoriteForVillage()
    {
        await using var db = CreateDb();
        var user = new User { Email = "art@test.local", PasswordHash = "hash", IsApproved = true };
        var targetVillage = new Village { UserId = user.Id, Name = "Camp", X = 10, Y = 10 };
        db.Users.Add(user);
        db.Villages.Add(targetVillage);
        await db.SaveChangesAsync();
        var sut = new RallyTargetService(db);

        await sut.AddFavoriteAsync(user.Id, targetVillage.Id, "First", DateTime.UtcNow);
        var favorites = await sut.AddFavoriteAsync(user.Id, targetVillage.Id, "Updated", DateTime.UtcNow.AddMinutes(1));

        Assert.Single(favorites);
        Assert.Equal("Updated", favorites[0].Label);
    }

    [Fact]
    public async Task GetRecentTargetsAsync_ReturnsDistinctTargetsByLatestCommand()
    {
        await using var db = CreateDb();
        var user = new User { Email = "art@test.local", PasswordHash = "hash", IsApproved = true };
        var home = new Village { UserId = user.Id, Name = "Home", X = 1, Y = 1 };
        var firstTarget = new Village { UserId = user.Id, Name = "First", X = 2, Y = 2 };
        var secondTarget = new Village { UserId = user.Id, Name = "Second", X = 3, Y = 3 };
        db.Users.Add(user);
        db.Villages.AddRange(home, firstTarget, secondTarget);
        await db.SaveChangesAsync();

        db.TroopMovements.AddRange(
            new TroopMovement
            {
                SourceVillageId = home.Id,
                TargetVillageId = firstTarget.Id,
                UnitType = "spearman",
                UnitCount = 5,
                Mission = "attack",
                Status = "resolved",
                DepartedAt = new DateTime(2026, 3, 12, 10, 0, 0, DateTimeKind.Utc),
                ArrivesAt = new DateTime(2026, 3, 12, 10, 5, 0, DateTimeKind.Utc),
                ResolvedAt = new DateTime(2026, 3, 12, 10, 5, 0, DateTimeKind.Utc)
            },
            new TroopMovement
            {
                SourceVillageId = home.Id,
                TargetVillageId = secondTarget.Id,
                UnitType = "spearman",
                UnitCount = 5,
                Mission = "attack",
                Status = "resolved",
                DepartedAt = new DateTime(2026, 3, 12, 11, 0, 0, DateTimeKind.Utc),
                ArrivesAt = new DateTime(2026, 3, 12, 11, 5, 0, DateTimeKind.Utc),
                ResolvedAt = new DateTime(2026, 3, 12, 11, 5, 0, DateTimeKind.Utc)
            },
            new TroopMovement
            {
                SourceVillageId = home.Id,
                TargetVillageId = firstTarget.Id,
                UnitType = "spearman",
                UnitCount = 5,
                Mission = "attack",
                Status = "resolved",
                DepartedAt = new DateTime(2026, 3, 12, 12, 0, 0, DateTimeKind.Utc),
                ArrivesAt = new DateTime(2026, 3, 12, 12, 5, 0, DateTimeKind.Utc),
                ResolvedAt = new DateTime(2026, 3, 12, 12, 5, 0, DateTimeKind.Utc)
            });
        await db.SaveChangesAsync();
        var sut = new RallyTargetService(db);

        var recent = await sut.GetRecentTargetsAsync(user.Id, 5);

        Assert.Equal(2, recent.Count);
        Assert.Equal(firstTarget.Id, recent[0].VillageId);
        Assert.Equal(secondTarget.Id, recent[1].VillageId);
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }
}
