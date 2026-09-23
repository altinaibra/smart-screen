using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

/// <summary>RowVersion: dërgoni vlerën e marrë nga GET që ndryshimi të refuzohet (409) nëse rreshti është ndryshuar ndërkohë.</summary>
public record SavePaymentMethodRequest(
    [Required, MaxLength(20)] string PaymentMethodCode, [Required, MaxLength(100)] string PaymentMethodName,
    bool Status, bool IsDefault, int SortOrder, int FiscalType = -1, byte[]? RowVersion = null);
