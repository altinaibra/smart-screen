namespace SmartScreen.Api.Models;

/// <summary>Playlist që luhet në orare të caktuara (p.sh. menuja e mëngjesit 07:00–11:00).</summary>
public class ScreenSchedule
{
    public int Id { get; set; }
    public int ScreenId { get; set; }
    public Screen? Screen { get; set; }
    public int PlaylistId { get; set; }
    public Playlist? Playlist { get; set; }

    /// <summary>Bitmask: bit 0 = e diel ... bit 6 = e shtunë.</summary>
    public int DaysOfWeek { get; set; } = 0b1111111;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int Priority { get; set; }
}
