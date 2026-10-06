using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record SettingsDto(
    string BusinessName, int? LogoAssetId, string? LogoUrl, string PrimaryColor, string AccentColor, string? Currency,
    bool ShowTicker, string? TickerText, bool ShowClock, string TimeZoneId,
    string? Tagline = null, string? Slogan = null, string? OpeningTime = null, string? ClosingTime = null,
    string? Phone = null, string? SocialHandle = null, string ScreenLanguage = "sq", string BusinessType = "restaurant",
    bool SleepWhenClosed = false, AlertDto? Alert = null);

/// <summary>Njoftimi urgjent aktiv i biznesit (null = pa njoftim). ExpiresAt në UTC; null = pa afat.</summary>
public record AlertDto(string? Title, string? Text, string Color, DateTime? ExpiresAt);

/// <summary>DurationMinutes: pas sa minutash hiqet vetë; null ose 0 = derisa ta heqë admini.</summary>
public record SaveAlertRequest([MaxLength(200)] string? Title, [MaxLength(1000)] string? Text, string? Color, int? DurationMinutes);
