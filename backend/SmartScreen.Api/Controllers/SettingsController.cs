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
[BusinessScoped]
public partial class SettingsController(AppDbContext db, BusinessAccess access) : ControllerBase
{
    [HttpGet("api/settings")]
    public async Task<SettingsDto> Get() => await ToDtoAsync(await LoadAsync());

    [HttpPut("api/settings")]
    [BusinessScoped(fullAccess: true)]
    public async Task<ActionResult<SettingsDto>> Update(SettingsDto req)
    {
        if (!HexColor().IsMatch(req.PrimaryColor) || !HexColor().IsMatch(req.AccentColor))
            return BadRequest(new { message = "Ngjyrat duhet të jenë në formatin #RRGGBB." });
        if (req.LogoAssetId is int logo && !await db.MediaAssets.AnyAsync(m => m.Id == logo && m.BusinessId == access.BusinessId && m.Type == MediaType.Image))
            return BadRequest(new { message = "Logo e zgjedhur nuk ekziston." });
        if (!IsTime(req.OpeningTime) || !IsTime(req.ClosingTime))
            return BadRequest(new { message = "Orari duhet të jetë në formatin HH:mm (p.sh. 10:00, 24:00)." });
        if (string.IsNullOrWhiteSpace(req.BusinessName))
            return BadRequest(new { message = "Vendosni emrin e biznesit." });
        var timeZone = string.IsNullOrWhiteSpace(req.TimeZoneId) ? "Europe/Tirane" : req.TimeZoneId.Trim();
        if (!TimeZoneInfo.TryFindSystemTimeZoneById(timeZone, out _))
            return BadRequest(new { message = $"Zona kohore '{timeZone}' nuk njihet." });
        if (req.SleepWhenClosed && (string.IsNullOrWhiteSpace(req.OpeningTime) || string.IsNullOrWhiteSpace(req.ClosingTime)))
            return BadRequest(new { message = "Për të fikur ekranet jashtë orarit vendosni orën e hapjes dhe të mbylljes." });

        var s = await LoadAsync();
        s.BusinessName = req.BusinessName.Trim();
        s.LogoAssetId = req.LogoAssetId;
        s.PrimaryColor = req.PrimaryColor;
        s.AccentColor = req.AccentColor;
        // Monedha nuk ruhet këtu: shfaqet gjithmonë valuta kryesore (api/currencies/{id}/main).
        s.ShowTicker = req.ShowTicker;
        s.TickerText = req.TickerText;
        s.ShowClock = req.ShowClock;
        s.TimeZoneId = timeZone;
        s.SleepWhenClosed = req.SleepWhenClosed;
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

    /// <summary>
    /// Njoftim urgjent në të gjitha ekranet e biznesit (mbulon gjithë ekranin). Arrin te TV-të brenda ~15 sekondave.
    /// </summary>
    [HttpPut("api/settings/alert")]
    [BusinessScoped(fullAccess: true)]
    public async Task<ActionResult<SettingsDto>> SetAlert(SaveAlertRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) && string.IsNullOrWhiteSpace(req.Text))
            return BadRequest(new { message = "Shkruani titullin ose tekstin e njoftimit." });
        if (req.Color is { Length: > 0 } c && !HexColor().IsMatch(c))
            return BadRequest(new { message = "Ngjyrat duhet të jenë në formatin #RRGGBB." });
        if (req.DurationMinutes is < 0 or > 60 * 24 * 365)
            return BadRequest(new { message = "Kohëzgjatja e njoftimit nuk është e vlefshme." });

        var s = await LoadAsync();
        s.AlertTitle = Clean(req.Title);
        s.AlertText = Clean(req.Text);
        s.AlertColor = string.IsNullOrEmpty(req.Color) ? Mapping.DefaultAlertColor : req.Color;
        s.AlertExpiresAt = req.DurationMinutes is > 0 ? DateTime.UtcNow.AddMinutes(req.DurationMinutes.Value) : null;
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await ToDtoAsync(s);
    }

    [HttpDelete("api/settings/alert")]
    [BusinessScoped(fullAccess: true)]
    public async Task<ActionResult<SettingsDto>> ClearAlert()
    {
        var s = await LoadAsync();
        (s.AlertTitle, s.AlertText, s.AlertExpiresAt) = (null, null, null);
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await ToDtoAsync(s);
    }

    [HttpGet("api/dashboard")]
    public async Task<DashboardDto> Dashboard()
    {
        var screens = await access.Screens(db.Screens).AsNoTracking()
            .Include(s => s.DefaultPlaylist).Include(s => s.Schedules)
            .OrderByDescending(s => s.LastSeenAt).ToListAsync();
        var dtos = screens.Select(s => s.ToDto()).ToList();

        return new DashboardDto(
            dtos.Count, dtos.Count(s => s.IsOnline),
            await db.MediaAssets.CountAsync(m => m.BusinessId == access.BusinessId),
            await db.Playlists.CountAsync(p => p.BusinessId == access.BusinessId),
            await db.Products.CountAsync(p => p.Category!.BusinessId == access.BusinessId),
            dtos);
    }

    private async Task<BusinessSettings> LoadAsync() =>
        await db.BusinessSettings.Include(x => x.LogoAsset).FirstAsync(x => x.Id == access.BusinessId);

    private async Task<SettingsDto> ToDtoAsync(BusinessSettings s) =>
        s.ToDto(await MainCurrency.GetSymbolAsync(db, s.Id, s.Currency));

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Bosh ose "HH:mm" (00:00–24:00).</summary>
    private static bool IsTime(string? value) =>
        string.IsNullOrWhiteSpace(value) || value.Trim() == "24:00" || TimeOnly.TryParseExact(value.Trim(), "HH:mm", out _);

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColor();
}
