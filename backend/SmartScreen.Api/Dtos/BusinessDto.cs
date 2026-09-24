using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

/// <summary>Një biznes në listë. FullAccess = false kur përdoruesi kontrollon vetëm disa ekrane të tij.</summary>
public record BusinessDto(int Id, string Name, string BusinessType, string? LogoUrl, bool FullAccess, int ScreenCount);

public record CreateBusinessRequest([Required, MaxLength(100)] string Name, string BusinessType = "restaurant");

/// <summary>Client = klienti aktiv (për pronarin null derisa të hyjë në një klient).</summary>
public record MeDto(int Id, string Username, string Role, bool IsAdmin, bool IsOwner, ClientRefDto? Client, List<BusinessDto> Businesses);
