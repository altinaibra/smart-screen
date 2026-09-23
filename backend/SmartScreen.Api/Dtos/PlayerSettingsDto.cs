namespace SmartScreen.Api.Dtos;

public record PlayerSettingsDto(
    string BusinessName, string? LogoUrl, string PrimaryColor, string AccentColor, string Currency,
    bool ShowTicker, string? TickerText, bool ShowClock);
