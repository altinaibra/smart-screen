namespace SmartScreen.Api.Dtos;

public record PlayerContentDto(
    bool Paired, string? PairingCode, string? Version, int CommandVersion,
    PlayerScreenDto? Screen, PlayerSettingsDto? Settings, PlayerPlaylistDto? Playlist,
    PlayerOfflineDto? Offline = null);
