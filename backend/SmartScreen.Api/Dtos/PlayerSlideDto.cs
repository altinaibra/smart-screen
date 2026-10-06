using SmartScreen.Api.Models;

namespace SmartScreen.Api.Dtos;

public record PlayerSlideDto(
    int Id, SlideType Type, int Duration, string? Title, string? Text, string? MediaUrl, string? Url,
    string? BackgroundColor, string? TextColor, MediaFit Fit, PlayerMenuDto? Menu,
    string? Badge = null, decimal? Price = null,
    // "yyyy-MM-dd" (data lokale e biznesit); player-i e fsheh slide-in jashtë periudhës, edhe pa rrjet.
    string? StartDate = null, string? EndDate = null);
