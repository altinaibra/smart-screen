namespace SmartScreen.Api.Models;

/// <summary>Një "slide" në playlist: foto, video, menu me çmime, tekst ose faqe web.</summary>
public class PlaylistItem
{
    public int Id { get; set; }
    public int PlaylistId { get; set; }
    public Playlist? Playlist { get; set; }
    public int SortOrder { get; set; }
    public SlideType Type { get; set; }

    /// <summary>Sekonda. Për video, 0 = luaj deri në fund.</summary>
    public int DurationSeconds { get; set; } = 10;
    public bool IsEnabled { get; set; } = true;

    public string? Title { get; set; }
    public string? Text { get; set; }
    public string? Url { get; set; }
    public string? BackgroundColor { get; set; }
    public string? TextColor { get; set; }
    public MediaFit Fit { get; set; } = MediaFit.Cover;

    /// <summary>Promo/Combo: etiketa e vogël sipër titullit, p.sh. "E RE", "OFERTË E JAVËS".</summary>
    public string? Badge { get; set; }

    /// <summary>Promo/Combo: çmimi i shfaqur në rrethin e verdhë ("VETËM €5.90"). Null = pa çmim.</summary>
    public decimal? Price { get; set; }

    public int? MediaAssetId { get; set; }
    public MediaAsset? MediaAsset { get; set; }

    /// <summary>Për slide Menu: kategoria. Null = produktet "të veçuara" nga të gjitha kategoritë.</summary>
    public int? MenuCategoryId { get; set; }
    public MenuCategory? MenuCategory { get; set; }
}
