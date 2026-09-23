using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

/// <summary>Mënyrat e pagesës (para në dorë, kartë, transfertë...).</summary>
[ApiController]
[Route("api/payment-methods")]
[Authorize]
public class PaymentMethodsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<PaymentMethodDto>> GetAll([FromQuery] bool? status)
    {
        var q = db.PaymentMethods.AsNoTracking();
        if (status is not null) q = q.Where(p => p.Status == status);
        var items = await q.OrderBy(p => p.SortOrder).ThenBy(p => p.PaymentMethodId).ToListAsync();
        return items.Select(p => p.ToDto()).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PaymentMethodDto>> Get(int id)
    {
        var method = await db.PaymentMethods.AsNoTracking().FirstOrDefaultAsync(p => p.PaymentMethodId == id);
        return method is null ? NotFound() : method.ToDto();
    }

    [HttpPost]
    public async Task<ActionResult<PaymentMethodDto>> Create(SavePaymentMethodRequest req)
    {
        var error = await ValidateAsync(req, null);
        if (error is not null) return BadRequest(new { message = error });

        var method = new PaymentMethod();
        Apply(method, req);
        db.PaymentMethods.Add(method);
        await ClearOtherDefaultAsync(method);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = method.PaymentMethodId }, method.ToDto());
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PaymentMethodDto>> Update(int id, SavePaymentMethodRequest req)
    {
        var method = await db.PaymentMethods.FindAsync(id);
        if (method is null) return NotFound();

        var error = await ValidateAsync(req, id);
        if (error is not null) return BadRequest(new { message = error });

        if (req.RowVersion is not null)
            db.Entry(method).Property(p => p.RowVersion).OriginalValue = req.RowVersion;
        Apply(method, req);
        await ClearOtherDefaultAsync(method);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Mënyra e pagesës është ndryshuar nga dikush tjetër. Rifreskoni dhe provoni sërish." });
        }
        return method.ToDto();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var method = await db.PaymentMethods.FindAsync(id);
        if (method is null) return NotFound();
        db.PaymentMethods.Remove(method);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> ValidateAsync(SavePaymentMethodRequest req, int? id)
    {
        var code = req.PaymentMethodCode.Trim().ToUpperInvariant();
        return await db.PaymentMethods.AnyAsync(p => p.PaymentMethodCode == code && p.PaymentMethodId != id)
            ? $"Mënyra e pagesës me kodin '{code}' ekziston tashmë."
            : null;
    }

    private static void Apply(PaymentMethod p, SavePaymentMethodRequest req)
    {
        p.PaymentMethodCode = req.PaymentMethodCode.Trim().ToUpperInvariant();
        p.PaymentMethodName = req.PaymentMethodName.Trim();
        p.Status = req.Status;
        p.IsDefault = req.IsDefault;
        p.SortOrder = req.SortOrder;
        p.FiscalType = req.FiscalType;
    }

    /// <summary>Vetëm një mënyrë pagese mund të jetë e parazgjedhur.</summary>
    private async Task ClearOtherDefaultAsync(PaymentMethod method)
    {
        if (!method.IsDefault) return;
        var others = await db.PaymentMethods.Where(p => p.IsDefault && p.PaymentMethodId != method.PaymentMethodId).ToListAsync();
        foreach (var other in others) other.IsDefault = false;
    }
}
