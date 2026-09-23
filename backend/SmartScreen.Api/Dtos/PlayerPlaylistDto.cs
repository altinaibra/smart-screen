namespace SmartScreen.Api.Dtos;

public record PlayerPlaylistDto(int Id, string Name, List<PlayerSlideDto> Slides);
