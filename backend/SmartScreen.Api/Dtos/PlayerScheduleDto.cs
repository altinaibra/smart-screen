namespace SmartScreen.Api.Dtos;

/// <summary>DaysOfWeek: bit 0 = e diel. StartTime/EndTime: "HH:mm".</summary>
public record PlayerScheduleDto(int PlaylistId, int DaysOfWeek, string StartTime, string EndTime, int Priority);
