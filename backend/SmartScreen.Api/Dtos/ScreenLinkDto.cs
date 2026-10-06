using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

/// <summary>Path: rruga e player-it për këtë ekran, p.sh. "/player/?device=abc…" (shtohet te adresa e serverit).</summary>
public record ScreenLinkDto(string Path);

public record ReplaceDeviceRequest([Required] string PairingCode);
