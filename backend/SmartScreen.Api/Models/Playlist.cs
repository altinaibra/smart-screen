namespace SmartScreen.Api.Models;

public class Playlist
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public List<PlaylistItem> Items { get; set; } = [];
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
