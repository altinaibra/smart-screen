using System.ComponentModel.DataAnnotations;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Dtos;

// ---------- Auth ----------
public record LoginRequest([Required] string Username, [Required] string Password);
public record LoginResponse(string Token, string Username, DateTime ExpiresAt);
public record ChangePasswordRequest([Required] string CurrentPassword, [Required, MinLength(6)] string NewPassword);

// ---------- Screens ----------
public record ScheduleDto(int? Id, int PlaylistId, string? PlaylistName, int DaysOfWeek, string StartTime, string EndTime, int Priority);

public record ScreenDto(
    int Id, string Name, string? Location, ScreenPlatform Platform, int ResolutionWidth, int ResolutionHeight,
    ScreenOrientation Orientation, int? DefaultPlaylistId, string? DefaultPlaylistName, bool IsOnline,
    DateTime? LastSeenAt, DateTime CreatedAt, List<ScheduleDto> Schedules);

public record PairScreenRequest(
    [Required] string PairingCode, [Required, MaxLength(100)] string Name, string? Location,
    int? DefaultPlaylistId, ScreenOrientation Orientation = ScreenOrientation.Landscape);

public record UpdateScreenRequest(
    [Required, MaxLength(100)] string Name, string? Location, int? DefaultPlaylistId,
    ScreenOrientation Orientation, List<ScheduleDto>? Schedules);

// ---------- Media ----------
public record MediaDto(int Id, string Name, MediaType Type, string Url, string ContentType, long SizeBytes, DateTime CreatedAt);
public class UploadMediaForm
{
    public IFormFile? File { get; set; }
    public string? Name { get; set; }
}
public record RenameMediaRequest([Required, MaxLength(200)] string Name);

// ---------- Playlists ----------
public record PlaylistSummaryDto(int Id, string Name, string? Description, int ItemCount, int TotalDurationSeconds, int ScreenCount, DateTime UpdatedAt);

public record PlaylistItemDto(
    int? Id, SlideType Type, int DurationSeconds, bool IsEnabled, string? Title, string? Text, string? Url,
    string? BackgroundColor, string? TextColor, MediaFit Fit, int? MediaAssetId, MediaDto? MediaAsset, int? MenuCategoryId);

public record PlaylistDto(int Id, string Name, string? Description, DateTime UpdatedAt, List<PlaylistItemDto> Items);

public record SavePlaylistRequest([Required, MaxLength(100)] string Name, string? Description, List<PlaylistItemDto>? Items);

// ---------- Menu ----------
public record ProductDto(
    int Id, int CategoryId, string Name, string? Description, decimal Price, decimal? OldPrice,
    int? ImageAssetId, string? ImageUrl, bool IsAvailable, bool IsFeatured, int SortOrder);

public record CategoryDto(int Id, string Name, int SortOrder, List<ProductDto> Products);

public record SaveCategoryRequest([Required, MaxLength(100)] string Name, int SortOrder);

public record SaveProductRequest(
    int CategoryId, [Required, MaxLength(150)] string Name, string? Description, [Range(0, 10_000_000)] decimal Price,
    decimal? OldPrice, int? ImageAssetId, bool IsAvailable, bool IsFeatured, int SortOrder);

public record SetAvailabilityRequest(bool IsAvailable);

// ---------- Settings ----------
public record SettingsDto(
    string BusinessName, int? LogoAssetId, string? LogoUrl, string PrimaryColor, string AccentColor, string Currency,
    bool ShowTicker, string? TickerText, bool ShowClock, string TimeZoneId);

// ---------- Dashboard ----------
public record DashboardDto(int ScreensTotal, int ScreensOnline, int MediaCount, int PlaylistCount, int ProductCount, List<ScreenDto> Screens);

// ---------- Player (TV) ----------
public record PlayerRegisterRequest(string? DeviceKey, int Width, int Height, string? UserAgent);
public record PlayerRegisterResponse(string DeviceKey, bool Paired, string? PairingCode);

public record PlayerContentDto(
    bool Paired, string? PairingCode, string? Version, int CommandVersion,
    PlayerScreenDto? Screen, PlayerSettingsDto? Settings, PlayerPlaylistDto? Playlist);

public record PlayerScreenDto(int Id, string Name, ScreenOrientation Orientation);

public record PlayerSettingsDto(
    string BusinessName, string? LogoUrl, string PrimaryColor, string AccentColor, string Currency,
    bool ShowTicker, string? TickerText, bool ShowClock);

public record PlayerPlaylistDto(int Id, string Name, List<PlayerSlideDto> Slides);

public record PlayerSlideDto(
    int Id, SlideType Type, int Duration, string? Title, string? Text, string? MediaUrl, string? Url,
    string? BackgroundColor, string? TextColor, MediaFit Fit, PlayerMenuDto? Menu);

public record PlayerMenuDto(string Title, List<PlayerProductDto> Products);

public record PlayerProductDto(
    int Id, string Name, string? Description, decimal Price, decimal? OldPrice, string? ImageUrl, bool IsAvailable, bool IsFeatured);
