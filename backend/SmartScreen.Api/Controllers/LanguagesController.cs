using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Controllers;

/// <summary>Gjuhët dhe tekstet që shfaqen në TV (çiftimi, "E mbaruar", "Ofertat" etj.).</summary>
[ApiController]
[Route("api/languages")]
[Authorize]
public class LanguagesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<LanguageDto>> GetAll() =>
        await db.Languages.AsNoTracking().OrderBy(l => l.SortOrder).ThenBy(l => l.Name)
            .Select(l => new LanguageDto(l.Id, l.Code, l.Name, l.SortOrder, l.Texts.Count))
            .ToListAsync();

    [HttpPost]
    public async Task<ActionResult<LanguageDto>> Create(SaveLanguageRequest req)
    {
        var code = req.Code.Trim().ToLowerInvariant();
        if (await db.Languages.AnyAsync(l => l.Code == code))
            return Conflict(new { message = $"Gjuha me kodin \"{code}\" ekziston." });

        var language = new Language { Code = code, Name = req.Name.Trim(), SortOrder = req.SortOrder };

        // Kopjo çelësat (dhe vlerat si pikënisje për përkthim) nga një gjuhë ekzistuese.
        if (req.CopyFromLanguageId is int from)
        {
            language.Texts = await db.UiTexts.AsNoTracking().Where(t => t.LanguageId == from)
                .Select(t => new UiText { Key = t.Key, Value = t.Value }).ToListAsync();
        }

        db.Languages.Add(language);
        await db.SaveChangesAsync();
        return new LanguageDto(language.Id, language.Code, language.Name, language.SortOrder, language.Texts.Count);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<LanguageDto>> Update(int id, SaveLanguageRequest req)
    {
        var language = await db.Languages.FindAsync(id);
        if (language is null) return NotFound();

        var code = req.Code.Trim().ToLowerInvariant();
        if (await db.Languages.AnyAsync(l => l.Code == code && l.Id != id))
            return Conflict(new { message = $"Gjuha me kodin \"{code}\" ekziston." });

        language.Code = code;
        language.Name = req.Name.Trim();
        language.SortOrder = req.SortOrder;
        await db.SaveChangesAsync();
        return new LanguageDto(language.Id, language.Code, language.Name, language.SortOrder,
            await db.UiTexts.CountAsync(t => t.LanguageId == id));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var language = await db.Languages.FindAsync(id);
        if (language is null) return NotFound();

        // Databazat ekzistuese mund të mos kenë çelës të huaj për këtë kolonë – pastroje në kod.
        await db.BusinessSettings.Where(s => s.LanguageId == id)
            .ExecuteUpdateAsync(u => u.SetProperty(s => s.LanguageId, (int?)null));
        await db.UiTexts.Where(t => t.LanguageId == id).ExecuteDeleteAsync();
        db.Languages.Remove(language);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}/texts")]
    public async Task<ActionResult<List<UiTextDto>>> GetTexts(int id)
    {
        if (!await db.Languages.AnyAsync(l => l.Id == id)) return NotFound();
        return await db.UiTexts.AsNoTracking().Where(t => t.LanguageId == id).OrderBy(t => t.Key)
            .Select(t => new UiTextDto(t.Key, t.Value)).ToListAsync();
    }

    /// <summary>Zëvendëson të gjitha tekstet e gjuhës me listën e dërguar (shto / ndrysho / fshi).</summary>
    [HttpPut("{id:int}/texts")]
    public async Task<ActionResult<List<UiTextDto>>> SaveTexts(int id, List<UiTextDto> texts)
    {
        if (!await db.Languages.AnyAsync(l => l.Id == id)) return NotFound();

        var incoming = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var t in texts)
        {
            var key = t.Key.Trim();
            if (key.Length == 0) continue;
            if (!incoming.TryAdd(key, t.Value ?? ""))
                return BadRequest(new { message = $"Çelësi \"{key}\" është i përsëritur." });
        }

        var existing = await db.UiTexts.Where(t => t.LanguageId == id).ToListAsync();
        foreach (var t in existing)
        {
            if (incoming.Remove(t.Key, out var value)) t.Value = value;
            else db.UiTexts.Remove(t);
        }
        foreach (var (key, value) in incoming)
            db.UiTexts.Add(new UiText { LanguageId = id, Key = key, Value = value });

        await db.SaveChangesAsync();
        return await GetTexts(id);
    }
}
