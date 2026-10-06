using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace SmartScreen.Tests;

/// <summary>
/// Serveri i vërtetë (Program.cs) me një databazë SQLite të përkohshme për çdo test.
/// </summary>
public sealed class TestApp : WebApplicationFactory<Program>
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"smartscreen-test-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("ConnectionStrings:Sqlite", $"Data Source={_dbPath}");
        builder.UseSetting("Jwt:Key", "test-key-test-key-test-key-test-key-1234567890");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        try { File.Delete(_dbPath); } catch (IOException) { /* ignore */ }
    }

    /// <summary>Klient i kyçur si pronari (admin / Admin123!).</summary>
    public async Task<HttpClient> OwnerAsync()
    {
        var http = CreateClient();
        await LoginAsync(http, "admin", "Admin123!");
        return http;
    }

    public static async Task LoginAsync(HttpClient http, string username, string password)
    {
        var res = await http.PostAsJsonAsync("/api/auth/login", new { username, password });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("token").GetString());
    }

    /// <summary>Krijon një klient me biznesin e parë dhe hyn në të si pronari. Kthen id-në e biznesit.</summary>
    public static async Task<int> CreateClientAsync(HttpClient owner, string name, string adminUser = "client-admin")
    {
        var res = await owner.PostAsJsonAsync("/api/clients", new
        {
            name, businessName = name + " Business", businessType = "restaurant", adminUsername = adminUser, adminPassword = "secret123",
        });
        res.EnsureSuccessStatusCode();
        var client = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        owner.DefaultRequestHeaders.Remove("X-Client-Id");
        owner.DefaultRequestHeaders.Add("X-Client-Id", client.GetProperty("id").GetInt32().ToString());

        var me = await owner.GetFromJsonAsync<JsonElement>("/api/auth/me", Json);
        var businessId = me.GetProperty("businesses")[0].GetProperty("id").GetInt32();
        owner.DefaultRequestHeaders.Remove("X-Business-Id");
        owner.DefaultRequestHeaders.Add("X-Business-Id", businessId.ToString());
        return businessId;
    }

    /// <summary>Regjistron një TV (si player-i) dhe e çifton me biznesin aktual. Kthen deviceKey.</summary>
    public static async Task<string> PairScreenAsync(HttpClient admin, int? playlistId, string name = "TV")
    {
        using var tv = new HttpClient { BaseAddress = admin.BaseAddress };
        var reg = await (await admin.PostAsJsonAsync("/api/player/register", new { width = 1920, height = 1080, userAgent = "Tizen" }))
            .Content.ReadFromJsonAsync<JsonElement>(Json);
        var pair = await admin.PostAsJsonAsync("/api/screens/pair", new
        {
            pairingCode = reg.GetProperty("pairingCode").GetString(), name, defaultPlaylistId = playlistId,
        });
        pair.EnsureSuccessStatusCode();
        return reg.GetProperty("deviceKey").GetString()!;
    }

    public static async Task<int> CreatePlaylistAsync(HttpClient admin, object[] items, string name = "Main")
    {
        var res = await admin.PostAsJsonAsync("/api/playlists", new { name, items }, Json);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetInt32();
    }

    public static object TextSlide(string title, string? startDate = null, string? endDate = null) => new
    {
        type = "Text", durationSeconds = 5, isEnabled = true, title, fit = "Cover", startDate, endDate,
    };
}
