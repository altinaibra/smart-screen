namespace SmartScreen.Api.Dtos;

public record PlayerContentDto(
    bool Paired, string? PairingCode, string? Version, int CommandVersion,
    PlayerScreenDto? Screen, PlayerSettingsDto? Settings, PlayerPlaylistDto? Playlist,
    PlayerOfflineDto? Offline = null, PlayerClockDto? Clock = null);

/// <summary>
/// Ora e serverit dhe zona kohore e biznesit. Player-i i përdor për orën, HAPUR/MBYLLUR, oraret dhe datat e slide-ve,
/// që TV-të me orë/zonë kohore të gabuar të sillen njësoj si serveri. Nuk hyn te "version" (ndryshon çdo herë).
/// ServerTime: milisekonda UTC (Unix). UtcOffsetMinutes: zhvendosja aktuale e zonës kohore të biznesit.
/// </summary>
public record PlayerClockDto(long ServerTime, int UtcOffsetMinutes);
