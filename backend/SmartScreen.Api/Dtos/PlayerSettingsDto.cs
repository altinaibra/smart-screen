namespace SmartScreen.Api.Dtos;

/// <summary>CurrencyName: emri i valutës kryesore ("Euro") për "ÇMIMET NË EURO".</summary>
public record PlayerSettingsDto(
    string BusinessName, string? LogoUrl, string PrimaryColor, string AccentColor, string Currency,
    bool ShowTicker, string? TickerText, bool ShowClock,
    string? Tagline, string? Slogan, string? OpeningTime, string? ClosingTime, string? Phone, string? SocialHandle,
    string ScreenLanguage, string? CurrencyName, string BusinessType,
    bool SleepWhenClosed = false, PlayerAlertDto? Alert = null);

/// <summary>ExpiresAt: milisekonda UTC (Unix); null = pa afat.</summary>
public record PlayerAlertDto(string? Title, string? Text, string Color, long? ExpiresAt);
