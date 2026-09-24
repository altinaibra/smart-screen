using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

/// <summary>Bizneset (restorant, berber, dyqan...). Secili ka ekranet, reklamat dhe menunë e vet.</summary>
[ApiController]
[Route("api/businesses")]
[Authorize]
public class BusinessesController(AppDbContext db) : ControllerBase
{
    /// <summary>Bizneset që sheh përdoruesi aktual.</summary>
    [HttpGet]
    public async Task<ActionResult<List<BusinessDto>>> GetAll()
    {
        var user = await BusinessAccess.LoadUserAsync(db, User);
        if (user is null) return Unauthorized();
        return await ListAsync(db, user);
    }

    [HttpPost]
    [AdminOnly]
    public async Task<ActionResult<BusinessDto>> Create(CreateBusinessRequest req)
    {
        var business = new BusinessSettings
        {
            BusinessName = req.Name.Trim(),
            BusinessType = req.BusinessType is "barber" or "shop" ? req.BusinessType : "restaurant",
        };
        db.BusinessSettings.Add(business);
        await db.SaveChangesAsync();
        return new BusinessDto(business.Id, business.BusinessName, business.BusinessType, null, true, 0);
    }

    /// <summary>Fshin biznesin me gjithë ekranet, playlistat, median, menunë, valutat dhe mënyrat e pagesës.</summary>
    [HttpDelete("{id:int}")]
    [AdminOnly]
    public async Task<IActionResult> Delete(int id)
    {
        var business = await db.BusinessSettings.FindAsync(id);
        if (business is null) return NotFound();
        if (await db.BusinessSettings.CountAsync() == 1)
            return BadRequest(new { message = "Biznesi i fundit nuk mund të fshihet." });

        // Lidhjet me biznesin janë NoAction (SQL Server), prandaj të dhënat fshihen këtu me radhë.
        // Oraret, slide-t, produktet dhe copat e medias fshihen vetë (ON DELETE CASCADE).
        await using var tx = await db.Database.BeginTransactionAsync();
        await db.Screens.Where(s => s.BusinessId == id).ExecuteDeleteAsync();
        await db.Playlists.Where(p => p.BusinessId == id).ExecuteDeleteAsync();
        await db.MenuCategories.Where(c => c.BusinessId == id).ExecuteDeleteAsync();
        business.LogoAssetId = null;
        await db.SaveChangesAsync();
        await db.MediaAssets.Where(m => m.BusinessId == id).ExecuteDeleteAsync();
        await db.Currencies.Where(c => c.BusinessId == id).ExecuteDeleteAsync();
        await db.PaymentMethods.Where(p => p.BusinessId == id).ExecuteDeleteAsync();
        db.BusinessSettings.Remove(business);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return NoContent();
    }

    internal static async Task<List<BusinessDto>> ListAsync(AppDbContext db, AppUser user)
    {
        var access = await BusinessAccess.AccessibleAsync(db, user.Id, user.IsAdmin);
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
