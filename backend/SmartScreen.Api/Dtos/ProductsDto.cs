namespace SmartScreen.Api.Dtos;

public record ProductsDto(
    int Id, int CategoryId, string Name, string? Description, decimal Price, decimal? OldPrice,
    int? ImageAssetId, string? ImageUrl, bool IsAvailable, bool IsFeatured, int SortOrder);
