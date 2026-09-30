using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

/// <summary>API publike që përdoret nga TV-të (player-i). Identifikimi bëhet me DeviceKey.</summary>
[ApiController]
[Route("api/player")]
[AllowAnonymous]
public class PlayerController(AppDbContext db, PlayerContentService content) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("player-register")]
    public async Task<PlayerRegisterResponse> Register(PlayerRegisterRequest req)
    {
        Screen? screen = null;
        if (!string.IsNullOrWhiteSpace(req.DeviceKey))
            screen = await db.Screens.FirstOrDefaultAsync(s => s.DeviceKey == req.DeviceKey);

        var settings = await content.BuildSettingsAsync();
        if (screen is null)
        {
            var code = await GeneratePairingCodeAsync();
            screen = new Screen
            {
                // Emri i përkohshëm (admini e vendos gjatë çiftimit): teksti "screen.defaultName" nga databaza.
                Name = settings.Labels.GetValueOrDefault("screen.defaultName") is { Length: > 0 } n ? n : code,
                DeviceKey = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant(),
                PairingCode = code,
            };
            db.Screens.Add(screen);
        }

        ApplyDeviceInfo(screen, req.Width, req.Height, req.UserAgent);
        await db.SaveChangesAsync();
        return new PlayerRegisterResponse(screen.DeviceKey, screen.IsPaired, screen.PairingCode, settings);
    }

    /// <summary>Player-i e thërret çdo ~15 sekonda. Shërben edhe si "heartbeat" (online/offline).</summary>
    [HttpGet("{deviceKey}/content")]
    public async Task<ActionResult<PlayerContentDto>> Content(string deviceKey, [FromQuery] int? w, [FromQuery] int? h)
    {
        var screen = await db.Screens.FirstOrDefaultAsync(s => s.DeviceKey == deviceKey);
        if (screen is null) return NotFound();

        ApplyDeviceInfo(screen, w ?? 0, h ?? 0, null);
        await db.SaveChangesAsync();

        if (!screen.IsPaired)
            return new PlayerContentDto(false, screen.PairingCode, null, screen.CommandVersion, null,
                await content.BuildSettingsAsync(), null);

        return await content.BuildForScreenAsync(screen);
    }

    private void ApplyDeviceInfo(Screen screen, int width, int height, string? userAgent)
    {
        screen.LastSeenAt = DateTime.UtcNow;
        if (width > 0 && height > 0 && width <= 16000 && height <= 16000)
        {
            screen.ResolutionWidth = width;
            screen.ResolutionHeight = height;
        }

        var ua = userAgent ?? Request.Headers.UserAgent.ToString();
        if (!string.IsNullOrEmpty(ua))
        {
            screen.UserAgent = ua.Length > 500 ? ua[..500] : ua;
            screen.Platform = DetectPlatform(ua);
        }
    }

    public static ScreenPlatform DetectPlatform(string ua)
    {
        ua = ua.ToLowerInvariant();
        if (ua.Contains("web0s") || ua.Contains("webos") || ua.Contains("netcast")) return ScreenPlatform.LgWebOs;
        if (ua.Contains("tizen") || ua.Contains("smart-tv") && ua.Contains("samsung")) return ScreenPlatform.SamsungTizen;
        if (ua.Contains("bravia") || ua.Contains("sony")) return ScreenPlatform.SonyBravia;
        if (ua.Contains("android")) return ScreenPlatform.AndroidTv;
        return ScreenPlatform.Browser;
    }

    private async Task<string> GeneratePairingCodeAsync()
    {
        while (true)
        {
            var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            if (!await db.Screens.AnyAsync(s => !s.IsPaired && s.PairingCode == code)) return code;
        }
    }
}
