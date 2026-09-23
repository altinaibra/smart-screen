using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config, IPasswordHasher<AppUser> hasher)
    {
        await db.Database.EnsureCreatedAsync();
        await UpgradeSchemaAsync(db);

        if (!await db.Users.AnyAsync())
        {
            var user = new AppUser { Username = config["Admin:Username"] ?? "admin" };
            user.PasswordHash = hasher.HashPassword(user, config["Admin:Password"] ?? "Admin123!");
            db.Users.Add(user);
        }

        if (!await db.BusinessSettings.AnyAsync())
        {
            db.BusinessSettings.Add(new BusinessSettings
            {
                BusinessName = "Burger House",
                TickerText = "Mirë se vini! • Oferta e ditës: Menu Classic vetëm 650 L • Porositni në arkë ose online",
            });
        }

        if (!await db.MenuCategories.AnyAsync())
        {
            var burgers = new MenuCategory
            {
                Name = "Burgera", SortOrder = 1, Products =
                [
                    new() { Name = "Classic Burger", Description = "Mish viçi, sallatë, domate, salcë speciale", Price = 450, SortOrder = 1, IsFeatured = true },
                    new() { Name = "Cheese Burger", Description = "Me djathë cheddar të dyfishtë", Price = 500, SortOrder = 2 },
                    new() { Name = "Chicken Burger", Description = "Fileto pule krokante", Price = 480, OldPrice = 550, SortOrder = 3, IsFeatured = true },
                    new() { Name = "Double Beef", Description = "Dy copa mishi, bacon, qepë", Price = 700, SortOrder = 4 },
                ],
            };
            var sides = new MenuCategory
            {
                Name = "Shoqëruese", SortOrder = 2, Products =
                [
                    new() { Name = "Patate të skuqura", Price = 200, SortOrder = 1 },
                    new() { Name = "Nuggets (6 copë)", Price = 350, SortOrder = 2, IsFeatured = true },
                    new() { Name = "Onion Rings", Price = 250, SortOrder = 3 },
                ],
            };
            var drinks = new MenuCategory
            {
                Name = "Pije", SortOrder = 3, Products =
                [
                    new() { Name = "Coca-Cola 0.5L", Price = 150, SortOrder = 1 },
                    new() { Name = "Ujë 0.5L", Price = 80, SortOrder = 2 },
                    new() { Name = "Milkshake", Price = 300, SortOrder = 3 },
                ],
            };
            db.MenuCategories.AddRange(burgers, sides, drinks);
            await db.SaveChangesAsync();

            if (!await db.Playlists.AnyAsync())
            {
                db.Playlists.Add(new Playlist
                {
                    Name = "Menuja kryesore",
                    Description = "Playlist demo",
                    Items =
                    [
                        new() { SortOrder = 0, Type = SlideType.Text, DurationSeconds = 8, Title = "Mirë se vini!", Text = "Shijoni burgerat tanë të freskët\ntë përgatitur çdo ditë", BackgroundColor = "#c8102e", TextColor = "#ffffff" },
                        new() { SortOrder = 1, Type = SlideType.Menu, DurationSeconds = 12, MenuCategoryId = burgers.Id },
                        new() { SortOrder = 2, Type = SlideType.Menu, DurationSeconds = 10, MenuCategoryId = sides.Id },
                        new() { SortOrder = 3, Type = SlideType.Menu, DurationSeconds = 10, MenuCategoryId = drinks.Id },
                        new() { SortOrder = 4, Type = SlideType.Menu, DurationSeconds = 10, Title = "Ofertat e ditës" },
                    ],
                });
            }
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// EnsureCreated krijon tabelat vetëm në një databazë bosh. Tabelat e shtuara më vonë
    /// krijohen këtu në databazat ekzistuese.
    /// </summary>
    private static async Task UpgradeSchemaAsync(AppDbContext db)
    {
        if (db.Database.IsSqlServer())
        {
            await db.Database.ExecuteSqlRawAsync("""
                IF OBJECT_ID(N'[MediaChunks]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [MediaChunks] (
                        [Id] bigint NOT NULL IDENTITY,
                        [MediaAssetId] int NOT NULL,
                        [Index] int NOT NULL,
                        [Data] varbinary(max) NOT NULL,
                        CONSTRAINT [PK_MediaChunks] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_MediaChunks_MediaAssets_MediaAssetId] FOREIGN KEY ([MediaAssetId]) REFERENCES [MediaAssets] ([Id]) ON DELETE CASCADE
                    );
                    CREATE UNIQUE INDEX [IX_MediaChunks_MediaAssetId_Index] ON [MediaChunks] ([MediaAssetId], [Index]);
                END
                """);
        }
        else if (db.Database.IsSqlite())
        {
            await db.Database.ExecuteSqlRawAsync("""
                CREATE TABLE IF NOT EXISTS "MediaChunks" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_MediaChunks" PRIMARY KEY AUTOINCREMENT,
                    "MediaAssetId" INTEGER NOT NULL,
                    "Index" INTEGER NOT NULL,
                    "Data" BLOB NOT NULL,
                    CONSTRAINT "FK_MediaChunks_MediaAssets_MediaAssetId" FOREIGN KEY ("MediaAssetId") REFERENCES "MediaAssets" ("Id") ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_MediaChunks_MediaAssetId_Index" ON "MediaChunks" ("MediaAssetId", "Index");
                """);
        }
    }
}
