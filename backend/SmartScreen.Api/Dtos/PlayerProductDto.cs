namespace SmartScreen.Api.Dtos;

public record PlayerProductDto(
    int Id, string Name, string? Description, decimal Price, decimal? OldPrice, string? ImageUrl, bool IsAvailable, bool IsFeatured);
