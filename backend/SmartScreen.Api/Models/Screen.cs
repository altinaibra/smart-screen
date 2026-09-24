namespace SmartScreen.Api.Models;

/// <summary>Një TV / monitor fizik që shfaq përmbajtje.</summary>
public class Screen
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Location { get; set; }
    /// <summary>Biznesi i ekranit; null derisa TV-ja të çiftohet.</summary>
    public int? BusinessId { get; set; }
    public BusinessSettings? Business { get; set; }

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
