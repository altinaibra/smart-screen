namespace SmartScreen.Api.Dtos;

public record PlaylistSummaryDto(int Id, string Name, string? Description, int ItemCount, int TotalDurationSeconds, int ScreenCount, DateTime UpdatedAt);
