using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

/// <summary>Bizneset e klientit (restorant, berber, dyqan...). Secili ka ekranet, reklamat dhe menunë e vet.</summary>
[ApiController]
[Route("api/businesses")]
[Authorize]
public class BusinessesController(AppDbContext db) : ControllerBase
{
    /// <summary>Bizneset që sheh përdoruesi aktual në klientin aktiv.</summary>
    [HttpGet]
    public async Task<ActionResult<List<BusinessDto>>> GetAll()
    {
        var user = await BusinessAccess.LoadUserAsync(db, User);
        if (user is null) return Unauthorized();
        return await ListAsync(db, user, await BusinessAccess.ClientIdAsync(db, user, Request));
    }

    [HttpPost]
    [AdminOnly]
    public async Task<ActionResult<BusinessDto>> Create(CreateBusinessRequest req)
    {
        var business = NewBusiness(BusinessAccess.CurrentClientId(HttpContext), req.Name, req.BusinessType);
        db.BusinessSettings.Add(business);
        await db.SaveChangesAsync();
        return new BusinessDto(business.Id, business.BusinessName, business.BusinessType, null, true, 0);
    }

    [HttpDelete("{id:int}")]
    [AdminOnly]
    public async Task<IActionResult> Delete(int id)
    {
        var clientId = BusinessAccess.CurrentClientId(HttpContext);
        if (!await db.BusinessSettings.AnyAsync(b => b.Id == id && b.ClientId == clientId)) return NotFound();
        if (await db.BusinessSettings.CountAsync(b => b.ClientId == clientId) == 1)
            return BadRequest(new { message = "Biznesi i fundit nuk mund të fshihet." });

        await using var tx = await db.Database.BeginTransactionAsync();
        await BusinessCleanup.DeleteAsync(db, id);
        await tx.CommitAsync();
        return NoContent();
    }

    internal static BusinessSettings NewBusiness(int clientId, string name, string? type) => new()
    {
        ClientId = clientId,
        BusinessName = name.Trim(),
        BusinessType = type is "barber" or "shop" ? type : "restaurant",
    };

    internal static async Task<List<BusinessDto>> ListAsync(AppDbContext db, AppUser user, int? clientId)
    {
        var access = await BusinessAccess.AccessibleAsync(db, user, clientId);
        var ids = access.Keys.ToList();
        var businesses = await db.BusinessSettings.AsNoTracking().Include(b => b.LogoAsset)
            .Where(b => ids.Contains(b.Id)).OrderBy(b => b.BusinessName).ToListAsync();

        var screenCounts = await db.Screens.Where(s => s.IsPaired && s.BusinessId != null && ids.Contains(s.BusinessId.Value))
            .GroupBy(s => s.BusinessId!.Value).Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);
        // Përdoruesi pa qasje të plotë sheh vetëm numrin e ekraneve të veta.
        var ownScreens = user.IsAdmin ? [] : await db.UserScreens.Where(x => x.UserId == user.Id && x.Screen!.IsPaired)
            .GroupBy(x => x.Screen!.BusinessId!.Value).Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        return businesses.Select(b => new BusinessDto(
            b.Id, b.BusinessName, b.BusinessType, b.LogoAsset?.Url, access[b.Id],
            access[b.Id] ? screenCounts.GetValueOrDefault(b.Id) : ownScreens.GetValueOrDefault(b.Id))).ToList();
    }
}
