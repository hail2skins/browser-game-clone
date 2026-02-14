using api.Data;
using api.DTOs;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    [HttpPost("invites")]
    public async Task<IActionResult> CreateInvite(CreateInviteRequest request)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var code = $"INV-{Convert.ToHexString(Guid.NewGuid().ToByteArray())[..10]}";
        var invite = new Invite
        {
            Code = code,
            CreatedByUserId = userId,
            ExpiresAt = request.ExpiresInDays.HasValue ? DateTime.UtcNow.AddDays(request.ExpiresInDays.Value) : null
        };

        db.Invites.Add(invite);
        await db.SaveChangesAsync();

        return Ok(new { invite.Code, invite.ExpiresAt, invite.CreatedAt });
    }

    [HttpGet("pending-users")]
    public async Task<IActionResult> PendingUsers()
    {
        var users = await db.Users
            .Where(u => !u.IsApproved)
            .Select(u => new { u.Id, u.Email, u.CreatedAt })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPatch("users/{userId:guid}/approval")]
    public async Task<IActionResult> ApproveUser(Guid userId, ApproveUserRequest request)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        user.IsApproved = request.IsApproved;
        await db.SaveChangesAsync();

        return Ok(new { user.Id, user.Email, user.IsApproved });
    }
}
