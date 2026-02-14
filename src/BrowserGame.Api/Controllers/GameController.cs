using api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GameController(AppDbContext db) : ControllerBase
{
    [HttpGet("shell")]
    public async Task<IActionResult> GetShellData()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await db.Users.Include(u => u.Villages).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();
        if (!user.IsApproved) return Forbid();

        return Ok(new
        {
            player = user.Email,
            villages = user.Villages.Select(v => new { v.Id, v.Name, v.LocationPlaceholder, v.CreatedAt })
        });
    }
}
