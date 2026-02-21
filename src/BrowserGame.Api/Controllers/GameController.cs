using api.Data;
using api.Game;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GameController(AppDbContext db, GameWorldService worldService) : ControllerBase
{
    private const int WorldWidth = 64;
    private const int WorldHeight = 64;
    private const int WorldSeed = 777;

    [HttpGet("shell")]
    public async Task<IActionResult> GetShellData()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await db.Users.Include(u => u.Villages).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();
        if (!user.IsApproved) return Forbid();

        var now = DateTime.UtcNow;
        foreach (var village in user.Villages)
        {
            worldService.TickResources(village, now);
        }

        await db.SaveChangesAsync();

        var map = worldService.GenerateMap(WorldSeed, WorldWidth, WorldHeight);
        return Ok(new
        {
            player = user.Email,
            world = new
            {
                width = WorldWidth,
                height = WorldHeight,
                seed = WorldSeed,
                tiles = map.Select(t => new { t.X, t.Y, terrain = t.Terrain.ToString().ToLowerInvariant() })
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
                buildings = new
                {
                    main = v.MainBuildingLevel,
                    timberCamp = v.TimberCampLevel,
                    clayPit = v.ClayPitLevel,
                    ironMine = v.IronMineLevel,
                    warehouse = v.WarehouseLevel
                },
                v.CreatedAt
            })
        });
    }

    [HttpPost("villages/{villageId:guid}/buildings/{buildingType}/upgrade")]
    public async Task<IActionResult> UpgradeBuilding(Guid villageId, string buildingType)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        if (!Enum.TryParse<BuildingType>(buildingType, ignoreCase: true, out var parsedBuildingType))
        {
            return BadRequest("Unknown building type.");
        }

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
}
