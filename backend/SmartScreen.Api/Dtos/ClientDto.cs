using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record ClientDto(
    int Id, string Name, string? ContactPerson, string? Phone, string? Email, string? Notes, bool IsActive,
    DateTime CreatedAt, int BusinessCount, int UserCount, int ScreenCount, int ScreensOnline, string? AdminUsername);

/// <summary>AdminUsername / AdminPassword (opsionale): ndryshojnë llogarinë me të cilën hyn klienti.</summary>
public record SaveClientRequest(
    [Required, MaxLength(150)] string Name, string? ContactPerson, string? Phone, string? Email, string? Notes, bool IsActive = true,
    [MaxLength(100)] string? AdminUsername = null, string? AdminPassword = null);

/// <summary>Klienti i ri krijohet bashkë me biznesin e parë dhe administratorin e tij.</summary>
public record CreateClientRequest(
    [Required, MaxLength(150)] string Name, string? ContactPerson, string? Phone, string? Email, string? Notes,
    [Required, MaxLength(100)] string BusinessName, string BusinessType,
    [Required, MaxLength(100)] string AdminUsername, [Required] string AdminPassword);

public record ClientRefDto(int Id, string Name);
