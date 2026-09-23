namespace SmartScreen.Api.Models;

public class Product
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public MenuCategory? Category { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public decimal Price { get; set; }

    /// <summary>Çmimi para ofertës (shfaqet i vizatuar).</summary>
    public decimal? OldPrice { get; set; }
    public int? ImageAssetId { get; set; }
    public MediaAsset? ImageAsset { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
}
