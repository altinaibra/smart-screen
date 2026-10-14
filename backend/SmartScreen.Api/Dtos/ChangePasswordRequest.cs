using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record ChangePasswordRequest([Required] string CurrentPassword, [Required, MinLength(6)] string NewPassword);

public record ChangeUsernameRequest([Required] string CurrentPassword, [Required, MaxLength(100)] string NewUsername);
