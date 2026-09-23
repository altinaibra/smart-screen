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

        if (!await db.Currencies.AnyAsync())
        {
            var entryDate = new DateTime(2026, 4, 21, 12, 1, 1, 700, DateTimeKind.Utc);
            Currency[] currencies =
            [
                new() { CurrencyCode = "EUR", CurrencyName = "Euro", CurrencySymbol = "€", ExchangeRate = 1.000m, IsMainCurrency = true, EntryDate = entryDate, FiscalType = 2 },
                new() { CurrencyCode = "LEK", CurrencyName = "Albanian Lek", CurrencySymbol = "L", ExchangeRate = 122.510m, EntryDate = entryDate, FiscalType = 1 },
                new() { CurrencyCode = "USD", CurrencyName = "US Dollar", CurrencySymbol = "$", ExchangeRate = 1.100m, EntryDate = entryDate, FiscalType = 3 },
                new() { CurrencyCode = "GBP", CurrencyName = "British Pound", CurrencySymbol = "£", ExchangeRate = 0.850m, EntryDate = entryDate, FiscalType = -1 },
                new() { CurrencyCode = "CHF", CurrencyName = "Swiss Franc", CurrencySymbol = "CHF", ExchangeRate = 0.920m, EntryDate = entryDate, FiscalType = -1 },
            ];
            // Një nga një, që CurrencyId të dalë 1..5 sipas renditjes më sipër.
            foreach (var currency in currencies)
            {
                db.Currencies.Add(currency);
                await db.SaveChangesAsync();
            }
        }

        if (!await db.PaymentMethods.AnyAsync())
        {
            db.PaymentMethods.AddRange(
                new PaymentMethod { PaymentMethodCode = "CASH", PaymentMethodName = "Para në dorë", IsDefault = true, SortOrder = 1, FiscalType = 1 },
                new PaymentMethod { PaymentMethodCode = "CARD", PaymentMethodName = "Kartë", SortOrder = 2, FiscalType = 2 },
                new PaymentMethod { PaymentMethodCode = "BANK", PaymentMethodName = "Transfertë bankare", SortOrder = 3, FiscalType = 3 });
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
        foreach (var (table, sqlServer, sqlite) in AddedTables)
        {
            if (db.Database.IsSqlServer())
                await db.Database.ExecuteSqlRawAsync($"IF OBJECT_ID(N'[{table}]', N'U') IS NULL\nBEGIN\n{sqlServer}\nEND");
            else if (db.Database.IsSqlite())
                await db.Database.ExecuteSqlRawAsync(sqlite);
        }
    }

    private static readonly (string Table, string SqlServer, string Sqlite)[] AddedTables =
    [
        ("MediaChunks",
            """
            CREATE TABLE [MediaChunks] (
                [Id] bigint NOT NULL IDENTITY,
                [MediaAssetId] int NOT NULL,
                [Index] int NOT NULL,
                [Data] varbinary(max) NOT NULL,
                CONSTRAINT [PK_MediaChunks] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_MediaChunks_MediaAssets_MediaAssetId] FOREIGN KEY ([MediaAssetId]) REFERENCES [MediaAssets] ([Id]) ON DELETE CASCADE
            );
            CREATE UNIQUE INDEX [IX_MediaChunks_MediaAssetId_Index] ON [MediaChunks] ([MediaAssetId], [Index]);
            """,
            """
            CREATE TABLE IF NOT EXISTS "MediaChunks" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_MediaChunks" PRIMARY KEY AUTOINCREMENT,
                "MediaAssetId" INTEGER NOT NULL,
                "Index" INTEGER NOT NULL,
                "Data" BLOB NOT NULL,
                CONSTRAINT "FK_MediaChunks_MediaAssets_MediaAssetId" FOREIGN KEY ("MediaAssetId") REFERENCES "MediaAssets" ("Id") ON DELETE CASCADE
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_MediaChunks_MediaAssetId_Index" ON "MediaChunks" ("MediaAssetId", "Index");
            """),
        ("Currencies",
            """
            CREATE TABLE [Currencies] (
                [CurrencyId] int NOT NULL IDENTITY,
                [CurrencyCode] nvarchar(10) NOT NULL,
                [CurrencyName] nvarchar(100) NOT NULL,
                [CurrencySymbol] nvarchar(10) NOT NULL,
                [ExchangeRate] decimal(18,3) NOT NULL,
                [Status] bit NOT NULL,
                [IsMainCurrency] bit NOT NULL,
                [EntryDate] datetime2 NOT NULL,
                [FiscalType] int NOT NULL,
                [RowVersion] rowversion NULL,
                CONSTRAINT [PK_Currencies] PRIMARY KEY ([CurrencyId])
            );
            CREATE UNIQUE INDEX [IX_Currencies_CurrencyCode] ON [Currencies] ([CurrencyCode]);
            """,
            """
            CREATE TABLE IF NOT EXISTS "Currencies" (
                "CurrencyId" INTEGER NOT NULL CONSTRAINT "PK_Currencies" PRIMARY KEY AUTOINCREMENT,
                "CurrencyCode" TEXT NOT NULL,
                "CurrencyName" TEXT NOT NULL,
                "CurrencySymbol" TEXT NOT NULL,
                "ExchangeRate" TEXT NOT NULL,
                "Status" INTEGER NOT NULL,
                "IsMainCurrency" INTEGER NOT NULL,
                "EntryDate" TEXT NOT NULL,
                "FiscalType" INTEGER NOT NULL,
                "RowVersion" BLOB NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Currencies_CurrencyCode" ON "Currencies" ("CurrencyCode");
            """),
        ("PaymentMethods",
            """
            CREATE TABLE [PaymentMethods] (
                [PaymentMethodId] int NOT NULL IDENTITY,
                [PaymentMethodCode] nvarchar(20) NOT NULL,
                [PaymentMethodName] nvarchar(100) NOT NULL,
                [Status] bit NOT NULL,
                [IsDefault] bit NOT NULL,
                [SortOrder] int NOT NULL,
                [EntryDate] datetime2 NOT NULL,
                [FiscalType] int NOT NULL,
                [RowVersion] rowversion NULL,
                CONSTRAINT [PK_PaymentMethods] PRIMARY KEY ([PaymentMethodId])
            );
            CREATE UNIQUE INDEX [IX_PaymentMethods_PaymentMethodCode] ON [PaymentMethods] ([PaymentMethodCode]);
            """,
            """
            CREATE TABLE IF NOT EXISTS "PaymentMethods" (
                "PaymentMethodId" INTEGER NOT NULL CONSTRAINT "PK_PaymentMethods" PRIMARY KEY AUTOINCREMENT,
                "PaymentMethodCode" TEXT NOT NULL,
                "PaymentMethodName" TEXT NOT NULL,
                "Status" INTEGER NOT NULL,
                "IsDefault" INTEGER NOT NULL,
                "SortOrder" INTEGER NOT NULL,
                "EntryDate" TEXT NOT NULL,
                "FiscalType" INTEGER NOT NULL,
                "RowVersion" BLOB NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_PaymentMethods_PaymentMethodCode" ON "PaymentMethods" ("PaymentMethodCode");
            """),
    ];
}
