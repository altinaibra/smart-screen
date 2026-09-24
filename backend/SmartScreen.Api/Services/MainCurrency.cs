using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;

namespace SmartScreen.Api.Services;

public static class MainCurrency
{
    /// <summary>
    /// Simboli i valutës kryesore (IsMainCurrency = true) që shfaqet te çmimet në panel dhe në TV.
    /// Valuta kryesore aktive ka përparësi; pastaj valuta kryesore edhe nëse është joaktive.
    /// Vetëm nëse asnjë rresht nuk ka IsMainCurrency = true përdoret monedha e vjetër e cilësimeve.
    /// </summary>
    public static async Task<string> GetSymbolAsync(AppDbContext db, string fallback) =>
        await db.Currencies.AsNoTracking()
            .Where(c => c.IsMainCurrency)
            .OrderByDescending(c => c.Status)
            .ThenBy(c => c.CurrencyId)
            .Select(c => c.CurrencySymbol)
            .FirstOrDefaultAsync() ?? fallback;
}
