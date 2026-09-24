namespace SmartScreen.Api.Models;

/// <summary>
/// Një biznes (restorant, berber, dyqan...) me cilësimet e tij. Çdo biznes ka ekranet, playlistat,
/// median, menunë, valutat dhe mënyrat e pagesës të veta (kolona BusinessId).
/// </summary>
public class BusinessSettings
{
    public int Id { get; set; }
    /// <summary>Klienti të cilit i përket biznesi.</summary>
    public int ClientId { get; set; }
    public Client? Client { get; set; }
    public string BusinessName { get; set; } = "Smart Screen";

    /// <summary>Teksti i vogël anash emrit në krye të ekranit, p.sh. "BURGER &amp; GRILL".</summary>
    public string? Tagline { get; set; }

    /// <summary>Slogani në slide-in Brand, p.sh. "Mishi në zjarr, çdo ditë."</summary>
    public string? Slogan { get; set; }

    /// <summary>Orari i punës "HH:mm" (p.sh. 10:00 – 24:00). Bosh = nuk shfaqet.</summary>
    public string? OpeningTime { get; set; }
    public string? ClosingTime { get; set; }
    public string? Phone { get; set; }
    public string? SocialHandle { get; set; }

    /// <summary>Lloji i biznesit: "restaurant", "barber" ose "shop" – ndryshon tekstet (p.sh. POROSI / REZERVO) dhe emërtimet në panel.</summary>
    public string BusinessType { get; set; } = "restaurant";

    /// <summary>Gjuha e teksteve të TV-së (HAPUR, VETËM, ORARI...): "sq" ose "en".</summary>
    public string ScreenLanguage { get; set; } = "sq";
    public int? LogoAssetId { get; set; }
    public MediaAsset? LogoAsset { get; set; }
    public string PrimaryColor { get; set; } = "#c8102e";
    public string AccentColor { get; set; } = "#ffc72c";
    public string Currency { get; set; } = "";
    public bool ShowTicker { get; set; } = true;
    public string? TickerText { get; set; }
    public bool ShowClock { get; set; } = true;
    public string TimeZoneId { get; set; } = "Europe/Tirane";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
