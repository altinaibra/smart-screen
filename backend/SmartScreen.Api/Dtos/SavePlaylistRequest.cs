using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record SavePlaylistRequest([Required, MaxLength(100)] string Name, string? Description, List<PlaylistItemDto>? Items);
