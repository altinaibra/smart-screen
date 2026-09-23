using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record RenameMediaRequest([Required, MaxLength(200)] string Name);
