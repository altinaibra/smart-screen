namespace SmartScreen.Api.Models;

/// <summary>Valuta (EUR, LEK, USD...) me kursin e këmbimit kundrejt valutës kryesore.</summary>
public class Currency
{
    public int CurrencyId { get; set; }
    public int BusinessId { get; set; }
    public string CurrencyCode { get; set; } = "";
    public string CurrencyName { get; set; } = "";
    public string CurrencySymbol { get; set; } = "";

    /// <summary>Sa njësi të kësaj valute = 1 njësi e valutës kryesore (valuta kryesore = 1.000).</summary>
    public decimal ExchangeRate { get; set; } = 1;
    public bool Status { get; set; } = true;
    public bool IsMainCurrency { get; set; }
    public DateTime EntryDate { get; set; } = DateTime.UtcNow;

    /// <summary>Kodi i valutës për fiskalizimin; -1 = nuk përdoret në fiskalizim.</summary>
    public int FiscalType { get; set; } = -1;

    /// <summary>Versioni i rreshtit (rowversion në SQL Server) për kontrollin e ndryshimeve të njëkohshme.</summary>
    public byte[]? RowVersion { get; set; }
}
