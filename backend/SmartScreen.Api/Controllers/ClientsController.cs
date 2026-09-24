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
/// Klientët që kanë blerë aplikacionin (vetëm për pronarin). Pronari hyn në një klient me header-in
/// X-Client-Id dhe e sheh panelin e tij si administratori i klientit.
/// </summary>
[ApiController]
[Route("api/clients")]
[Authorize]
[OwnerOnly]
public class ClientsController(AppDbContext db, IPasswordHasher<AppUser> hasher) : ControllerBase
{
    private const int MinPasswordLength = 6;

    [HttpGet]
    public async Task<List<ClientDto>> GetAll()
    {
        var clients = await db.Clients.AsNoTracking().OrderBy(c => c.Name).ToListAsync();
        var businesses = await db.BusinessSettings.GroupBy(b => b.ClientId)
            .Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count);
        var users = await db.Users.Where(u => u.ClientId != null).GroupBy(u => u.ClientId!.Value)
            .Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count);
        var onlineSince = DateTime.UtcNow - Mapping.OnlineWindow;
        var screens = await db.Screens.Where(s => s.IsPaired && s.BusinessId != null)
            .GroupBy(s => s.Business!.ClientId)
            .Select(g => new { g.Key, Count = g.Count(), Online = g.Count(s => s.LastSeenAt > onlineSince) })
            .ToDictionaryAsync(x => x.Key);

        return clients.Select(c => new ClientDto(
            c.Id, c.Name, c.ContactPerson, c.Phone, c.Email, c.Notes, c.IsActive, c.CreatedAt,
            businesses.GetValueOrDefault(c.Id), users.GetValueOrDefault(c.Id),
            screens.GetValueOrDefault(c.Id)?.Count ?? 0, screens.GetValueOrDefault(c.Id)?.Online ?? 0)).ToList();
    }

    /// <summary>Krijon klientin, biznesin e tij të parë dhe administratorin që do të hyjë në panel.</summary>
    [HttpPost]
    public async Task<ActionResult<ClientDto>> Create(CreateClientRequest req)
    {
        var username = req.AdminUsername.Trim();
        if (username.Length == 0) return BadRequest(new { message = "Vendosni emrin e përdoruesit për administratorin." });
        if (req.AdminPassword.Length < MinPasswordLength)
            return BadRequest(new { message = $"Fjalëkalimi duhet të ketë të paktën {MinPasswordLength} karaktere." });
        if (await db.Users.AnyAsync(u => u.Username == username))
            return BadRequest(new { message = $"Përdoruesi '{username}' ekziston tashmë." });

        await using var tx = await db.Database.BeginTransactionAsync();
        var client = new Client();
        Apply(client, new SaveClientRequest(req.Name, req.ContactPerson, req.Phone, req.Email, req.Notes));
        db.Clients.Add(client);
        await db.SaveChangesAsync();

        db.BusinessSettings.Add(BusinessesController.NewBusiness(client.Id, req.BusinessName, req.BusinessType));
        var admin = new AppUser { Username = username, Role = AppUser.AdminRole, ClientId = client.Id };
        admin.PasswordHash = hasher.HashPassword(admin, req.AdminPassword);
        db.Users.Add(admin);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return (await GetAll()).First(c => c.Id == client.Id);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ClientDto>> Update(int id, SaveClientRequest req)
    {
        var client = await db.Clients.FindAsync(id);
        if (client is null) return NotFound();
        Apply(client, req);
        await db.SaveChangesAsync();
        return (await GetAll()).First(c => c.Id == id);
    }

    /// <summary>Fshin klientin me gjithë bizneset, ekranet, reklamat dhe përdoruesit e tij.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await db.Clients.AnyAsync(c => c.Id == id)) return NotFound();

        await using var tx = await db.Database.BeginTransactionAsync();
        foreach (var businessId in await db.BusinessSettings.Where(b => b.ClientId == id).Select(b => b.Id).ToListAsync())
            await BusinessCleanup.DeleteAsync(db, businessId);
        await db.Users.Where(u => u.ClientId == id).ExecuteDeleteAsync();
        await db.Clients.Where(c => c.Id == id).ExecuteDeleteAsync();
        await tx.CommitAsync();
        return NoContent();
    }

    private static void Apply(Client c, SaveClientRequest req)
    {
        c.Name = req.Name.Trim();
        c.ContactPerson = Clean(req.ContactPerson);
        c.Phone = Clean(req.Phone);
        c.Email = Clean(req.Email);
        c.Notes = Clean(req.Notes);
        c.IsActive = req.IsActive;
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
