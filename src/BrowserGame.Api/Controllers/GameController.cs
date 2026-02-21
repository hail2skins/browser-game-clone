using api.Data;
using api.DTOs;
using api.Game;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GameController(AppDbContext db, GameWorldService worldService, WorldMapService worldMapService) : ControllerBase
{
    private const int WorldWidth = 64;
    private const int WorldHeight = 64;
    private const int WorldSeed = 777;
    private const int DefaultChunkSize = 16;

    [HttpGet("shell")]
    public async Task<IActionResult> GetShellData([FromQuery] int chunkX = 0, [FromQuery] int chunkY = 0, [FromQuery] int chunkSize = DefaultChunkSize)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var user = await db.Users.Include(u => u.Villages).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();
        if (!user.IsApproved) return Forbid();

        chunkSize = Math.Clamp(chunkSize, 8, 32);

        var now = DateTime.UtcNow;

        foreach (var village in user.Villages)
        {
            worldService.TickResources(village, now);
        }

        await worldMapService.EnsureWorldTilesAsync(db, WorldSeed, WorldWidth, WorldHeight);
        await EnsureBarbarianVillages();
        await ResolveDueMovements(now);
        await ResolveDueBuildQueue(now);

        var visibleTiles = await worldMapService.GetVisibleChunkAsync(
            db,
            chunkX,
            chunkY,
            chunkSize,
            visibilityRadius: 8,
            villagePositions: user.Villages.Select(v => (v.X, v.Y)).ToList());

        var outgoing = await db.TroopMovements
            .Include(m => m.SourceVillage)
            .Include(m => m.TargetVillage)
            .Where(m => m.Status == "outbound" && m.SourceVillage != null && m.SourceVillage.UserId == userId)
            .OrderBy(m => m.ArrivesAt)
            .ToListAsync();

        var villageIds = user.Villages.Select(v => v.Id).ToList();
        var buildQueue = await db.BuildingQueueItems
            .Where(q => q.CompletedAt == null && villageIds.Contains(q.VillageId))
            .OrderBy(q => q.CompletesAt)
            .ToListAsync();

        var minX = chunkX * chunkSize;
        var minY = chunkY * chunkSize;
        var maxX = minX + chunkSize - 1;
        var maxY = minY + chunkSize - 1;

        var visibleOthers = await db.Villages
            .Where(v => !villageIds.Contains(v.Id) &&
                        v.X >= minX && v.X <= maxX &&
                        v.Y >= minY && v.Y <= maxY)
            .Select(v => new
            {
                v.Id,
                v.Name,
                v.X,
                v.Y
            })
            .ToListAsync();

        await db.SaveChangesAsync();

        return Ok(new
        {
            player = user.Email,
            world = new
            {
                width = WorldWidth,
                height = WorldHeight,
                seed = WorldSeed,
                chunkX,
                chunkY,
                chunkSize,
                fog = true,
                tiles = visibleTiles.Select(t => new { t.X, t.Y, terrain = t.Terrain })
            },
            villages = user.Villages.Select(v => new
            {
                v.Id,
                v.Name,
                v.LocationPlaceholder,
                v.X,
                v.Y,
                v.Wood,
                v.Clay,
                v.Iron,
                troops = new
                {
                    spearmen = v.Spearmen,
                    swordsmen = v.Swordsmen
                },
                buildings = new
                {
                    main = v.MainBuildingLevel,
                    timberCamp = v.TimberCampLevel,
                    clayPit = v.ClayPitLevel,
                    ironMine = v.IronMineLevel,
                    warehouse = v.WarehouseLevel
                },
                v.CreatedAt
            }),
            movements = outgoing.Select(m => new
            {
                m.Id,
                m.SourceVillageId,
                m.TargetVillageId,
                m.UnitType,
                m.UnitCount,
                m.Mission,
                m.ArrivesAt
            }),
            buildQueue = buildQueue.Select(q => new
            {
                q.Id,
                q.VillageId,
                q.BuildingType,
                q.CompletesAt
            }),
            visibleVillages = visibleOthers
        });
    }

    [HttpPost("villages/{villageId:guid}/buildings/{buildingType}/upgrade")]
    public async Task<IActionResult> UpgradeBuilding(Guid villageId, string buildingType)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        if (!Enum.TryParse<BuildingType>(buildingType, ignoreCase: true, out var parsedBuildingType))
            return BadRequest("Unknown building type.");

        var village = await db.Villages.FirstOrDefaultAsync(v => v.Id == villageId && v.UserId == userId);
        if (village is null)
            return NotFound();

        var success = worldService.TryUpgradeBuilding(village, parsedBuildingType, DateTime.UtcNow);
        if (!success)
            return BadRequest("Not enough resources for this upgrade.");

        await db.SaveChangesAsync();

        return Ok(new
        {
            village.Id,
            village.Wood,
            village.Clay,
            village.Iron,
            village.MainBuildingLevel,
            village.TimberCampLevel,
            village.ClayPitLevel,
            village.IronMineLevel,
            village.WarehouseLevel
        });
    }

    [HttpPost("villages/{villageId:guid}/buildings/{buildingType}/queue")]
    public async Task<IActionResult> QueueBuildingUpgrade(Guid villageId, string buildingType)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        if (!Enum.TryParse<BuildingType>(buildingType, ignoreCase: true, out var parsedBuildingType))
            return BadRequest("Unknown building type.");

        var village = await db.Villages.FirstOrDefaultAsync(v => v.Id == villageId && v.UserId == userId);
        if (village is null)
            return NotFound();

        var queueDepth = await db.BuildingQueueItems.CountAsync(q => q.VillageId == villageId && q.CompletedAt == null);
        var success = worldService.TryQueueBuildingUpgrade(village, parsedBuildingType, DateTime.UtcNow, queueDepth, out var completesAt);
        if (!success)
            return BadRequest("Not enough resources for this upgrade.");

        db.BuildingQueueItems.Add(new BuildingQueueItem
        {
            VillageId = villageId,
            BuildingType = parsedBuildingType.ToString(),
            CompletesAt = completesAt
        });

        await db.SaveChangesAsync();
        return Ok(new { villageId, buildingType = parsedBuildingType.ToString(), completesAt });
    }

    [HttpPost("villages/{villageId:guid}/recruit")]
    public async Task<IActionResult> RecruitUnits(Guid villageId, RecruitUnitsRequest request)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        if (!Enum.TryParse<UnitType>(request.UnitType, ignoreCase: true, out var unitType))
            return BadRequest("Unknown unit type.");

        var village = await db.Villages.FirstOrDefaultAsync(v => v.Id == villageId && v.UserId == userId);
        if (village is null)
            return NotFound();

        var success = worldService.TryRecruitUnits(village, unitType, request.Count);
        if (!success)
            return BadRequest("Could not recruit units. Check resources and count.");

        await db.SaveChangesAsync();

        return Ok(new
        {
            village.Id,
            village.Spearmen,
            village.Swordsmen,
            village.Wood,
            village.Clay,
            village.Iron
        });
    }

    [HttpPost("movements/attack")]
    public async Task<IActionResult> AttackVillage(AttackVillageRequest request)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        if (!Enum.TryParse<UnitType>(request.UnitType, ignoreCase: true, out var unitType))
            return BadRequest("Unknown unit type.");

        if (request.UnitCount <= 0)
            return BadRequest("Unit count must be greater than zero.");

        var source = await db.Villages.FirstOrDefaultAsync(v => v.Id == request.SourceVillageId && v.UserId == userId);
        if (source is null)
            return NotFound("Source village not found.");

        var target = await db.Villages.FirstOrDefaultAsync(v => v.Id == request.TargetVillageId);
        if (target is null)
            return NotFound("Target village not found.");

        if (!TryRemoveUnits(source, unitType, request.UnitCount))
            return BadRequest("Not enough units in source village.");

        var now = DateTime.UtcNow;
        var arrival = worldService.GetMovementArrival(now, source, target, unitType);

        db.TroopMovements.Add(new TroopMovement
        {
            SourceVillageId = source.Id,
            TargetVillageId = target.Id,
            UnitType = unitType.ToString().ToLowerInvariant(),
            UnitCount = request.UnitCount,
            Mission = "attack",
            Status = "outbound",
            DepartedAt = now,
            ArrivesAt = arrival
        });

        await db.SaveChangesAsync();

        return Ok(new
        {
            message = "Attack launched.",
            arrivesAt = arrival
        });
    }

    private async Task ResolveDueMovements(DateTime now)
    {
        var due = await db.TroopMovements
            .Include(m => m.SourceVillage)
            .Include(m => m.TargetVillage)
            .Where(m => m.Status == "outbound" && m.ArrivesAt <= now)
            .ToListAsync();

        foreach (var movement in due)
        {
            if (!Enum.TryParse<UnitType>(movement.UnitType, true, out var attackerUnitType) ||
                movement.TargetVillage is null ||
                movement.SourceVillage is null)
            {
                movement.Status = "resolved";
                movement.ResolvedAt = now;
                continue;
            }

            var defendingType = movement.TargetVillage.Swordsmen > 0 ? UnitType.Swordsman : UnitType.Spearman;
            var defendingCount = defendingType == UnitType.Swordsman
                ? movement.TargetVillage.Swordsmen
                : movement.TargetVillage.Spearmen;

            var result = worldService.ResolveCombat(
                new Army(attackerUnitType, movement.UnitCount),
                new Army(defendingType, defendingCount));

            if (defendingType == UnitType.Swordsman)
            {
                movement.TargetVillage.Swordsmen = result.DefenderSurvivors;
            }
            else
            {
                movement.TargetVillage.Spearmen = result.DefenderSurvivors;
            }

            movement.Status = "resolved";
            movement.ResolvedAt = now;
        }
    }

    private async Task ResolveDueBuildQueue(DateTime now)
    {
        var due = await db.BuildingQueueItems
            .Include(q => q.Village)
            .Where(q => q.CompletedAt == null && q.CompletesAt <= now)
            .OrderBy(q => q.CompletesAt)
            .ToListAsync();

        foreach (var queued in due)
        {
            if (queued.Village is null ||
                !Enum.TryParse<BuildingType>(queued.BuildingType, true, out var buildingType))
            {
                queued.CompletedAt = now;
                continue;
            }

            worldService.CompleteQueuedBuildingUpgrade(queued.Village, buildingType);
            queued.CompletedAt = now;
        }
    }

    private static bool TryRemoveUnits(Village village, UnitType unitType, int count)
    {
        switch (unitType)
        {
            case UnitType.Spearman when village.Spearmen >= count:
                village.Spearmen -= count;
                return true;
            case UnitType.Swordsman when village.Swordsmen >= count:
                village.Swordsmen -= count;
                return true;
            default:
                return false;
        }
    }

    private bool TryGetUserId(out Guid userId)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out userId);
    }

    private async Task EnsureBarbarianVillages()
    {
        if (await db.Users.AnyAsync(u => u.Email == "barbarian@realm.local"))
            return;

        var barbarian = new User
        {
            Email = "barbarian@realm.local",
            PasswordHash = "barbarian",
            IsApproved = true,
            IsAdmin = false
        };
        db.Users.Add(barbarian);
        await db.SaveChangesAsync();

        var rng = new Random(777);
        var villages = new List<Village>();
        for (var i = 0; i < 14; i++)
        {
            villages.Add(new Village
            {
                UserId = barbarian.Id,
                Name = $"Barbarian Camp {i + 1}",
                LocationPlaceholder = "NPC",
                X = rng.Next(0, WorldWidth),
                Y = rng.Next(0, WorldHeight),
                Wood = 700,
                Clay = 700,
                Iron = 700,
                Spearmen = rng.Next(5, 25),
                Swordsmen = rng.Next(0, 10)
            });
        }

        db.Villages.AddRange(villages);
        await db.SaveChangesAsync();
    }
}
