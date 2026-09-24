using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Data;

public static class DbSeeder
{
    /// <summary>
    /// Krijon tabelat, biznesin e parë dhe vetëm përdoruesin admin (për hyrjen e parë).
    /// Të gjitha të dhënat e tjera (menuja, valutat, mënyrat e pagesës, playlistat, cilësimet)
    /// shtohen nga paneli dhe ruhen në tabela – asgjë nuk vendoset në kod.
    /// </summary>
    public static async Task SeedAsync(AppDbContext db, IConfiguration config, IPasswordHasher<AppUser> hasher)
    {
        await db.Database.EnsureCreatedAsync();
        await UpgradeSchemaAsync(db);
        await AssignLegacyDataAsync(db);

        if (!await db.Users.AnyAsync())
        {
            // Përdoruesi i parë është pronari i aplikacionit: krijon klientët dhe hyn te secili.
            var user = new AppUser { Username = config["Admin:Username"] ?? "admin", Role = AppUser.OwnerRole };
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

        foreach (var (table, column, sqlServerType, sqliteType) in AddedColumns)
        {
            if (db.Database.IsSqlServer())
            {
                await db.Database.ExecuteSqlRawAsync(
                    $"IF COL_LENGTH(N'[{table}]', N'{column}') IS NULL ALTER TABLE [{table}] ADD [{column}] {sqlServerType};");
            }
            else if (db.Database.IsSqlite())
            {
                var exists = await db.Database
                    .SqlQueryRaw<int>($"SELECT COUNT(*) AS \"Value\" FROM pragma_table_info('{table}') WHERE name = '{column}'")
                    .SingleAsync();
                if (exists == 0)
                    await db.Database.ExecuteSqlRawAsync($"ALTER TABLE \"{table}\" ADD COLUMN \"{column}\" {sqliteType};");
            }
        }
    }

    /// <summary>
    /// Para klientëve dhe bizneseve të shumta gjithçka i përkiste një biznesi të vetëm. Të dhënat e vjetra
    /// (BusinessId = 0 / null, ClientId = 0) i kalojnë biznesit dhe klientit të parë; administratori i vjetër
    /// bëhet pronar (Owner). Pastaj indekset unike të kodeve (valuta, mënyra pagese) bëhen unike brenda biznesit.
    /// </summary>
    private static async Task AssignLegacyDataAsync(AppDbContext db)
    {
        // Administratori i vjetër (pa klient) = pronari i aplikacionit.
        await db.Users.Where(u => u.Role == AppUser.AdminRole && u.ClientId == null)
            .ExecuteUpdateAsync(u => u.SetProperty(x => x.Role, AppUser.OwnerRole));

        var hasLegacyData = await db.Playlists.AnyAsync(p => p.BusinessId == 0) || await db.MediaAssets.AnyAsync(m => m.BusinessId == 0)
            || await db.MenuCategories.AnyAsync(c => c.BusinessId == 0) || await db.Currencies.AnyAsync(c => c.BusinessId == 0)
            || await db.PaymentMethods.AnyAsync(p => p.BusinessId == 0) || await db.Screens.AnyAsync(s => s.IsPaired && s.BusinessId == null)
            || await db.BusinessSettings.AnyAsync(b => b.ClientId == 0)
            || await db.Users.AnyAsync(u => u.Role != AppUser.OwnerRole && u.ClientId == null);
        if (hasLegacyData)
        {
            var firstClient = await db.Clients.OrderBy(c => c.Id).FirstOrDefaultAsync();
            if (firstClient is null)
            {
                var name = await db.BusinessSettings.OrderBy(b => b.Id).Select(b => b.BusinessName).FirstOrDefaultAsync();
                firstClient = new Client { Name = name ?? "Klienti 1" };
                db.Clients.Add(firstClient);
                await db.SaveChangesAsync();
            }
            await db.BusinessSettings.Where(b => b.ClientId == 0).ExecuteUpdateAsync(u => u.SetProperty(b => b.ClientId, firstClient.Id));
            await db.Users.Where(u => u.Role != AppUser.OwnerRole && u.ClientId == null)
                .ExecuteUpdateAsync(u => u.SetProperty(x => x.ClientId, firstClient.Id));

            if (!await db.BusinessSettings.AnyAsync())
            {
                db.BusinessSettings.Add(new BusinessSettings { ClientId = firstClient.Id });
                await db.SaveChangesAsync();
            }
            var first = await db.BusinessSettings.MinAsync(b => b.Id);
            foreach (var table in new[] { "Playlists", "MediaAssets", "MenuCategories", "Currencies", "PaymentMethods" })
                await db.Database.ExecuteSqlRawAsync($"UPDATE \"{table}\" SET \"BusinessId\" = {{0}} WHERE \"BusinessId\" = 0", first);
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE \"Screens\" SET \"BusinessId\" = {0} WHERE \"BusinessId\" IS NULL AND \"IsPaired\" = {1}", first, true);
        }

        foreach (var (table, oldIndex, newIndex, columns, unique) in BusinessIndexes)
        {
            var kind = unique ? "UNIQUE INDEX" : "INDEX";
            var cols = string.Join(", ", columns.Select(c => db.Database.IsSqlServer() ? $"[{c}]" : $"\"{c}\""));
            if (db.Database.IsSqlServer())
            {
                if (oldIndex is not null)
                    await db.Database.ExecuteSqlRawAsync(
                        $"IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'{oldIndex}' AND object_id = OBJECT_ID(N'[{table}]')) DROP INDEX [{oldIndex}] ON [{table}];");
                await db.Database.ExecuteSqlRawAsync(
                    $"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'{newIndex}' AND object_id = OBJECT_ID(N'[{table}]')) CREATE {kind} [{newIndex}] ON [{table}] ({cols});");
            }
            else if (db.Database.IsSqlite())
            {
                if (oldIndex is not null)
                    await db.Database.ExecuteSqlRawAsync($"DROP INDEX IF EXISTS \"{oldIndex}\";");
                await db.Database.ExecuteSqlRawAsync($"CREATE {kind} IF NOT EXISTS \"{newIndex}\" ON \"{table}\" ({cols});");
            }
        }
    }

    /// <summary>Indekset për BusinessId (tabela, indeksi i vjetër që hiqet, indeksi i ri, kolonat, unik).</summary>
    private static readonly (string Table, string? OldIndex, string NewIndex, string[] Columns, bool Unique)[] BusinessIndexes =
    [
        ("Currencies", "IX_Currencies_CurrencyCode", "IX_Currencies_BusinessId_CurrencyCode", ["BusinessId", "CurrencyCode"], true),
        ("PaymentMethods", "IX_PaymentMethods_PaymentMethodCode", "IX_PaymentMethods_BusinessId_PaymentMethodCode", ["BusinessId", "PaymentMethodCode"], true),
        ("Screens", null, "IX_Screens_BusinessId", ["BusinessId"], false),
        ("Playlists", null, "IX_Playlists_BusinessId", ["BusinessId"], false),
        ("MediaAssets", null, "IX_MediaAssets_BusinessId", ["BusinessId"], false),
        ("MenuCategories", null, "IX_MenuCategories_BusinessId", ["BusinessId"], false),
        ("BusinessSettings", null, "IX_BusinessSettings_ClientId", ["ClientId"], false),
        ("Users", null, "IX_Users_ClientId", ["ClientId"], false),
    ];

    /// <summary>Kolonat e shtuara më vonë në tabelat ekzistuese (tabela, kolona, tipi SQL Server, tipi SQLite).</summary>
    private static readonly (string Table, string Column, string SqlServer, string Sqlite)[] AddedColumns =
    [
        ("BusinessSettings", "Tagline", "nvarchar(100) NULL", "TEXT NULL"),
        ("BusinessSettings", "Slogan", "nvarchar(200) NULL", "TEXT NULL"),
        ("BusinessSettings", "OpeningTime", "nvarchar(5) NULL", "TEXT NULL"),
        ("BusinessSettings", "ClosingTime", "nvarchar(5) NULL", "TEXT NULL"),
        ("BusinessSettings", "Phone", "nvarchar(50) NULL", "TEXT NULL"),
        ("BusinessSettings", "SocialHandle", "nvarchar(100) NULL", "TEXT NULL"),
        ("BusinessSettings", "ScreenLanguage", "nvarchar(5) NOT NULL CONSTRAINT [DF_BusinessSettings_ScreenLanguage] DEFAULT N'sq'", "TEXT NOT NULL DEFAULT 'sq'"),
        ("BusinessSettings", "BusinessType", "nvarchar(20) NOT NULL CONSTRAINT [DF_BusinessSettings_BusinessType] DEFAULT N'restaurant'", "TEXT NOT NULL DEFAULT 'restaurant'"),
        ("PlaylistItems", "Badge", "nvarchar(100) NULL", "TEXT NULL"),
        ("PlaylistItems", "Price", "decimal(12,2) NULL", "TEXT NULL"),
        // Klientët: 0 / null = të dhëna të vjetra, i kalojnë klientit të parë (AssignLegacyDataAsync).
        ("BusinessSettings", "ClientId", "int NOT NULL CONSTRAINT [DF_BusinessSettings_ClientId] DEFAULT 0", "INTEGER NOT NULL DEFAULT 0"),
        ("Users", "ClientId", "int NULL", "INTEGER NULL"),
        // Bizneset e shumta: 0 / null = të dhëna të vjetra, i kalojnë biznesit të parë (AssignLegacyDataAsync).
        ("Screens", "BusinessId", "int NULL", "INTEGER NULL"),
        ("Playlists", "BusinessId", "int NOT NULL CONSTRAINT [DF_Playlists_BusinessId] DEFAULT 0", "INTEGER NOT NULL DEFAULT 0"),
        ("MediaAssets", "BusinessId", "int NOT NULL CONSTRAINT [DF_MediaAssets_BusinessId] DEFAULT 0", "INTEGER NOT NULL DEFAULT 0"),
        ("MenuCategories", "BusinessId", "int NOT NULL CONSTRAINT [DF_MenuCategories_BusinessId] DEFAULT 0", "INTEGER NOT NULL DEFAULT 0"),
        ("Currencies", "BusinessId", "int NOT NULL CONSTRAINT [DF_Currencies_BusinessId] DEFAULT 0", "INTEGER NOT NULL DEFAULT 0"),
        ("PaymentMethods", "BusinessId", "int NOT NULL CONSTRAINT [DF_PaymentMethods_BusinessId] DEFAULT 0", "INTEGER NOT NULL DEFAULT 0"),
    ];

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
            """),
        ("Clients",
            """
            CREATE TABLE [Clients] (
                [Id] int NOT NULL IDENTITY,
                [Name] nvarchar(150) NOT NULL,
                [ContactPerson] nvarchar(150) NULL,
                [Phone] nvarchar(50) NULL,
                [Email] nvarchar(150) NULL,
                [Notes] nvarchar(2000) NULL,
                [IsActive] bit NOT NULL,
                [CreatedAt] datetime2 NOT NULL,
                CONSTRAINT [PK_Clients] PRIMARY KEY ([Id])
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS "Clients" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_Clients" PRIMARY KEY AUTOINCREMENT,
                "Name" TEXT NOT NULL,
                "ContactPerson" TEXT NULL,
                "Phone" TEXT NULL,
                "Email" TEXT NULL,
                "Notes" TEXT NULL,
                "IsActive" INTEGER NOT NULL,
                "CreatedAt" TEXT NOT NULL
            );
            """),
        ("UserBusinesses",
            """
            CREATE TABLE [UserBusinesses] (
                [UserId] int NOT NULL,
                [BusinessId] int NOT NULL,
                CONSTRAINT [PK_UserBusinesses] PRIMARY KEY ([UserId], [BusinessId]),
                CONSTRAINT [FK_UserBusinesses_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE,
                CONSTRAINT [FK_UserBusinesses_BusinessSettings_BusinessId] FOREIGN KEY ([BusinessId]) REFERENCES [BusinessSettings] ([Id]) ON DELETE CASCADE
            );
            CREATE INDEX [IX_UserBusinesses_BusinessId] ON [UserBusinesses] ([BusinessId]);
            """,
            """
            CREATE TABLE IF NOT EXISTS "UserBusinesses" (
                "UserId" INTEGER NOT NULL,
                "BusinessId" INTEGER NOT NULL,
                CONSTRAINT "PK_UserBusinesses" PRIMARY KEY ("UserId", "BusinessId"),
                CONSTRAINT "FK_UserBusinesses_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_UserBusinesses_BusinessSettings_BusinessId" FOREIGN KEY ("BusinessId") REFERENCES "BusinessSettings" ("Id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IX_UserBusinesses_BusinessId" ON "UserBusinesses" ("BusinessId");
            """),
        ("UserScreens",
            """
            CREATE TABLE [UserScreens] (
                [UserId] int NOT NULL,
                [ScreenId] int NOT NULL,
                CONSTRAINT [PK_UserScreens] PRIMARY KEY ([UserId], [ScreenId]),
                CONSTRAINT [FK_UserScreens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE,
                CONSTRAINT [FK_UserScreens_Screens_ScreenId] FOREIGN KEY ([ScreenId]) REFERENCES [Screens] ([Id]) ON DELETE CASCADE
            );
            CREATE INDEX [IX_UserScreens_ScreenId] ON [UserScreens] ([ScreenId]);
            """,
            """
            CREATE TABLE IF NOT EXISTS "UserScreens" (
                "UserId" INTEGER NOT NULL,
                "ScreenId" INTEGER NOT NULL,
                CONSTRAINT "PK_UserScreens" PRIMARY KEY ("UserId", "ScreenId"),
                CONSTRAINT "FK_UserScreens_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_UserScreens_Screens_ScreenId" FOREIGN KEY ("ScreenId") REFERENCES "Screens" ("Id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IX_UserScreens_ScreenId" ON "UserScreens" ("ScreenId");
            """),
    ];
}
