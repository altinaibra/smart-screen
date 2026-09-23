using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

/// <summary>RowVersion: dërgoni vlerën e marrë nga GET që ndryshimi të refuzohet (409) nëse rreshti është ndryshuar ndërkohë.</summary>
public record SaveCurrencyRequest(
    [Required, MaxLength(10)] string CurrencyCode, [Required, MaxLength(100)] string CurrencyName,
    [Required, MaxLength(10)] string CurrencySymbol, [Range(0.000001, 1_000_000)] decimal ExchangeRate,
    bool Status, bool IsMainCurrency, int FiscalType = -1, byte[]? RowVersion = null);
