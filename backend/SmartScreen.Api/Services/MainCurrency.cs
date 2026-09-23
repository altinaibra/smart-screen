using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;

namespace SmartScreen.Api.Services;

public static class MainCurrency
{
    /// <summary>
    /// Simboli i valutës kryesore (IsMainCurrency = true) që shfaqet te çmimet në panel dhe në TV.
    /// Nëse nuk ka valutë kryesore aktive, përdoret monedha e ruajtur te cilësimet.
    /// </summary>
    public static async Task<string> GetSymbolAsync(AppDbContext db, string fallback) =>
        await db.Currencies.AsNoTracking()
            .Where(c => c.IsMainCurrency && c.Status)
            .Select(c => c.CurrencySymbol)
            .FirstOrDefaultAsync() ?? fallback;
}
