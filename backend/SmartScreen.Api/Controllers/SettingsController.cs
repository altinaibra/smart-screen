using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

[ApiController]
[Authorize]
public partial class SettingsController(AppDbContext db) : ControllerBase
{
    [HttpGet("api/settings")]
    public async Task<SettingsDto> Get() => await ToDtoAsync(await LoadAsync());

    [HttpPut("api/settings")]
    public async Task<ActionResult<SettingsDto>> Update(SettingsDto req)
    {
        if (!HexColor().IsMatch(req.PrimaryColor) || !HexColor().IsMatch(req.AccentColor))
            return BadRequest(new { message = "Ngjyrat duhet të jenë në formatin #RRGGBB." });
        if (req.LogoAssetId is int logo && !await db.MediaAssets.AnyAsync(m => m.Id == logo && m.Type == MediaType.Image))
            return BadRequest(new { message = "Logo e zgjedhur nuk ekziston." });
        if (!IsTime(req.OpeningTime) || !IsTime(req.ClosingTime))
            return BadRequest(new { message = "Orari duhet të jetë në formatin HH:mm (p.sh. 10:00, 24:00)." });

        var s = await LoadAsync();
        s.BusinessName = req.BusinessName.Trim();
        s.LogoAssetId = req.LogoAssetId;
        s.PrimaryColor = req.PrimaryColor;
        s.AccentColor = req.AccentColor;
        // Monedha nuk ruhet këtu: shfaqet gjithmonë valuta kryesore (api/currencies/{id}/main).
        s.ShowTicker = req.ShowTicker;
        s.TickerText = req.TickerText;
        s.ShowClock = req.ShowClock;
        s.TimeZoneId = string.IsNullOrWhiteSpace(req.TimeZoneId) ? "Europe/Tirane" : req.TimeZoneId.Trim();
        s.Tagline = Clean(req.Tagline);
        s.Slogan = Clean(req.Slogan);
        s.OpeningTime = Clean(req.OpeningTime);
        s.ClosingTime = Clean(req.ClosingTime);
        s.Phone = Clean(req.Phone);
        s.SocialHandle = Clean(req.SocialHandle);
        s.ScreenLanguage = req.ScreenLanguage == "en" ? "en" : "sq";
        s.BusinessType = req.BusinessType is "barber" or "shop" ? req.BusinessType : "restaurant";
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return await ToDtoAsync(await LoadAsync());
    }

    [HttpGet("api/dashboard")]
    public async Task<DashboardDto> Dashboard()
    {
        var screens = await db.Screens.AsNoTracking().Where(s => s.IsPaired)
            .Include(s => s.DefaultPlaylist).Include(s => s.Schedules)
            .OrderByDescending(s => s.LastSeenAt).ToListAsync();
        var dtos = screens.Select(s => s.ToDto()).ToList();

        return new DashboardDto(
            dtos.Count, dtos.Count(s => s.IsOnline),
            await db.MediaAssets.CountAsync(), await db.Playlists.CountAsync(), await db.Products.CountAsync(),
            dtos);
    }

    private async Task<BusinessSettings> LoadAsync()
    {
        var s = await db.BusinessSettings.Include(x => x.LogoAsset).FirstOrDefaultAsync();
        if (s is null)
        {
            s = new BusinessSettings();
            db.BusinessSettings.Add(s);
            await db.SaveChangesAsync();
        }
        return s;
    }

    private async Task<SettingsDto> ToDtoAsync(BusinessSettings s) =>
        s.ToDto(await MainCurrency.GetSymbolAsync(db, s.Currency));

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Bosh ose "HH:mm" (00:00–24:00).</summary>
    private static bool IsTime(string? value) =>
        string.IsNullOrWhiteSpace(value) || value.Trim() == "24:00" || TimeOnly.TryParseExact(value.Trim(), "HH:mm", out _);

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColor();
}
