using System.Security.Cryptography;
using System.Text;
using api.Data;
using api.DTOs;
using api.Game;
using api.Models;
using api.Services;
using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, JwtService jwtService, GameWorldService worldService) : ControllerBase
{
    private const int WorldWidth = 64;
    private const int WorldHeight = 64;
    private const int SpawnDistance = 6;

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.InviteCode))
            return BadRequest("Email, password, and invite code are required.");

        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict("User already exists.");

        var invite = await db.Invites
            .FirstOrDefaultAsync(i => i.Code == request.InviteCode && !i.IsRevoked && i.UsedByUserId == null);

        if (invite is null)
            return BadRequest("Invalid invite code.");

        if (invite.ExpiresAt.HasValue && invite.ExpiresAt.Value < DateTime.UtcNow)
            return BadRequest("Invite code expired.");

        var isFirstUser = !await db.Users.AnyAsync();

        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsApproved = isFirstUser,
            IsAdmin = isFirstUser
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        invite.UsedByUserId = user.Id;
        await db.SaveChangesAsync();

        var existing = await db.Villages.ToListAsync();
        var seed = email.GetHashCode(StringComparison.Ordinal);
        var spawn = worldService.AssignStartingVillageLocation(existing, seed, WorldWidth, WorldHeight, SpawnDistance);

        db.Villages.Add(new Village
        {
            UserId = user.Id,
            Name = "Starter Hamlet",
            LocationPlaceholder = $"({spawn.X},{spawn.Y})",
            X = spawn.X,
            Y = spawn.Y
        });

        await db.SaveChangesAsync();

        return Ok(new
        {
            message = isFirstUser
                ? "Registration complete. You are the first admin and approved automatically."
                : "Registration complete. Awaiting admin approval."
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized("Invalid credentials.");

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var token = jwtService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Email, user.IsApproved, user.IsAdmin));
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout() => Ok(new { message = "Logged out on client side. Token invalidation list can be added later." });

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null)
            return Ok(new { message = "If that email exists, reset instructions were generated." });

        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var tokenHash = Hash(rawToken);

        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        });

        await db.SaveChangesAsync();

        return Ok(new
        {
            message = "Password reset token generated.",
            resetToken = rawToken
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var hash = Hash(request.Token);
        var token = await db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (token is null || token.IsUsed || token.ExpiresAt < DateTime.UtcNow || token.User is null)
            return BadRequest("Invalid or expired token.");

        token.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        token.UsedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { message = "Password reset successful." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await db.Users.FindAsync(userId);
        if (user is null) return Unauthorized();

        return Ok(new { user.Email, user.IsApproved, user.IsAdmin, user.CreatedAt });
    }

    private static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }
}
