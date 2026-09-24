using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Data;

public static class DbSeeder
{
    /// <summary>
    /// Krijon tabelat dhe vetëm përdoruesin admin (për hyrjen e parë).
    /// Të gjitha të dhënat e tjera (menuja, valutat, mënyrat e pagesës, playlistat, cilësimet)
    /// shtohen nga paneli dhe ruhen në tabela – asgjë nuk vendoset në kod.
    /// </summary>
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
