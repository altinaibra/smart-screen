using SmartScreen.Api.Models;

namespace SmartScreen.Api.Dtos;

public record PlaylistItemDto(
    int? Id, SlideType Type, int DurationSeconds, bool IsEnabled, string? Title, string? Text, string? Url,
    string? BackgroundColor, string? TextColor, MediaFit Fit, int? MediaAssetId, MediaDto? MediaAsset, int? MenuCategoryId,
    string? Badge = null, decimal? Price = null);
