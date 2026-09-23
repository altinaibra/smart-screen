namespace SmartScreen.Api.Models;

public enum ScreenPlatform { Unknown, LgWebOs, SamsungTizen, AndroidTv, SonyBravia, Browser }

public enum ScreenOrientation { Landscape, Portrait }

public enum MediaType { Image, Video }

public enum SlideType { Image, Video, Menu, Text, WebPage }

public enum MediaFit { Cover, Contain }

public class AppUser
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Admin";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Një TV / monitor fizik që shfaq përmbajtje.</summary>
public class Screen
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Location { get; set; }

    /// <summary>Çelës unik që player-i ruan lokalisht dhe e përdor për t'u identifikuar.</summary>
    public string DeviceKey { get; set; } = "";

    /// <summary>Kod 6-shifror që shfaqet në TV derisa ekrani të çiftohet nga admini.</summary>
    public string? PairingCode { get; set; }
    public bool IsPaired { get; set; }

    public ScreenPlatform Platform { get; set; }
    public string? UserAgent { get; set; }
    public int ResolutionWidth { get; set; }
    public int ResolutionHeight { get; set; }
    public ScreenOrientation Orientation { get; set; } = ScreenOrientation.Landscape;

    public int? DefaultPlaylistId { get; set; }
    public Playlist? DefaultPlaylist { get; set; }
    public List<ScreenSchedule> Schedules { get; set; } = [];

    /// <summary>Rritet kur admini kërkon rifreskim; player-i rifreskohet kur e sheh të ndryshuar.</summary>
    public int CommandVersion { get; set; }

    public DateTime? LastSeenAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Playlist që luhet në orare të caktuara (p.sh. menuja e mëngjesit 07:00–11:00).</summary>
public class ScreenSchedule
{
    public int Id { get; set; }
    public int ScreenId { get; set; }
    public Screen? Screen { get; set; }
    public int PlaylistId { get; set; }
    public Playlist? Playlist { get; set; }

    /// <summary>Bitmask: bit 0 = e diel ... bit 6 = e shtunë.</summary>
    public int DaysOfWeek { get; set; } = 0b1111111;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int Priority { get; set; }
}

public class MediaAsset
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public MediaType Type { get; set; }
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string Url => $"/uploads/{FileName}";
}

public class Playlist
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public List<PlaylistItem> Items { get; set; } = [];
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Një "slide" në playlist: foto, video, menu me çmime, tekst ose faqe web.</summary>
public class PlaylistItem
{
    public int Id { get; set; }
    public int PlaylistId { get; set; }
    public Playlist? Playlist { get; set; }
    public int SortOrder { get; set; }
    public SlideType Type { get; set; }

    /// <summary>Sekonda. Për video, 0 = luaj deri në fund.</summary>
    public int DurationSeconds { get; set; } = 10;
    public bool IsEnabled { get; set; } = true;

    public string? Title { get; set; }
    public string? Text { get; set; }
    public string? Url { get; set; }
    public string? BackgroundColor { get; set; }
    public string? TextColor { get; set; }
    public MediaFit Fit { get; set; } = MediaFit.Cover;

    public int? MediaAssetId { get; set; }
    public MediaAsset? MediaAsset { get; set; }

    /// <summary>Për slide Menu: kategoria. Null = produktet "të veçuara" nga të gjitha kategoritë.</summary>
    public int? MenuCategoryId { get; set; }
    public MenuCategory? MenuCategory { get; set; }
}

public class MenuCategory
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int SortOrder { get; set; }
    public List<Product> Products { get; set; } = [];
}

public class Product
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public MenuCategory? Category { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public decimal Price { get; set; }

    /// <summary>Çmimi para ofertës (shfaqet i vizatuar).</summary>
    public decimal? OldPrice { get; set; }
    public int? ImageAssetId { get; set; }
    public MediaAsset? ImageAsset { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>Të dhënat e biznesit (rresht i vetëm, Id = 1).</summary>
public class BusinessSettings
{
    public int Id { get; set; }
    public string BusinessName { get; set; } = "Smart Screen";
    public int? LogoAssetId { get; set; }
    public MediaAsset? LogoAsset { get; set; }
    public string PrimaryColor { get; set; } = "#c8102e";
    public string AccentColor { get; set; } = "#ffc72c";
    public string Currency { get; set; } = "L";
    public bool ShowTicker { get; set; } = true;
    public string? TickerText { get; set; }
    public bool ShowClock { get; set; } = true;
    public string TimeZoneId { get; set; } = "Europe/Tirane";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
