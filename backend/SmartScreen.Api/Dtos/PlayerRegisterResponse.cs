namespace SmartScreen.Api.Dtos;

public record PlayerRegisterResponse(string DeviceKey, bool Paired, string? PairingCode);
