using SmartScreen.Api.Models;

namespace SmartScreen.Api.Dtos;

public record MediaDto(int Id, string Name, MediaType Type, string Url, string ContentType, long SizeBytes, DateTime CreatedAt);
