namespace SmartScreen.Api.Dtos;

public record PlayerRegisterRequest(string? DeviceKey, int Width, int Height, string? UserAgent);
