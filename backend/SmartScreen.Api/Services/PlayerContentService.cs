using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Services;

/// <summary>Ndërton përmbajtjen që shfaq player-i në TV (playlist + menu + cilësimet e biznesit).</summary>
public class PlayerContentService(AppDbContext db)
{
    private static readonly JsonSerializerOptions HashJson = new(JsonSerializerDefaults.Web);

    public async Task<PlayerContentDto> BuildForScreenAsync(Screen screen)
    {
        var settings = await GetSettingsAsync();
        var playlistId = await ResolvePlaylistIdAsync(screen, GetTimeZone(settings.TimeZoneId));
        return await BuildAsync(playlistId, settings, new PlayerScreenDto(screen.Id, screen.Name, screen.Orientation), screen.CommandVersion);
    }

    public async Task<PlayerContentDto> BuildPreviewAsync(int playlistId, ScreenOrientation orientation)
    {
        var settings = await GetSettingsAsync();
        return await BuildAsync(playlistId, settings, new PlayerScreenDto(0, "Preview", orientation), 0);
    }

    /// <summary>Orari aktiv me prioritet më të lartë, përndryshe playlist-a e parazgjedhur.</summary>
    public async Task<int?> ResolvePlaylistIdAsync(Screen screen, TimeZoneInfo tz)
    {
        var schedules = await db.ScreenSchedules.AsNoTracking().Where(s => s.ScreenId == screen.Id).ToListAsync();
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);

        var active = schedules
            .Where(s => IsActive(s, now))
            .OrderByDescending(s => s.Priority)
            .ThenByDescending(s => s.StartTime)
            .FirstOrDefault();

        return active?.PlaylistId ?? screen.DefaultPlaylistId;
    }

    public static bool IsActive(ScreenSchedule s, DateTime localNow)
    {
        var t = TimeOnly.FromDateTime(localNow);
        bool DayOn(DayOfWeek d) => (s.DaysOfWeek & (1 << (int)d)) != 0;

        if (s.StartTime <= s.EndTime)
            return DayOn(localNow.DayOfWeek) && t >= s.StartTime && t < s.EndTime;

        // Orar që kalon mesnatën (p.sh. 22:00–02:00): pjesa pas mesnate i përket ditës së mëparshme.
        if (t >= s.StartTime) return DayOn(localNow.DayOfWeek);
        if (t < s.EndTime) return DayOn(localNow.AddDays(-1).DayOfWeek);
        return false;
    }

    public static TimeZoneInfo GetTimeZone(string? id)
    {
        if (string.IsNullOrWhiteSpace(id)) return TimeZoneInfo.Local;
        try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
        catch { return TimeZoneInfo.Local; }
    }

    private async Task<BusinessSettings> GetSettingsAsync() =>
        await db.BusinessSettings.AsNoTracking().Include(s => s.LogoAsset).FirstOrDefaultAsync() ?? new BusinessSettings();

    private async Task<PlayerContentDto> BuildAsync(int? playlistId, BusinessSettings s, PlayerScreenDto screen, int commandVersion)
    {
        var settings = new PlayerSettingsDto(
            s.BusinessName, s.LogoAsset?.Url, s.PrimaryColor, s.AccentColor, s.Currency, s.ShowTicker, s.TickerText, s.ShowClock);

        PlayerPlaylistDto? playlistDto = null;
        if (playlistId is int id)
        {
            var playlist = await db.Playlists.AsNoTracking()
                .Include(p => p.Items).ThenInclude(i => i.MediaAsset)
                .Include(p => p.Items).ThenInclude(i => i.MenuCategory)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (playlist is not null)
                playlistDto = new PlayerPlaylistDto(playlist.Id, playlist.Name, await BuildSlidesAsync(playlist));
        }

        var version = ComputeVersion(screen, settings, playlistDto);
        return new PlayerContentDto(true, null, version, commandVersion, screen, settings, playlistDto);
    }

    private async Task<List<PlayerSlideDto>> BuildSlidesAsync(Playlist playlist)
    {
        var items = playlist.Items.Where(i => i.IsEnabled).OrderBy(i => i.SortOrder).ToList();

        // Ngarko produktet vetëm një herë për të gjitha slide-t e menusë.
        List<Product> products = [];
        if (items.Any(i => i.Type == SlideType.Menu))
        {
            products = await db.Products.AsNoTracking().Include(p => p.ImageAsset).Include(p => p.Category)
                .OrderBy(p => p.SortOrder).ThenBy(p => p.Name).ToListAsync();
        }

        var slides = new List<PlayerSlideDto>();
        foreach (var i in items)
        {
            PlayerMenuDto? menu = null;
            string? mediaUrl = i.MediaAsset?.Url;

            switch (i.Type)
            {
                case SlideType.Image or SlideType.Video when mediaUrl is null:
                    continue; // media e fshirë – kalo
                case SlideType.WebPage when string.IsNullOrWhiteSpace(i.Url):
                    continue;
                case SlideType.Menu:
                    var selected = i.MenuCategoryId is int catId
                        ? products.Where(p => p.CategoryId == catId)
                        : products.Where(p => p.IsFeatured).OrderBy(p => p.Category?.SortOrder);
                    var title = !string.IsNullOrWhiteSpace(i.Title) ? i.Title : i.MenuCategory?.Name ?? "Ofertat";
                    menu = new PlayerMenuDto(title!, selected.Select(p => new PlayerProductDto(
                        p.Id, p.Name, p.Description, p.Price, p.OldPrice, p.ImageAsset?.Url, p.IsAvailable, p.IsFeatured)).ToList());
                    if (menu.Products.Count == 0) continue;
                    break;
            }

            var duration = i.Type == SlideType.Video ? Math.Max(0, i.DurationSeconds) : Math.Max(3, i.DurationSeconds);
            slides.Add(new PlayerSlideDto(i.Id, i.Type, duration, i.Title, i.Text, mediaUrl, i.Url,
                i.BackgroundColor, i.TextColor, i.Fit, menu));
        }
        return slides;
    }

    private static string ComputeVersion(PlayerScreenDto screen, PlayerSettingsDto settings, PlayerPlaylistDto? playlist)
    {
        var json = JsonSerializer.Serialize(new { screen.Orientation, settings, playlist }, HashJson);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)))[..16];
    }
}
