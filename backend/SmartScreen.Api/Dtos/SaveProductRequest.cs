using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record SaveProductRequest(
    int CategoryId, [Required, MaxLength(150)] string Name, string? Description, [Range(0, 10_000_000)] decimal Price,
    decimal? OldPrice, int? ImageAssetId, bool IsAvailable, bool IsFeatured, int SortOrder);
