using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

/// <summary>
/// Përdoruesi dhe qasjet e tij: BusinessIds = biznese me qasje të plotë,
/// ScreenIds = ekrane të veçanta (në biznese ku nuk ka qasje të plotë).
/// </summary>
public record UserDto(int Id, string Username, string Role, DateTime CreatedAt, List<int> BusinessIds, List<int> ScreenIds);

/// <summary>Password bosh gjatë ndryshimit = fjalëkalimi mbetet i njëjtë.</summary>
public record SaveUserRequest(
    [Required, MaxLength(100)] string Username, string? Password, string Role,
    List<int>? BusinessIds, List<int>? ScreenIds);

public record AccessOptionScreenDto(int Id, string Name, string? Location);

public record AccessOptionDto(int Id, string Name, List<AccessOptionScreenDto> Screens);
