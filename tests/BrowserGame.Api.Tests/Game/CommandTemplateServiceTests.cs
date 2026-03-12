using api.Data;
using api.Game;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace BrowserGame.Api.Tests.Game;

public class CommandTemplateServiceTests
{
    [Fact]
    public async Task SaveTemplateAsync_CreatesNewTemplateForUser()
    {
        await using var db = CreateDb();
        var user = new User { Email = "art@test.local", PasswordHash = "hash", IsApproved = true };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var sut = new CommandTemplateService(db);

        var templates = await sut.SaveTemplateAsync(user.Id, "Raid", "Spearman", 10, DateTime.UtcNow);

        Assert.Single(templates);
        Assert.Equal("Raid", templates[0].Name);
        Assert.Equal("Spearman", templates[0].UnitType);
        Assert.Equal(10, templates[0].UnitCount);
    }

    [Fact]
    public async Task SaveTemplateAsync_UpdatesTemplateWhenNameMatches()
    {
        await using var db = CreateDb();
        var user = new User { Email = "art@test.local", PasswordHash = "hash", IsApproved = true };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        db.CommandTemplates.Add(new CommandTemplate
        {
            UserId = user.Id,
            Name = "Raid",
            UnitType = "Spearman",
            UnitCount = 10,
            UpdatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc)
        });
        await db.SaveChangesAsync();
        var sut = new CommandTemplateService(db);

        var templates = await sut.SaveTemplateAsync(user.Id, "Raid", "Swordsman", 4, DateTime.UtcNow);

        Assert.Single(templates);
        Assert.Equal("Swordsman", templates[0].UnitType);
        Assert.Equal(4, templates[0].UnitCount);
    }

    [Fact]
    public async Task SaveTemplateAsync_PrunesTemplatesPastLimit()
    {
        await using var db = CreateDb();
        var user = new User { Email = "art@test.local", PasswordHash = "hash", IsApproved = true };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        for (var index = 0; index < 6; index++)
        {
            db.CommandTemplates.Add(new CommandTemplate
            {
                UserId = user.Id,
                Name = $"T{index}",
                UnitType = "Spearman",
                UnitCount = index + 1,
                UpdatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc).AddMinutes(index)
            });
        }

        await db.SaveChangesAsync();
        var sut = new CommandTemplateService(db);

        var templates = await sut.SaveTemplateAsync(user.Id, "Newest", "Spearman", 25, DateTime.UtcNow, maxTemplates: 6);

        Assert.Equal(6, templates.Count);
        Assert.DoesNotContain(templates, template => template.Name == "T0");
        Assert.Contains(templates, template => template.Name == "Newest");
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }
}
