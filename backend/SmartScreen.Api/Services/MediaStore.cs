using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Services;

/// <summary>Ruan dhe lexon përmbajtjen e fotove/videove në databazë (tabela MediaChunks).</summary>
public static class MediaStore
{
    public const int ChunkSize = 1024 * 1024; // 1 MB

    /// <summary>Shkruan përmbajtjen copë pas cope dhe kthen numrin e bajteve të ruajtura.</summary>
    public static async Task<long> WriteAsync(AppDbContext db, int assetId, Stream source, CancellationToken ct = default)
    {
        var buffer = new byte[ChunkSize];
        long total = 0;
        for (var index = 0; ; index++)
        {
            var read = await source.ReadAtLeastAsync(buffer, ChunkSize, throwOnEndOfStream: false, ct);
            if (read == 0) break;

            db.MediaChunks.Add(new MediaChunk { MediaAssetId = assetId, Index = index, Data = buffer[..read] });
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear(); // mos i mbaj copat në memorie
            total += read;
            if (read < ChunkSize) break;
        }
        return total;
    }

    /// <summary>
    /// Fotot/videot e ngarkuara para kalimit në databazë (në dosjen uploads) kopjohen një herë në databazë.
    /// Skedarët në disk nuk fshihen.
    /// </summary>
    public static async Task ImportLegacyFilesAsync(AppDbContext db, IConfiguration config, IWebHostEnvironment env, ILogger logger)
    {
        var folder = Path.Combine(env.ContentRootPath, config["Storage:UploadsPath"] is { Length: > 0 } p ? p : "uploads");
        if (!Directory.Exists(folder)) return;

        var missing = await db.MediaAssets.AsNoTracking()
            .Where(m => !db.MediaChunks.Any(c => c.MediaAssetId == m.Id))
            .Select(m => new { m.Id, m.FileName })
            .ToListAsync();

        foreach (var m in missing)
        {
            var path = Path.Combine(folder, Path.GetFileName(m.FileName));
            if (!File.Exists(path)) continue;

            await using var tx = await db.Database.BeginTransactionAsync();
            await using (var file = File.OpenRead(path))
                await WriteAsync(db, m.Id, file);
            await tx.CommitAsync();
            logger.LogInformation("Media {FileName} u kopjua në databazë", m.FileName);
        }
    }
}

/// <summary>
/// Stream vetëm-për-lexim mbi copat e një media në databazë. Mbështet Seek,
/// kështu që Results.File mund t'u përgjigjet kërkesave Range (video që luhen/kërcejnë në TV).
/// </summary>
public sealed class MediaChunkStream(AppDbContext db, int assetId, long length) : Stream
{
    private long _position;
    private int _chunkIndex = -1;
    private byte[] _chunk = [];

    public override bool CanRead => true;
    public override bool CanSeek => true;
    public override bool CanWrite => false;
    public override long Length => length;

    public override long Position
    {
        get => _position;
        set => _position = Math.Clamp(value, 0, length);
    }

    public override long Seek(long offset, SeekOrigin origin) => Position = origin switch
    {
        SeekOrigin.Begin => offset,
        SeekOrigin.Current => _position + offset,
        _ => length + offset,
    };

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken ct = default)
    {
        if (_position >= length || buffer.Length == 0) return 0;

        var index = (int)(_position / MediaStore.ChunkSize);
        if (index != _chunkIndex)
        {
            _chunk = await db.MediaChunks.AsNoTracking()
                .Where(c => c.MediaAssetId == assetId && c.Index == index)
                .Select(c => c.Data)
                .FirstOrDefaultAsync(ct) ?? [];
            _chunkIndex = index;
        }

        var offset = (int)(_position - (long)index * MediaStore.ChunkSize);
        var count = Math.Min(buffer.Length, _chunk.Length - offset);
        if (count <= 0) return 0; // copë që mungon – ndalo në vend që të kthehen të dhëna të gabuara
        _chunk.AsMemory(offset, count).CopyTo(buffer);
        _position += count;
        return count;
    }

    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken ct) =>
        ReadAsync(buffer.AsMemory(offset, count), ct).AsTask();

    public override int Read(byte[] buffer, int offset, int count) =>
        ReadAsync(buffer.AsMemory(offset, count)).AsTask().GetAwaiter().GetResult();

    public override void Flush() { }
    public override void SetLength(long value) => throw new NotSupportedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
}
