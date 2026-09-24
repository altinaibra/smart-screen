using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, IPasswordHasher<AppUser> hasher, TokenService tokens) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username.Trim());
        if (user is null || hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password) == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Përdoruesi ose fjalëkalimi është i gabuar." });
        if (!user.IsOwner && !await db.Clients.AnyAsync(c => c.Id == user.ClientId && c.IsActive))
            return Unauthorized(new { message = "Llogaria është çaktivizuar. Kontaktoni furnitorin e aplikacionit." });

        var (token, expires) = tokens.CreateToken(user);
        return new LoginResponse(token, user.Username, expires, user.Role);
    }

    /// <summary>Përdoruesi aktual dhe bizneset që sheh (për zgjedhjen e biznesit në panel).</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<MeDto>> Me()
    {
        var user = await BusinessAccess.LoadUserAsync(db, User);
        if (user is null) return Unauthorized();
        var clientId = await BusinessAccess.ClientIdAsync(db, user, Request);
        var client = clientId is null ? null
            : await db.Clients.Where(c => c.Id == clientId).Select(c => new ClientRefDto(c.Id, c.Name)).FirstAsync();
        return new MeDto(user.Id, user.Username, user.Role, user.IsAdmin, user.IsOwner, client,
            await BusinessesController.ListAsync(db, user, clientId));
    }

    [HttpPut("password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(id);
        if (user is null) return Unauthorized();

        if (hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword) == PasswordVerificationResult.Failed)
            return BadRequest(new { message = "Fjalëkalimi aktual është i gabuar." });

        user.PasswordHash = hasher.HashPassword(user, req.NewPassword);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
