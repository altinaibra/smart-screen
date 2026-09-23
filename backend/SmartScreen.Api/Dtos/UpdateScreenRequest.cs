using System.ComponentModel.DataAnnotations;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Dtos;

public record UpdateScreenRequest(
    [Required, MaxLength(100)] string Name, string? Location, int? DefaultPlaylistId,
    ScreenOrientation Orientation, List<ScheduleDto>? Schedules);
