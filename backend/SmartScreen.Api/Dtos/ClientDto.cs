using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record ClientDto(
    int Id, string Name, string? ContactPerson, string? Phone, string? Email, string? Notes, bool IsActive,
    DateTime CreatedAt, int BusinessCount, int UserCount, int ScreenCount, int ScreensOnline);

public record SaveClientRequest(
    [Required, MaxLength(150)] string Name, string? ContactPerson, string? Phone, string? Email, string? Notes, bool IsActive = true);

/// <summary>Klienti i ri krijohet bashkë me biznesin e parë dhe administratorin e tij.</summary>
public record CreateClientRequest(
    [Required, MaxLength(150)] string Name, string? ContactPerson, string? Phone, string? Email, string? Notes,
    [Required, MaxLength(100)] string BusinessName, string BusinessType,
    [Required, MaxLength(100)] string AdminUsername, [Required] string AdminPassword);

public record ClientRefDto(int Id, string Name);
