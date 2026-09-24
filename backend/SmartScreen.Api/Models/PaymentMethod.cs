namespace SmartScreen.Api.Models;

/// <summary>Mënyra e pagesës (para në dorë, kartë, transfertë bankare...).</summary>
public class PaymentMethod
{
    public int PaymentMethodId { get; set; }
    public int BusinessId { get; set; }
    public string PaymentMethodCode { get; set; } = "";
    public string PaymentMethodName { get; set; } = "";
    public bool Status { get; set; } = true;
    public bool IsDefault { get; set; }
    public int SortOrder { get; set; }
    public DateTime EntryDate { get; set; } = DateTime.UtcNow;

    /// <summary>Lloji i pagesës për fiskalizimin; -1 = nuk përdoret në fiskalizim.</summary>
    public int FiscalType { get; set; } = -1;

    /// <summary>Versioni i rreshtit (rowversion në SQL Server) për kontrollin e ndryshimeve të njëkohshme.</summary>
    public byte[]? RowVersion { get; set; }
}
