using SmartScreen.Api.Models;

namespace SmartScreen.Api.Dtos;

public record PlayerSlideDto(
    int Id, SlideType Type, int Duration, string? Title, string? Text, string? MediaUrl, string? Url,
    string? BackgroundColor, string? TextColor, MediaFit Fit, PlayerMenuDto? Menu);
