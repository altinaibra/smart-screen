namespace SmartScreen.Api.Dtos;

public record PlaylistDto(int Id, string Name, string? Description, DateTime UpdatedAt, List<PlaylistItemDto> Items);
