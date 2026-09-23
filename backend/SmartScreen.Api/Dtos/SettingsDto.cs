namespace SmartScreen.Api.Dtos;

public record SettingsDto(
    string BusinessName, int? LogoAssetId, string? LogoUrl, string PrimaryColor, string AccentColor, string Currency,
    bool ShowTicker, string? TickerText, bool ShowClock, string TimeZoneId);
