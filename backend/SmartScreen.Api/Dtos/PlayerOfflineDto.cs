namespace SmartScreen.Api.Dtos;

/// <summary>
/// Gjithçka që i duhet TV-së për të vazhduar pa rrjet: oraret dhe të gjitha playlist-at e ekranit,
/// që player-i të ndërrojë vetë playlist-ën sipas orës kur serveri nuk arrihet.
/// </summary>
public record PlayerOfflineDto(int? DefaultPlaylistId, List<PlayerScheduleDto> Schedules, List<PlayerPlaylistDto> Playlists);
