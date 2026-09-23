using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

[ApiController]
[Route("api/screens")]
[Authorize]
public class ScreensController(AppDbContext db) : ControllerBase
{
    private IQueryable<Screen> Query() => db.Screens
        .Include(s => s.DefaultPlaylist)
        .Include(s => s.Schedules).ThenInclude(x => x.Playlist);

    [HttpGet]
    public async Task<List<ScreenDto>> GetAll()
    {
        var screens = await Query().AsNoTracking().Where(s => s.IsPaired).OrderBy(s => s.Name).ToListAsync();
        return screens.Select(s => s.ToDto()).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ScreenDto>> Get(int id)
    {
        var screen = await Query().AsNoTracking().FirstOrDefaultAsync(s => s.Id == id && s.IsPaired);
        return screen is null ? NotFound() : screen.ToDto();
    }

    /// <summary>Lidh një TV të ri duke përdorur kodin që shfaqet në ekranin e tij.</summary>
    [HttpPost("pair")]
    public async Task<ActionResult<ScreenDto>> Pair(PairScreenRequest req)
    {
        var code = req.PairingCode.Trim();
        var screen = await db.Screens.FirstOrDefaultAsync(s => !s.IsPaired && s.PairingCode == code);
        if (screen is null)
            return NotFound(new { message = "Kodi nuk u gjet. Kontrolloni kodin që shfaqet në TV." });

        if (req.DefaultPlaylistId is int pid && !await db.Playlists.AnyAsync(p => p.Id == pid))
            return BadRequest(new { message = "Playlist-a nuk ekziston." });

        screen.IsPaired = true;
        screen.PairingCode = null;
        screen.Name = req.Name.Trim();
        screen.Location = req.Location?.Trim();
        screen.DefaultPlaylistId = req.DefaultPlaylistId;
        screen.Orientation = req.Orientation;
        await db.SaveChangesAsync();

        return (await Query().AsNoTracking().FirstAsync(s => s.Id == screen.Id)).ToDto();
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ScreenDto>> Update(int id, UpdateScreenRequest req)
    {
        var screen = await db.Screens.Include(s => s.Schedules).FirstOrDefaultAsync(s => s.Id == id && s.IsPaired);
        if (screen is null) return NotFound();

        var schedules = req.Schedules ?? [];
        var playlistIds = schedules.Select(s => s.PlaylistId)
            .Concat(req.DefaultPlaylistId is int d ? [d] : Array.Empty<int>()).Distinct().ToList();
        var existing = await db.Playlists.Where(p => playlistIds.Contains(p.Id)).CountAsync();
        if (existing != playlistIds.Count)
            return BadRequest(new { message = "Një nga playlist-at nuk ekziston." });

        var parsed = new List<ScreenSchedule>();
        foreach (var s in schedules)
        {
            if (!TimeOnly.TryParse(s.StartTime, out var start) || !TimeOnly.TryParse(s.EndTime, out var end))
                return BadRequest(new { message = "Ora e orarit nuk është e vlefshme (HH:mm)." });
            if (s.DaysOfWeek is <= 0 or > 127)
                return BadRequest(new { message = "Zgjidhni të paktën një ditë për çdo orar." });
            parsed.Add(new ScreenSchedule
            {
                PlaylistId = s.PlaylistId, DaysOfWeek = s.DaysOfWeek, StartTime = start, EndTime = end, Priority = s.Priority,
            });
        }

        screen.Name = req.Name.Trim();
        screen.Location = req.Location?.Trim();
        screen.DefaultPlaylistId = req.DefaultPlaylistId;
        screen.Orientation = req.Orientation;
        db.ScreenSchedules.RemoveRange(screen.Schedules);
        screen.Schedules = parsed;
        await db.SaveChangesAsync();

        return (await Query().AsNoTracking().FirstAsync(s => s.Id == id)).ToDto();
    }

    /// <summary>Detyron TV-në të rifreskojë faqen (p.sh. pas një përditësimi të player-it).</summary>
    [HttpPost("{id:int}/reload")]
    public async Task<IActionResult> Reload(int id)
    {
        var updated = await db.Screens.Where(s => s.Id == id)
            .ExecuteUpdateAsync(u => u.SetProperty(s => s.CommandVersion, s => s.CommandVersion + 1));
        return updated == 0 ? NotFound() : NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var screen = await db.Screens.FindAsync(id);
        if (screen is null) return NotFound();
        db.Screens.Remove(screen);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
