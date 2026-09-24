using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;

namespace SmartScreen.Api.Services;

public static class BusinessCleanup
{
    /// <summary>
    /// Fshin biznesin me gjithë ekranet, playlistat, median, menunë, valutat dhe mënyrat e pagesës.
    /// Lidhjet me biznesin janë NoAction (SQL Server), prandaj të dhënat fshihen këtu me radhë.
    /// Oraret, slide-t, produktet, copat e medias dhe qasjet e përdoruesve fshihen vetë (ON DELETE CASCADE).
    /// Thirret brenda një transaksioni.
    /// </summary>
    public static async Task DeleteAsync(AppDbContext db, int businessId)
    {
        await db.Screens.Where(s => s.BusinessId == businessId).ExecuteDeleteAsync();
        await db.Playlists.Where(p => p.BusinessId == businessId).ExecuteDeleteAsync();
        await db.MenuCategories.Where(c => c.BusinessId == businessId).ExecuteDeleteAsync();
        await db.BusinessSettings.Where(b => b.Id == businessId)
            .ExecuteUpdateAsync(u => u.SetProperty(b => b.LogoAssetId, (int?)null));
        await db.MediaAssets.Where(m => m.BusinessId == businessId).ExecuteDeleteAsync();
        await db.Currencies.Where(c => c.BusinessId == businessId).ExecuteDeleteAsync();
        await db.PaymentMethods.Where(p => p.BusinessId == businessId).ExecuteDeleteAsync();
        await db.BusinessSettings.Where(b => b.Id == businessId).ExecuteDeleteAsync();
    }
}
