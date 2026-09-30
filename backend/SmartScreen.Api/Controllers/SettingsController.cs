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
    public async Task<SettingsDto> Get() => (await LoadAsync()).ToDto();

    [HttpPut("api/settings")]
    public async Task<ActionResult<SettingsDto>> Update(SettingsDto req)
    {
        if (new[] { req.PrimaryColor, req.AccentColor, req.AccentTextColor, req.BackgroundColor }.Any(c => c is null || !HexColor().IsMatch(c)))
            return BadRequest(new { message = "Ngjyrat duhet të jenë në formatin #RRGGBB." });
        if (req.LanguageId is int lang && !await db.Languages.AnyAsync(l => l.Id == lang))
            return BadRequest(new { message = "Gjuha e zgjedhur nuk ekziston." });
        if (!string.IsNullOrWhiteSpace(req.TimeZoneId) && !TimeZoneInfo.TryFindSystemTimeZoneById(req.TimeZoneId.Trim(), out _))
            return BadRequest(new { message = "Zona kohore nuk njihet." });
        if (req.LogoAssetId is int logo && !await db.MediaAssets.AnyAsync(m => m.Id == logo && m.Type == MediaType.Image))
            return BadRequest(new { message = "Logo e zgjedhur nuk ekziston." });

        var s = await LoadAsync();
        s.BusinessName = req.BusinessName.Trim();
        s.Tagline = string.IsNullOrWhiteSpace(req.Tagline) ? null : req.Tagline.Trim();
        s.LogoAssetId = req.LogoAssetId;
        s.PrimaryColor = req.PrimaryColor;
        s.AccentColor = req.AccentColor;
        s.AccentTextColor = req.AccentTextColor;
        s.BackgroundColor = req.BackgroundColor;
        s.LanguageId = req.LanguageId;
        s.Currency = (req.Currency ?? "").Trim();
        s.ShowTicker = req.ShowTicker;
        s.TickerText = req.TickerText;
        s.ShowClock = req.ShowClock;
        s.TimeZoneId = string.IsNullOrWhiteSpace(req.TimeZoneId) ? TimeZoneInfo.Local.Id : req.TimeZoneId.Trim();
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return (await LoadAsync()).ToDto();
    }

    /// <summary>Zonat kohore të sistemit (lista nuk mbahet në kod).</summary>
    [HttpGet("api/settings/timezones")]
    public IEnumerable<string> TimeZones() =>
        TimeZoneInfo.GetSystemTimeZones()
            .Select(tz => TimeZoneInfo.TryConvertWindowsIdToIanaId(tz.Id, out var iana) ? iana : tz.Id)
            .Distinct().Order();

    /// <summary>Emri, logo dhe ngjyrat e biznesit – publike, që t'i shfaqë edhe faqja e hyrjes.</summary>
    [AllowAnonymous]
    [HttpGet("api/branding")]
    public async Task<BrandingDto> Branding() =>
        (await db.BusinessSettings.AsNoTracking().Include(x => x.LogoAsset).FirstOrDefaultAsync() ?? new BusinessSettings())
        .ToBrandingDto();

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

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColor();
}
