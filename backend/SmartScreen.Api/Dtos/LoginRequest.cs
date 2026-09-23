using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record LoginRequest([Required] string Username, [Required] string Password);
