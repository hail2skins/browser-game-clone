using api.Data;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Game;

public class RallyTargetService(AppDbContext db)
{
    public async Task<List<FavoriteTarget>> GetFavoritesAsync(Guid userId)
    {
        return await db.FavoriteTargets
            .Include(target => target.Village)
            .Where(target => target.UserId == userId)
            .OrderByDescending(target => target.UpdatedAt)
            .ToListAsync();
    }

    public async Task<List<FavoriteTarget>> AddFavoriteAsync(Guid userId, Guid villageId, string label, DateTime nowUtc)
    {
        var existing = await db.FavoriteTargets
            .Include(target => target.Village)
            .FirstOrDefaultAsync(target => target.UserId == userId && target.VillageId == villageId);

        if (existing is null)
        {
            existing = new FavoriteTarget
            {
                UserId = userId,
                VillageId = villageId,
                CreatedAt = nowUtc
            };
            db.FavoriteTargets.Add(existing);
        }

        existing.Label = label.Trim();
        existing.UpdatedAt = nowUtc;

        await db.SaveChangesAsync();
        return await GetFavoritesAsync(userId);
    }

    public async Task<bool> DeleteFavoriteAsync(Guid userId, Guid favoriteId)
    {
        var existing = await db.FavoriteTargets
            .FirstOrDefaultAsync(target => target.Id == favoriteId && target.UserId == userId);

        if (existing is null)
        {
            return false;
        }

        db.FavoriteTargets.Remove(existing);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<List<RecentTargetEntry>> GetRecentTargetsAsync(Guid userId, int limit)
    {
        var recent = await db.TroopMovements
            .Include(movement => movement.SourceVillage)
            .Include(movement => movement.TargetVillage)
            .Where(movement =>
                movement.SourceVillage != null &&
                movement.SourceVillage.UserId == userId &&
                movement.TargetVillage != null &&
                movement.Mission == "attack")
            .OrderByDescending(movement => movement.ResolvedAt ?? movement.ArrivesAt)
            .Select(movement => new
            {
                movement.TargetVillageId,
                Village = movement.TargetVillage!,
                Timestamp = movement.ResolvedAt ?? movement.ArrivesAt
            })
            .ToListAsync();

        return recent
            .GroupBy(entry => entry.TargetVillageId)
            .Select(group => group.OrderByDescending(entry => entry.Timestamp).First())
            .OrderByDescending(entry => entry.Timestamp)
            .Take(Math.Max(1, limit))
            .Select(entry => new RecentTargetEntry(entry.TargetVillageId, entry.Village.Name, entry.Village.X, entry.Village.Y))
            .ToList();
    }
}

public record RecentTargetEntry(Guid VillageId, string Name, int X, int Y);
