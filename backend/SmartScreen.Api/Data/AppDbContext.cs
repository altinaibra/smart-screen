using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Screen> Screens => Set<Screen>();
    public DbSet<ScreenSchedule> ScreenSchedules => Set<ScreenSchedule>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<MediaChunk> MediaChunks => Set<MediaChunk>();
    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<PlaylistItem> PlaylistItems => Set<PlaylistItem>();
    public DbSet<MenuCategory> MenuCategories => Set<MenuCategory>();
    public DbSet<Products> Products => Set<Products>();
    public DbSet<BusinessSettings> BusinessSettings => Set<BusinessSettings>();
    public DbSet<Currency> Currencies => Set<Currency>();
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // Të gjitha datat ruhen në UTC dhe lexohen si UTC (SQLite nuk e ruan "Kind").
        builder.Properties<DateTime>().HaveConversion<UtcConverter>();
        builder.Properties<string>().HaveMaxLength(2000);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<AppUser>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.Property(u => u.Username).HasMaxLength(100);
        });

        b.Entity<Screen>(e =>
        {
            e.HasIndex(s => s.DeviceKey).IsUnique();
            e.HasIndex(s => s.PairingCode);
            e.Property(s => s.Name).HasMaxLength(100);
            e.Property(s => s.DeviceKey).HasMaxLength(64);
            e.Property(s => s.PairingCode).HasMaxLength(10);
            e.Property(s => s.Platform).HasConversion<string>().HasMaxLength(30);
            e.Property(s => s.Orientation).HasConversion<string>().HasMaxLength(20);
            // NoAction që të shmangen "multiple cascade paths" në SQL Server; pastrohet në kod.
            e.HasOne(s => s.DefaultPlaylist).WithMany().HasForeignKey(s => s.DefaultPlaylistId)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });

        b.Entity<ScreenSchedule>(e =>
        {
            e.HasOne(x => x.Screen).WithMany(s => s.Schedules).HasForeignKey(x => x.ScreenId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Playlist).WithMany().HasForeignKey(x => x.PlaylistId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<MediaAsset>(e =>
        {
            e.Property(m => m.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(m => m.Name).HasMaxLength(200);
            e.Property(m => m.FileName).HasMaxLength(200);
            e.Ignore(m => m.Url);
        });

        b.Entity<MediaChunk>(e =>
        {
            e.HasIndex(c => new { c.MediaAssetId, c.Index }).IsUnique();
            e.HasOne(c => c.MediaAsset).WithMany().HasForeignKey(c => c.MediaAssetId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Playlist>(e => e.Property(p => p.Name).HasMaxLength(100));

        b.Entity<BusinessSettings>(e =>
        {
            e.Property(s => s.Tagline).HasMaxLength(100);
            e.Property(s => s.Slogan).HasMaxLength(200);
            e.Property(s => s.OpeningTime).HasMaxLength(5);
            e.Property(s => s.ClosingTime).HasMaxLength(5);
            e.Property(s => s.Phone).HasMaxLength(50);
            e.Property(s => s.SocialHandle).HasMaxLength(100);
            e.Property(s => s.ScreenLanguage).HasMaxLength(5);
            e.Property(s => s.BusinessType).HasMaxLength(20);
        });

        b.Entity<PlaylistItem>(e =>
        {
            e.Property(i => i.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(i => i.Fit).HasConversion<string>().HasMaxLength(20);
            e.Property(i => i.Badge).HasMaxLength(100);
            e.Property(i => i.Price).HasPrecision(12, 2);
            e.HasOne(i => i.Playlist).WithMany(p => p.Items).HasForeignKey(i => i.PlaylistId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.MediaAsset).WithMany().HasForeignKey(i => i.MediaAssetId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(i => i.MenuCategory).WithMany().HasForeignKey(i => i.MenuCategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<MenuCategory>(e => e.Property(c => c.Name).HasMaxLength(100));

        b.Entity<Products>(e =>
        {
            e.Property(p => p.Name).HasMaxLength(150);
            e.Property(p => p.Price).HasPrecision(12, 2);
            e.Property(p => p.OldPrice).HasPrecision(12, 2);
            e.HasOne(p => p.Category).WithMany(c => c.Products).HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(p => p.ImageAsset).WithMany().HasForeignKey(p => p.ImageAssetId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<BusinessSettings>(e =>
        {
            e.HasOne(s => s.LogoAsset).WithMany().HasForeignKey(s => s.LogoAssetId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Currency>(e =>
        {
            e.HasIndex(c => c.CurrencyCode).IsUnique();
            e.Property(c => c.CurrencyCode).HasMaxLength(10);
            e.Property(c => c.CurrencyName).HasMaxLength(100);
            e.Property(c => c.CurrencySymbol).HasMaxLength(10);
            e.Property(c => c.ExchangeRate).HasPrecision(18, 3);
            ConfigureRowVersion(e.Property(c => c.RowVersion));
        });

        b.Entity<PaymentMethod>(e =>
        {
            e.HasIndex(p => p.PaymentMethodCode).IsUnique();
            e.Property(p => p.PaymentMethodCode).HasMaxLength(20);
            e.Property(p => p.PaymentMethodName).HasMaxLength(100);
            ConfigureRowVersion(e.Property(p => p.RowVersion));
        });
    }

    // SQL Server e gjeneron vetë rowversion në çdo ndryshim. SQLite nuk e ka këtë lloj, prandaj atje
    // kolona mbetet e zakonshme (null) dhe nuk përdoret për kontrollin e ndryshimeve.
    private void ConfigureRowVersion(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<byte[]?> property)
    {
        if (Database.IsSqlServer()) property.IsRowVersion();
    }

    private class UtcConverter() : ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
}
