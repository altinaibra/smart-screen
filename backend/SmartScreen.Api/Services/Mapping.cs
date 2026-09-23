using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Services;

public static class Mapping
{
    public static readonly TimeSpan OnlineWindow = TimeSpan.FromMinutes(2);

    public static MediaDto ToDto(this MediaAsset m) =>
        new(m.Id, m.Name, m.Type, m.Url, m.ContentType, m.SizeBytes, m.CreatedAt);

    public static ScreenDto ToDto(this Screen s) => new(
        s.Id, s.Name, s.Location, s.Platform, s.ResolutionWidth, s.ResolutionHeight, s.Orientation,
        s.DefaultPlaylistId, s.DefaultPlaylist?.Name,
        s.LastSeenAt.HasValue && DateTime.UtcNow - s.LastSeenAt.Value < OnlineWindow,
        s.LastSeenAt, s.CreatedAt,
        s.Schedules.OrderByDescending(x => x.Priority).ThenBy(x => x.StartTime).Select(x => x.ToDto()).ToList());

    public static ScheduleDto ToDto(this ScreenSchedule x) => new(
        x.Id, x.PlaylistId, x.Playlist?.Name, x.DaysOfWeek, x.StartTime.ToString("HH:mm"), x.EndTime.ToString("HH:mm"), x.Priority);

    public static PlaylistItemDto ToDto(this PlaylistItem i) => new(
        i.Id, i.Type, i.DurationSeconds, i.IsEnabled, i.Title, i.Text, i.Url, i.BackgroundColor, i.TextColor, i.Fit,
        i.MediaAssetId, i.MediaAsset?.ToDto(), i.MenuCategoryId);

    public static PlaylistDto ToDto(this Playlist p) => new(
        p.Id, p.Name, p.Description, p.UpdatedAt, p.Items.OrderBy(i => i.SortOrder).Select(i => i.ToDto()).ToList());

    public static ProductDto ToDto(this Product p) => new(
        p.Id, p.CategoryId, p.Name, p.Description, p.Price, p.OldPrice, p.ImageAssetId, p.ImageAsset?.Url,
        p.IsAvailable, p.IsFeatured, p.SortOrder);

    public static CategoryDto ToDto(this MenuCategory c) => new(
        c.Id, c.Name, c.SortOrder, c.Products.OrderBy(p => p.SortOrder).ThenBy(p => p.Name).Select(p => p.ToDto()).ToList());

    public static SettingsDto ToDto(this BusinessSettings s) => new(
        s.BusinessName, s.LogoAssetId, s.LogoAsset?.Url, s.PrimaryColor, s.AccentColor, s.Currency,
        s.ShowTicker, s.TickerText, s.ShowClock, s.TimeZoneId);

    public static CurrencyDto ToDto(this Currency c) => new(
        c.CurrencyId, c.CurrencyCode, c.CurrencyName, c.CurrencySymbol, c.ExchangeRate,
        c.Status, c.IsMainCurrency, c.EntryDate, c.FiscalType, c.RowVersion);

    public static PaymentMethodDto ToDto(this PaymentMethod p) => new(
        p.PaymentMethodId, p.PaymentMethodCode, p.PaymentMethodName, p.Status, p.IsDefault,
        p.SortOrder, p.EntryDate, p.FiscalType, p.RowVersion);
}
