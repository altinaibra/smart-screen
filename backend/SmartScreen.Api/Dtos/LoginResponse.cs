namespace SmartScreen.Api.Dtos;

public record LoginResponse(string Token, string Username, DateTime ExpiresAt, string Role);
