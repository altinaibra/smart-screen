using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Services;

/// <summary>
/// Endpoint-et me këtë atribut punojnë brenda biznesit të zgjedhur (header X-Business-Id).
/// FullAccess = kërkon qasje të plotë në biznes (jo vetëm disa ekrane).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class BusinessScopedAttribute(bool fullAccess = false) : Attribute
{
    public bool FullAccess { get; } = fullAccess;
}

/// <summary>Endpoint-et vetëm për super adminin (bizneset, përdoruesit).</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class AdminOnlyAttribute : Attribute;

/// <summary>Biznesi aktual i kërkesës dhe çfarë lejohet të shohë përdoruesi në të.</summary>
public class BusinessAccess
{
    public const string Header = "X-Business-Id";

    public int UserId { get; private set; }
    public bool IsAdmin { get; private set; }
    public int BusinessId { get; private set; }
    /// <summary>Qasje e plotë në biznes (admin ose UserBusiness).</summary>
    public bool FullAccess { get; private set; }
    /// <summary>Ekranet e lejuara kur FullAccess = false.</summary>
    public HashSet<int> ScreenIds { get; private set; } = [];

    public bool CanSeeScreen(Screen s) => s.BusinessId == BusinessId && (FullAccess || ScreenIds.Contains(s.Id));

    /// <summary>Ekranet (të çiftuara) e biznesit që përdoruesi mund të shohë.</summary>
    public IQueryable<Screen> Screens(IQueryable<Screen> q)
    {
        q = q.Where(s => s.IsPaired && s.BusinessId == BusinessId);
        if (!FullAccess)
        {
            var ids = ScreenIds.ToList();
            q = q.Where(s => ids.Contains(s.Id));
        }
        return q;
    }

    /// <summary>
    /// Përdoruesi i token-it, i lexuar nga databaza (jo nga token-i), që ndryshimi i rolit ose
    /// fshirja e përdoruesit të vlejë menjëherë. Null nëse përdoruesi nuk ekziston më.
    /// </summary>
    public static async Task<AppUser?> LoadUserAsync(AppDbContext db, ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id)
            : null;

    /// <summary>Bizneset që sheh përdoruesi: id -> qasje e plotë apo vetëm disa ekrane.</summary>
    public static async Task<Dictionary<int, bool>> AccessibleAsync(AppDbContext db, int userId, bool isAdmin)
    {
        if (isAdmin)
            return await db.BusinessSettings.Select(b => b.Id).ToDictionaryAsync(id => id, _ => true);

        var full = await db.UserBusinesses.Where(x => x.UserId == userId).Select(x => x.BusinessId).ToListAsync();
        var partial = await db.UserScreens.Where(x => x.UserId == userId && x.Screen!.BusinessId != null)
            .Select(x => x.Screen!.BusinessId!.Value).Distinct().ToListAsync();

        var result = partial.ToDictionary(id => id, _ => false);
        foreach (var id in full) result[id] = true;
        return result;
    }

    internal async Task<string?> ResolveAsync(AppDbContext db, AppUser user, string? header)
    {
        (UserId, IsAdmin) = (user.Id, user.IsAdmin);
        var accessible = await AccessibleAsync(db, UserId, IsAdmin);
        if (accessible.Count == 0)
            return IsAdmin ? "Nuk ka asnjë biznes. Krijoni fillimisht një biznes." : "Nuk keni qasje në asnjë biznes.";

        // Pa header (p.sh. Swagger) përdoret biznesi i parë.
        var id = int.TryParse(header, out var h) ? h : accessible.Keys.Min();
        if (!accessible.TryGetValue(id, out var full))
            return "Nuk keni qasje në këtë biznes.";

        BusinessId = id;
        FullAccess = full;
        if (!full)
        {
            ScreenIds = (await db.UserScreens.Where(x => x.UserId == UserId && x.Screen!.BusinessId == id)
                .Select(x => x.ScreenId).ToListAsync()).ToHashSet();
        }
        return null;
    }
}

/// <summary>Plotëson <see cref="BusinessAccess"/> për endpoint-et [BusinessScoped] dhe kontrollon [AdminOnly].</summary>
public class BusinessAccessFilter(AppDbContext db, BusinessAccess access) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var metadata = context.ActionDescriptor.EndpointMetadata;
        var adminOnly = metadata.OfType<AdminOnlyAttribute>().Any();
        // Atributi i metodës vjen pas atij të klasës, prandaj i fundit ka përparësi.
        var scoped = metadata.OfType<BusinessScopedAttribute>().LastOrDefault();
        if (!adminOnly && scoped is null)
        {
            await next();
            return;
        }

        var user = await BusinessAccess.LoadUserAsync(db, context.HttpContext.User);
        if (user is null)
        {
            context.Result = new UnauthorizedResult();
            return;
        }
        if (adminOnly && !user.IsAdmin)
        {
            context.Result = Forbidden("Vetëm administratori mund ta bëjë këtë veprim.");
            return;
        }

        if (scoped is not null)
        {
            var error = await access.ResolveAsync(db, user, context.HttpContext.Request.Headers[BusinessAccess.Header]);
            if (error is null && scoped.FullAccess && !access.FullAccess)
                error = "Nuk keni leje për këtë pjesë të biznesit.";
            if (error is not null)
            {
                context.Result = Forbidden(error);
                return;
            }
        }

        await next();
    }

    private static ObjectResult Forbidden(string message) =>
        new(new { message }) { StatusCode = StatusCodes.Status403Forbidden };
}
