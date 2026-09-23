namespace SmartScreen.Api.Dtos;

public record CurrencyDto(
    int CurrencyId, string CurrencyCode, string CurrencyName, string CurrencySymbol, decimal ExchangeRate,
    bool Status, bool IsMainCurrency, DateTime EntryDate, int FiscalType, byte[]? RowVersion);
