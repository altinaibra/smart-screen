using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

[ApiController]
[Route("api/playlists")]
[Authorize]
[BusinessScoped]
public class PlaylistsController(AppDbContext db, PlayerContentService content, BusinessAccess access) : ControllerBase
{
    private IQueryable<Playlist> Playlists => db.Playlists.Where(p => p.BusinessId == access.BusinessId);

    [HttpGet]
    public async Task<List<PlaylistSummaryDto>> GetAll()
    {
        var playlists = await Playlists.AsNoTracking().Include(p => p.Items).OrderBy(p => p.Name).ToListAsync();
        var screenCounts = await db.Screens.Where(s => s.IsPaired && s.BusinessId == access.BusinessId && s.DefaultPlaylistId != null)
            .GroupBy(s => s.DefaultPlaylistId!.Value)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count);

        return playlists.Select(p => new PlaylistSummaryDto(
            p.Id, p.Name, p.Description, p.Items.Count,
            p.Items.Where(i => i.IsEnabled).Sum(i => i.DurationSeconds),
            screenCounts.GetValueOrDefault(p.Id), p.UpdatedAt)).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PlaylistDto>> Get(int id)
    {
        var playlist = await Playlists.AsNoTracking()
            .Include(p => p.Items).ThenInclude(i => i.MediaAsset)
            .FirstOrDefaultAsync(p => p.Id == id);
        return playlist is null ? NotFound() : playlist.ToDto();
    }

    /// <summary>Përmbajtja siç do ta shohë TV-ja – përdoret nga preview-ja në panel.</summary>
    [HttpGet("{id:int}/preview")]
    public async Task<ActionResult<PlayerContentDto>> Preview(int id, [FromQuery] ScreenOrientation orientation = ScreenOrientation.Landscape)
    {
        if (!await Playlists.AnyAsync(p => p.Id == id)) return NotFound();
        return await content.BuildPreviewAsync(access.BusinessId, id, orientation);
    }

    [HttpPost]
    public async Task<ActionResult<PlaylistDto>> Create(SavePlaylistRequest req)
    {
        var playlist = new Playlist { BusinessId = access.BusinessId, Name = req.Name.Trim(), Description = req.Description };
        var error = await ApplyItemsAsync(playlist, req.Items ?? []);
        if (error is not null) return BadRequest(new { message = error });

        db.Playlists.Add(playlist);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = playlist.Id }, (await Get(playlist.Id)).Value);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PlaylistDto>> Update(int id, SavePlaylistRequest req)
    {
        var playlist = await Playlists.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
        if (playlist is null) return NotFound();

        playlist.Name = req.Name.Trim();
        playlist.Description = req.Description;
        playlist.UpdatedAt = DateTime.UtcNow;
        db.PlaylistItems.RemoveRange(playlist.Items);
        playlist.Items = [];

        var error = await ApplyItemsAsync(playlist, req.Items ?? []);
        if (error is not null) return BadRequest(new { message = error });

        await db.SaveChangesAsync();
        return await Get(id);
    }

    [HttpPost("{id:int}/duplicate")]
    public async Task<ActionResult<PlaylistDto>> Duplicate(int id)
    {
        var source = await Playlists.AsNoTracking().Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
        if (source is null) return NotFound();

        var copy = new Playlist
        {
            BusinessId = access.BusinessId,
            Name = $"{source.Name} (kopje)",
            Description = source.Description,
            Items = source.Items.Select(i => new PlaylistItem
            {
                SortOrder = i.SortOrder, Type = i.Type, DurationSeconds = i.DurationSeconds, IsEnabled = i.IsEnabled,
                Title = i.Title, Text = i.Text, Url = i.Url, BackgroundColor = i.BackgroundColor, TextColor = i.TextColor,
                Fit = i.Fit, MediaAssetId = i.MediaAssetId, MenuCategoryId = i.MenuCategoryId, Badge = i.Badge, Price = i.Price,
            }).ToList(),
        };
        db.Playlists.Add(copy);
        await db.SaveChangesAsync();
        return (await Get(copy.Id)).Value!;
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var playlist = await Playlists.FirstOrDefaultAsync(p => p.Id == id);
        if (playlist is null) return NotFound();

        await db.Screens.Where(s => s.DefaultPlaylistId == id)
            .ExecuteUpdateAsync(u => u.SetProperty(s => s.DefaultPlaylistId, (int?)null));
        db.Playlists.Remove(playlist);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> ApplyItemsAsync(Playlist playlist, List<PlaylistItemDto> items)
    {
        var mediaIds = items.Where(i => i.MediaAssetId != null).Select(i => i.MediaAssetId!.Value).Distinct().ToList();
        var media = await db.MediaAssets.Where(m => mediaIds.Contains(m.Id) && m.BusinessId == access.BusinessId).ToDictionaryAsync(m => m.Id, m => m.Type);
        var categoryIds = await db.MenuCategories.Where(c => c.BusinessId == access.BusinessId).Select(c => c.Id).ToListAsync();

        for (var index = 0; index < items.Count; index++)
        {
            var i = items[index];
            var n = index + 1;

            switch (i.Type)
            {
                case SlideType.Image or SlideType.Video:
                    var expected = i.Type == SlideType.Image ? MediaType.Image : MediaType.Video;
                    if (i.MediaAssetId is not int mid || !media.TryGetValue(mid, out var t) || t != expected)
                        return $"Slide {n}: zgjidhni një {(expected == MediaType.Image ? "foto" : "video")}.";
                    break;
                case SlideType.WebPage:
                    if (!Uri.TryCreate(i.Url, UriKind.Absolute, out var uri) || (uri.Scheme != "http" && uri.Scheme != "https"))
                        return $"Slide {n}: vendosni një URL të vlefshme (http/https).";
                    break;
                case SlideType.Menu:
                    if (i.MenuCategoryId is int cid && !categoryIds.Contains(cid))
                        return $"Slide {n}: kategoria nuk ekziston.";
                    break;
                case SlideType.Promo or SlideType.Combo:
                    if (string.IsNullOrWhiteSpace(i.Title))
                        return $"Slide {n}: vendosni titullin.";
                    if (i.MediaAssetId is int pid && (!media.TryGetValue(pid, out var pt) || pt != MediaType.Image))
                        return $"Slide {n}: foto e zgjedhur nuk ekziston.";
                    if (i.Price is < 0)
                        return $"Slide {n}: çmimi nuk mund të jetë negativ.";
                    break;
            }
            var hasMedia = i.Type is SlideType.Image or SlideType.Video or SlideType.Promo or SlideType.Combo;
            var hasOffer = i.Type is SlideType.Promo or SlideType.Combo;

            playlist.Items.Add(new PlaylistItem
            {
                SortOrder = index,
                Type = i.Type,
                DurationSeconds = Math.Clamp(i.DurationSeconds, 0, 3600),
                IsEnabled = i.IsEnabled,
                Title = i.Title,
                Text = i.Text,
                Url = i.Type == SlideType.WebPage ? i.Url : null,
                BackgroundColor = i.BackgroundColor,
                TextColor = i.TextColor,
                Fit = i.Fit,
                MediaAssetId = hasMedia ? i.MediaAssetId : null,
                MenuCategoryId = i.Type == SlideType.Menu ? i.MenuCategoryId : null,
                Badge = hasOffer ? i.Badge?.Trim() : null,
                Price = hasOffer ? i.Price : null,
            });
        }
        return null;
    }
}
