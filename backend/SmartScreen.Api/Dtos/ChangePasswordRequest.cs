using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record ChangePasswordRequest([Required] string CurrentPassword, [Required, MinLength(6)] string NewPassword);
