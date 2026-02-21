using api.Data;
using api.Game;
using Microsoft.EntityFrameworkCore;

namespace BrowserGame.Api.Tests.Game;

public class WorldMapServiceTests
{
    [Fact]
    public async Task EnsureWorldTilesAsync_SeedsTilesOnlyOnce()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"world-seed-{Guid.NewGuid()}")
            .Options;

        await using var db = new AppDbContext(options);
        var gameWorld = new GameWorldService();
        var sut = new WorldMapService(gameWorld);

        await sut.EnsureWorldTilesAsync(db, seed: 55, width: 16, height: 12);
        await sut.EnsureWorldTilesAsync(db, seed: 55, width: 16, height: 12);

        Assert.Equal(192, await db.WorldTiles.CountAsync());
    }

    [Fact]
    public async Task GetVisibleChunkAsync_ReturnsOnlyFogVisibleTilesInChunk()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"world-chunk-{Guid.NewGuid()}")
            .Options;

        await using var db = new AppDbContext(options);
        var gameWorld = new GameWorldService();
        var sut = new WorldMapService(gameWorld);

        await sut.EnsureWorldTilesAsync(db, seed: 21, width: 32, height: 32);

        var visible = await sut.GetVisibleChunkAsync(
            db,
            chunkX: 0,
            chunkY: 0,
            chunkSize: 16,
            visibilityRadius: 6,
            villagePositions: [(5, 5)]);

        Assert.NotEmpty(visible);
        Assert.All(visible, tile =>
        {
            Assert.InRange(tile.X, 0, 15);
            Assert.InRange(tile.Y, 0, 15);
            var dx = tile.X - 5;
            var dy = tile.Y - 5;
            Assert.True(Math.Sqrt((dx * dx) + (dy * dy)) <= 6.0);
        });
    }
}
