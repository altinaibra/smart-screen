/*
    Smart Screen – skripti i databazës për SQL Server
    -------------------------------------------------
    Hapeni në SQL Server Management Studio (SSMS) dhe shtypni Execute (F5).

    - Krijon databazën [Smartscreen] nëse nuk ekziston.
    - Krijon tabelat (të njëjta me modelin e Entity Framework në AppDbContext.cs).
    - Të dhënat fillestare (përdoruesi admin, cilësimet, menuja demo) i shton vetë aplikacioni në nisjen e parë.

    Ky skript nuk është i detyrueshëm: nëse databaza është bosh, aplikacioni i krijon tabelat vetë.
    Nëse ndryshon modeli (Entities.cs / AppDbContext.cs), ky skript duhet rigjeneruar.
*/

IF DB_ID(N'Smartscreen') IS NULL
    CREATE DATABASE [Smartscreen];
GO

USE [Smartscreen];
GO

-- Mos e ekzekuto dy herë: nëse tabelat ekzistojnë, ndalo pa ndryshuar asgjë.
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL
BEGIN
    RAISERROR (N'Tabelat e Smart Screen ekzistojnë tashmë në [Smartscreen]. Skripti u ndal.', 16, 1);
    SET NOEXEC ON;
END
GO

CREATE TABLE [MediaAssets] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(200) NOT NULL,
    [Type] nvarchar(20) NOT NULL,
    [FileName] nvarchar(200) NOT NULL,
    [ContentType] nvarchar(2000) NOT NULL,
    [SizeBytes] bigint NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_MediaAssets] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [MenuCategories] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [SortOrder] int NOT NULL,
    CONSTRAINT [PK_MenuCategories] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Playlists] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [Description] nvarchar(2000) NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Playlists] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Users] (
    [Id] int NOT NULL IDENTITY,
    [Username] nvarchar(100) NOT NULL,
    [PasswordHash] nvarchar(2000) NOT NULL,
    [Role] nvarchar(2000) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [BusinessSettings] (
    [Id] int NOT NULL IDENTITY,
    [BusinessName] nvarchar(2000) NOT NULL,
    [LogoAssetId] int NULL,
    [PrimaryColor] nvarchar(2000) NOT NULL,
    [AccentColor] nvarchar(2000) NOT NULL,
    [Currency] nvarchar(2000) NOT NULL,
    [ShowTicker] bit NOT NULL,
    [TickerText] nvarchar(2000) NULL,
    [ShowClock] bit NOT NULL,
    [TimeZoneId] nvarchar(2000) NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_BusinessSettings] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_BusinessSettings_MediaAssets_LogoAssetId] FOREIGN KEY ([LogoAssetId]) REFERENCES [MediaAssets] ([Id]) ON DELETE SET NULL
);
GO


CREATE TABLE [Products] (
    [Id] int NOT NULL IDENTITY,
    [CategoryId] int NOT NULL,
    [Name] nvarchar(150) NOT NULL,
    [Description] nvarchar(2000) NULL,
    [Price] decimal(12,2) NOT NULL,
    [OldPrice] decimal(12,2) NULL,
    [ImageAssetId] int NULL,
    [IsAvailable] bit NOT NULL,
    [IsFeatured] bit NOT NULL,
    [SortOrder] int NOT NULL,
    CONSTRAINT [PK_Products] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Products_MediaAssets_ImageAssetId] FOREIGN KEY ([ImageAssetId]) REFERENCES [MediaAssets] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Products_MenuCategories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [MenuCategories] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [PlaylistItems] (
    [Id] int NOT NULL IDENTITY,
    [PlaylistId] int NOT NULL,
    [SortOrder] int NOT NULL,
    [Type] nvarchar(20) NOT NULL,
    [DurationSeconds] int NOT NULL,
    [IsEnabled] bit NOT NULL,
    [Title] nvarchar(2000) NULL,
    [Text] nvarchar(2000) NULL,
    [Url] nvarchar(2000) NULL,
    [BackgroundColor] nvarchar(2000) NULL,
    [TextColor] nvarchar(2000) NULL,
    [Fit] nvarchar(20) NOT NULL,
    [MediaAssetId] int NULL,
    [MenuCategoryId] int NULL,
    CONSTRAINT [PK_PlaylistItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PlaylistItems_MediaAssets_MediaAssetId] FOREIGN KEY ([MediaAssetId]) REFERENCES [MediaAssets] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_PlaylistItems_MenuCategories_MenuCategoryId] FOREIGN KEY ([MenuCategoryId]) REFERENCES [MenuCategories] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_PlaylistItems_Playlists_PlaylistId] FOREIGN KEY ([PlaylistId]) REFERENCES [Playlists] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [Screens] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [Location] nvarchar(2000) NULL,
    [DeviceKey] nvarchar(64) NOT NULL,
    [PairingCode] nvarchar(10) NULL,
    [IsPaired] bit NOT NULL,
    [Platform] nvarchar(30) NOT NULL,
    [UserAgent] nvarchar(2000) NULL,
    [ResolutionWidth] int NOT NULL,
    [ResolutionHeight] int NOT NULL,
    [Orientation] nvarchar(20) NOT NULL,
    [DefaultPlaylistId] int NULL,
    [CommandVersion] int NOT NULL,
    [LastSeenAt] datetime2 NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Screens] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Screens_Playlists_DefaultPlaylistId] FOREIGN KEY ([DefaultPlaylistId]) REFERENCES [Playlists] ([Id])
);
GO


CREATE TABLE [ScreenSchedules] (
    [Id] int NOT NULL IDENTITY,
    [ScreenId] int NOT NULL,
    [PlaylistId] int NOT NULL,
    [DaysOfWeek] int NOT NULL,
    [StartTime] time NOT NULL,
    [EndTime] time NOT NULL,
    [Priority] int NOT NULL,
    CONSTRAINT [PK_ScreenSchedules] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ScreenSchedules_Playlists_PlaylistId] FOREIGN KEY ([PlaylistId]) REFERENCES [Playlists] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ScreenSchedules_Screens_ScreenId] FOREIGN KEY ([ScreenId]) REFERENCES [Screens] ([Id]) ON DELETE CASCADE
);
GO


CREATE INDEX [IX_BusinessSettings_LogoAssetId] ON [BusinessSettings] ([LogoAssetId]);
GO


CREATE INDEX [IX_PlaylistItems_MediaAssetId] ON [PlaylistItems] ([MediaAssetId]);
GO


CREATE INDEX [IX_PlaylistItems_MenuCategoryId] ON [PlaylistItems] ([MenuCategoryId]);
GO


CREATE INDEX [IX_PlaylistItems_PlaylistId] ON [PlaylistItems] ([PlaylistId]);
GO


CREATE INDEX [IX_Products_CategoryId] ON [Products] ([CategoryId]);
GO


CREATE INDEX [IX_Products_ImageAssetId] ON [Products] ([ImageAssetId]);
GO


CREATE INDEX [IX_Screens_DefaultPlaylistId] ON [Screens] ([DefaultPlaylistId]);
GO


CREATE UNIQUE INDEX [IX_Screens_DeviceKey] ON [Screens] ([DeviceKey]);
GO


CREATE INDEX [IX_Screens_PairingCode] ON [Screens] ([PairingCode]);
GO


CREATE INDEX [IX_ScreenSchedules_PlaylistId] ON [ScreenSchedules] ([PlaylistId]);
GO


CREATE INDEX [IX_ScreenSchedules_ScreenId] ON [ScreenSchedules] ([ScreenId]);
GO


CREATE UNIQUE INDEX [IX_Users_Username] ON [Users] ([Username]);
GO



SET NOEXEC OFF;
GO
