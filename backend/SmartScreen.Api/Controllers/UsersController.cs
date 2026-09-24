using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

/// <summary>
/// Përdoruesit e klientit aktiv dhe qasjet e tyre (administratori i klientit ose pronari brenda klientit).
/// Një përdorues mund të ketë qasje të plotë në disa biznese dhe/ose vetëm në disa ekrane të bizneseve të tjera.
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
[AdminOnly]
public class UsersController(AppDbContext db, IPasswordHasher<AppUser> hasher) : ControllerBase
{
    private const int MinPasswordLength = 6;

    private int ClientId => BusinessAccess.CurrentClientId(HttpContext);
    private IQueryable<AppUser> Users => db.Users.Where(u => u.ClientId == ClientId);

    [HttpGet]
    public async Task<List<UserDto>> GetAll()
    {
        var users = await Users.AsNoTracking().Include(u => u.Businesses).Include(u => u.Screens)
            .OrderBy(u => u.Username).ToListAsync();
        return users.Select(ToDto).ToList();
    }

    /// <summary>Bizneset me ekranet e tyre, për zgjedhjen e qasjeve.</summary>
    [HttpGet("access-options")]
    public async Task<List<AccessOptionDto>> AccessOptions()
    {
        var businesses = await db.BusinessSettings.AsNoTracking().Where(b => b.ClientId == ClientId).OrderBy(b => b.BusinessName)
            .Select(b => new { b.Id, b.BusinessName }).ToListAsync();
        var screens = await db.Screens.AsNoTracking().Where(s => s.IsPaired && s.Business!.ClientId == ClientId)
            .OrderBy(s => s.Name).Select(s => new { s.Id, s.Name, s.Location, BusinessId = s.BusinessId!.Value }).ToListAsync();

        return businesses.Select(b => new AccessOptionDto(b.Id, b.BusinessName,
            screens.Where(s => s.BusinessId == b.Id).Select(s => new AccessOptionScreenDto(s.Id, s.Name, s.Location)).ToList())).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(SaveUserRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < MinPasswordLength)
            return BadRequest(new { message = $"Fjalëkalimi duhet të ketë të paktën {MinPasswordLength} karaktere." });

        var user = new AppUser { ClientId = ClientId };
        var error = await ApplyAsync(user, req);
        if (error is not null) return BadRequest(new { message = error });

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return ToDto(user);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, SaveUserRequest req)
    {
        var user = await Users.Include(u => u.Businesses).Include(u => u.Screens).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();
        if (!string.IsNullOrEmpty(req.Password) && req.Password.Length < MinPasswordLength)
            return BadRequest(new { message = $"Fjalëkalimi duhet të ketë të paktën {MinPasswordLength} karaktere." });
        if (user.IsAdmin && req.Role != AppUser.AdminRole && await IsLastAdminAsync(user.Id))
            return BadRequest(new { message = "Duhet të mbetet të paktën një administrator." });

        var error = await ApplyAsync(user, req);
        if (error is not null) return BadRequest(new { message = error });

        await db.SaveChangesAsync();
        return ToDto(user);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();
        if (user.Id == (await BusinessAccess.LoadUserAsync(db, User))?.Id)
            return BadRequest(new { message = "Nuk mund ta fshini përdoruesin me të cilin jeni kyçur." });
        if (user.IsAdmin && await IsLastAdminAsync(user.Id))
            return BadRequest(new { message = "Duhet të mbetet të paktën një administrator." });

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> ApplyAsync(AppUser user, SaveUserRequest req)
    {
        var username = req.Username.Trim();
        if (username.Length == 0) return "Vendosni emrin e përdoruesit.";
        if (await db.Users.AnyAsync(u => u.Username == username && u.Id != user.Id))
            return $"Përdoruesi '{username}' ekziston tashmë.";
        if (req.Role is not (AppUser.AdminRole or AppUser.UserRole))
            return "Roli nuk është i vlefshëm.";

        var businessIds = (req.BusinessIds ?? []).Distinct().ToList();
        var screenIds = (req.ScreenIds ?? []).Distinct().ToList();
        if (await db.BusinessSettings.CountAsync(b => businessIds.Contains(b.Id) && b.ClientId == ClientId) != businessIds.Count)
            return "Një nga bizneset nuk ekziston.";
        // Ekranet e bizneseve me qasje të plotë janë të përfshira vetë, prandaj nuk ruhen veç.
        var screens = await db.Screens.Where(s => screenIds.Contains(s.Id) && s.IsPaired && s.Business!.ClientId == ClientId)
            .Select(s => new { s.Id, s.BusinessId }).ToListAsync();
        if (screens.Count != screenIds.Count)
            return "Një nga ekranet nuk ekziston.";

        user.Username = username;
        user.Role = req.Role;
        if (!string.IsNullOrEmpty(req.Password))
            user.PasswordHash = hasher.HashPassword(user, req.Password);

        // Administratori sheh gjithë klientin, nuk i duhen qasje të veçanta.
        var isAdmin = req.Role == AppUser.AdminRole;
        user.Businesses = isAdmin ? [] : businessIds.Select(id => new UserBusiness { BusinessId = id }).ToList();
        user.Screens = isAdmin ? [] : screens.Where(s => !businessIds.Contains(s.BusinessId ?? 0))
            .Select(s => new UserScreen { ScreenId = s.Id }).ToList();
        return null;
    }

    /// <summary>Çdo klient duhet të ketë të paktën një administrator.</summary>
    private Task<bool> IsLastAdminAsync(int userId) =>
        Users.AllAsync(u => u.Id == userId || u.Role != AppUser.AdminRole);

    private static UserDto ToDto(AppUser u) => new(
        u.Id, u.Username, u.Role, u.CreatedAt,
        u.Businesses.Select(b => b.BusinessId).ToList(), u.Screens.Select(s => s.ScreenId).ToList());
}
