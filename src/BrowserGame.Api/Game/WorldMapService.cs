using api.Data;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Game;

public class WorldMapService(GameWorldService gameWorldService)
{
    public async Task EnsureWorldTilesAsync(AppDbContext db, int seed, int width, int height)
    {
        if (await db.WorldTiles.AnyAsync())
        {
            return;
        }

        var tiles = gameWorldService.GenerateMap(seed, width, height)
            .Select(t => new WorldTile
            {
                X = t.X,
                Y = t.Y,
                Terrain = t.Terrain.ToString().ToLowerInvariant()
            });

        await db.WorldTiles.AddRangeAsync(tiles);
        await db.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<WorldTile>> GetVisibleChunkAsync(
        AppDbContext db,
        int chunkX,
        int chunkY,
        int chunkSize,
        int visibilityRadius,
        IReadOnlyCollection<(int X, int Y)> villagePositions)
    {
        var minX = chunkX * chunkSize;
        var minY = chunkY * chunkSize;
        var maxX = minX + chunkSize - 1;
        var maxY = minY + chunkSize - 1;

        var tiles = await db.WorldTiles
            .Where(t => t.X >= minX && t.X <= maxX && t.Y >= minY && t.Y <= maxY)
            .ToListAsync();

        if (!villagePositions.Any())
        {
            return [];
        }

        return tiles
            .Where(tile => villagePositions.Any(v => Distance((tile.X, tile.Y), v) <= visibilityRadius))
            .ToList();
    }

    private static double Distance((int X, int Y) first, (int X, int Y) second)
    {
        var dx = first.X - second.X;
        var dy = first.Y - second.Y;
        return Math.Sqrt((dx * dx) + (dy * dy));
    }
}
