using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Data;

/// <summary>
/// Krijon databazën dhe e mbush vetëm herën e parë (tabela bosh) nga Data/Seed/seed.json.
/// Pas kësaj, të gjitha të dhënat (biznesi, gjuhët, tekstet e TV-së, menuja, playlistat)
/// krijohen dhe ndryshohen nga admini dhe ruhen në databazë.
/// </summary>
public static class DbSeeder
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static async Task SeedAsync(AppDbContext db, IConfiguration config, IPasswordHasher<AppUser> hasher)
    {
        await db.Database.EnsureCreatedAsync();
        await SchemaUpgrader.UpgradeAsync(db);

        if (!await db.Users.AnyAsync())
        {
            var user = new AppUser { Username = config["Admin:Username"] ?? "admin" };
            user.PasswordHash = hasher.HashPassword(user, config["Admin:Password"] ?? "Admin123!");
            db.Users.Add(user);
        }

        var seed = LoadSeed();

        if (!await db.Languages.AnyAsync() && seed?.Languages is { Count: > 0 } languages)
        {
            var order = 0;
            foreach (var l in languages)
            {
                db.Languages.Add(new Language
                {
                    Code = l.Code, Name = l.Name, SortOrder = order++,
                    Texts = l.Texts.Select(t => new UiText { Key = t.Key, Value = t.Value }).ToList(),
                });
            }
            await db.SaveChangesAsync();
        }

        var settings = await db.BusinessSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            var s = seed?.Settings;
            settings = new BusinessSettings
            {
                BusinessName = s?.BusinessName ?? "",
                Tagline = s?.Tagline,
                Currency = s?.Currency ?? "",
                TimeZoneId = s?.TimeZoneId ?? TimeZoneInfo.Local.Id,
            };
            db.BusinessSettings.Add(settings);
        }
        if (settings.LanguageId is null)
        {
            var code = seed?.Settings?.Language;
            settings.LanguageId = await db.Languages.OrderBy(l => l.Code == code ? 0 : 1).ThenBy(l => l.SortOrder)
                .Select(l => (int?)l.Id).FirstOrDefaultAsync();
        }

        await db.SaveChangesAsync();
    }

    private static SeedFile? LoadSeed()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "Seed", "seed.json");
        if (!File.Exists(path)) return null;
        return JsonSerializer.Deserialize<SeedFile>(File.ReadAllText(path), Json);
    }

    private record SeedFile(SeedSettings? Settings, List<SeedLanguage>? Languages);
    private record SeedSettings(string? BusinessName, string? Tagline, string? Currency, string? TimeZoneId, string? Language);
    private record SeedLanguage(string Code, string Name, Dictionary<string, string> Texts);
}
