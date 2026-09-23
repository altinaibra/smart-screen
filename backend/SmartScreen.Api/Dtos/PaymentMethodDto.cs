namespace SmartScreen.Api.Dtos;

public record PaymentMethodDto(
    int PaymentMethodId, string PaymentMethodCode, string PaymentMethodName, bool Status, bool IsDefault,
    int SortOrder, DateTime EntryDate, int FiscalType, byte[]? RowVersion);
