using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

[ApiController]
[Route("api/media")]
[Authorize]
public class MediaController(AppDbContext db) : ControllerBase
{
    private const long MaxUploadBytes = 1L * 1024 * 1024 * 1024; // 1 GB

    private static readonly Dictionary<string, (MediaType Type, string ContentType)> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = (MediaType.Image, "image/jpeg"),
        [".jpeg"] = (MediaType.Image, "image/jpeg"),
        [".png"] = (MediaType.Image, "image/png"),
        [".gif"] = (MediaType.Image, "image/gif"),
        [".webp"] = (MediaType.Image, "image/webp"),
        [".mp4"] = (MediaType.Video, "video/mp4"),
        [".m4v"] = (MediaType.Video, "video/mp4"),
        [".webm"] = (MediaType.Video, "video/webm"),
    };

    [HttpGet]
    public async Task<List<MediaDto>> GetAll([FromQuery] MediaType? type)
    {
        var q = db.MediaAssets.AsNoTracking();
        if (type is not null) q = q.Where(m => m.Type == type);
        var items = await q.OrderByDescending(m => m.Id).ToListAsync();
        return items.Select(m => m.ToDto()).ToList();
    }

    [HttpPost]
    [RequestSizeLimit(MaxUploadBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<ActionResult<MediaDto>> Upload([FromForm] UploadMediaForm form)
    {
        var (file, name) = (form.File, form.Name);
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Nuk u dërgua asnjë skedar." });

        var ext = Path.GetExtension(file.FileName);
        if (!Allowed.TryGetValue(ext, out var info))
            return BadRequest(new { message = $"Formati '{ext}' nuk mbështetet. Lejohen: {string.Join(", ", Allowed.Keys)}" });

        var fileName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var asset = new MediaAsset
        {
            Name = string.IsNullOrWhiteSpace(name) ? Path.GetFileNameWithoutExtension(file.FileName) : name.Trim(),
            Type = info.Type,
            FileName = fileName,
            ContentType = info.ContentType,
            SizeBytes = file.Length,
        };

        // Të dhënat e skedarit ruhen në databazë (MediaChunks). Transaksioni siguron që një ngarkim
        // i ndërprerë të mos lërë media gjysmë të ruajtur.
        await using var tx = await db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        db.MediaAssets.Add(asset);
        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await using (var stream = file.OpenReadStream())
            await MediaStore.WriteAsync(db, asset.Id, stream, HttpContext.RequestAborted);
        await tx.CommitAsync(HttpContext.RequestAborted);

        return CreatedAtAction(nameof(GetAll), null, asset.ToDto());
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<MediaDto>> Rename(int id, RenameMediaRequest req)
    {
        var asset = await db.MediaAssets.FindAsync(id);
        if (asset is null) return NotFound();
        asset.Name = req.Name.Trim();
        await db.SaveChangesAsync();
        return asset.ToDto();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var asset = await db.MediaAssets.FindAsync(id);
        if (asset is null) return NotFound();

        // Copat në MediaChunks fshihen automatikisht (ON DELETE CASCADE).
        db.MediaAssets.Remove(asset);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
