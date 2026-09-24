using SmartScreen.Api.Models;

namespace SmartScreen.Api.Dtos;

public record ScreenDto(
    int Id, string Name, string? Location, ScreenPlatform Platform, int ResolutionWidth, int ResolutionHeight,
    ScreenOrientation Orientation, int? DefaultPlaylistId, string? DefaultPlaylistName, bool IsOnline,
    DateTime? LastSeenAt, DateTime CreatedAt, List<ScheduleDto> Schedules);
