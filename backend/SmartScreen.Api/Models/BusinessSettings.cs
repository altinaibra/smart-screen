namespace SmartScreen.Api.Models;

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
