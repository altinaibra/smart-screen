using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

/// <summary>Valutat dhe kurset e këmbimit.</summary>
[ApiController]
[Route("api/currencies")]
[Authorize]
public class CurrenciesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<CurrencyDto>> GetAll([FromQuery] bool? status)
    {
        var q = db.Currencies.AsNoTracking();
        if (status is not null) q = q.Where(c => c.Status == status);
        var items = await q.OrderBy(c => c.CurrencyId).ToListAsync();
        return items.Select(c => c.ToDto()).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CurrencyDto>> Get(int id)
    {
        var currency = await db.Currencies.AsNoTracking().FirstOrDefaultAsync(c => c.CurrencyId == id);
        return currency is null ? NotFound() : currency.ToDto();
    }

    [HttpPost]
    public async Task<ActionResult<CurrencyDto>> Create(SaveCurrencyRequest req)
    {
        var error = await ValidateAsync(req, null);
        if (error is not null) return BadRequest(new { message = error });

        var currency = new Currency();
        Apply(currency, req);
        db.Currencies.Add(currency);
        await ClearOtherMainAsync(currency);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = currency.CurrencyId }, currency.ToDto());
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CurrencyDto>> Update(int id, SaveCurrencyRequest req)
    {
        var currency = await db.Currencies.FindAsync(id);
        if (currency is null) return NotFound();

        var error = await ValidateAsync(req, id);
        if (error is not null) return BadRequest(new { message = error });

        if (req.RowVersion is not null)
            db.Entry(currency).Property(c => c.RowVersion).OriginalValue = req.RowVersion;
        Apply(currency, req);
        await ClearOtherMainAsync(currency);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Valuta është ndryshuar nga dikush tjetër. Rifreskoni dhe provoni sërish." });
        }
        return currency.ToDto();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var currency = await db.Currencies.FindAsync(id);
        if (currency is null) return NotFound();
        if (currency.IsMainCurrency)
            return BadRequest(new { message = "Valuta kryesore nuk mund të fshihet. Caktoni fillimisht një valutë tjetër si kryesore." });

        db.Currencies.Remove(currency);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> ValidateAsync(SaveCurrencyRequest req, int? id)
    {
        var code = req.CurrencyCode.Trim().ToUpperInvariant();
        if (await db.Currencies.AnyAsync(c => c.CurrencyCode == code && c.CurrencyId != id))
            return $"Valuta me kodin '{code}' ekziston tashmë.";
        if (!req.IsMainCurrency && id is not null &&
            await db.Currencies.AnyAsync(c => c.CurrencyId == id && c.IsMainCurrency))
            return "Duhet të ketë gjithmonë një valutë kryesore. Caktoni një valutë tjetër si kryesore.";
        return null;
    }

    private static void Apply(Currency c, SaveCurrencyRequest req)
    {
        c.CurrencyCode = req.CurrencyCode.Trim().ToUpperInvariant();
        c.CurrencyName = req.CurrencyName.Trim();
        c.CurrencySymbol = req.CurrencySymbol.Trim();
        c.ExchangeRate = req.ExchangeRate;
        c.Status = req.Status;
        c.IsMainCurrency = req.IsMainCurrency;
        c.FiscalType = req.FiscalType;
    }

    /// <summary>Vetëm një valutë mund të jetë kryesore.</summary>
    private async Task ClearOtherMainAsync(Currency currency)
    {
        if (!currency.IsMainCurrency) return;
        var others = await db.Currencies.Where(c => c.IsMainCurrency && c.CurrencyId != currency.CurrencyId).ToListAsync();
        foreach (var other in others) other.IsMainCurrency = false;
    }
}
