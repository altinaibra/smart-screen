namespace SmartScreen.Api.Models;

/// <summary>
/// Përmbajtja e një foto/videoje ruhet në databazë e ndarë në copa (1 MB secila),
/// që edhe videot e mëdha të ngarkohen dhe të luhen pa u futur të gjitha në memorie.
/// </summary>
public class MediaChunk
{
    public long Id { get; set; }
    public int MediaAssetId { get; set; }
    public MediaAsset? MediaAsset { get; set; }
    public int Index { get; set; }
    public byte[] Data { get; set; } = [];
}
