namespace SmartScreen.Api.Dtos;

public record SettingsDto(
    string BusinessName, int? LogoAssetId, string? LogoUrl, string PrimaryColor, string AccentColor, string? Currency,
    bool ShowTicker, string? TickerText, bool ShowClock, string TimeZoneId,
    string? Tagline = null, string? Slogan = null, string? OpeningTime = null, string? ClosingTime = null,
    string? Phone = null, string? SocialHandle = null, string ScreenLanguage = "sq", string BusinessType = "restaurant");
