namespace SmartScreen.Api.Dtos;

public record ScheduleDto(int? Id, int PlaylistId, string? PlaylistName, int DaysOfWeek, string StartTime, string EndTime, int Priority);
