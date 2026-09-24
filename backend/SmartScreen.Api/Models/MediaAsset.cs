namespace SmartScreen.Api.Models;

public class MediaAsset
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public string Name { get; set; } = "";
    public MediaType Type { get; set; }
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string Url => $"/uploads/{FileName}";
}
