using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;
using static SmartScreen.Tests.TestApp;

namespace SmartScreen.Tests;

public class PlayerFlowTests
{
    [Fact]
    public async Task Tv_pairs_and_receives_playlist_with_clock()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        await CreateClientAsync(owner, "Acme");
        var playlistId = await CreatePlaylistAsync(owner, [TextSlide("Hello"), new { type = "Brand", durationSeconds = 5, isEnabled = true, fit = "Cover" }]);
        var key = await PairScreenAsync(owner, playlistId);

        var content = await owner.GetFromJsonAsync<JsonElement>($"/api/player/{key}/content", Json);
        Assert.True(content.GetProperty("paired").GetBoolean());
        Assert.Equal(2, content.GetProperty("playlist").GetProperty("slides").GetArrayLength());
        var clock = content.GetProperty("clock");
        Assert.InRange(clock.GetProperty("serverTime").GetInt64(), DateTimeOffset.UtcNow.AddMinutes(-1).ToUnixTimeMilliseconds(),
            DateTimeOffset.UtcNow.AddMinutes(1).ToUnixTimeMilliseconds());
        Assert.Equal(1, content.GetProperty("offline").GetProperty("playlists").GetArrayLength());
    }

    [Fact]
    public async Task Unknown_device_gets_404_so_player_re_registers()
    {
        using var app = new TestApp();
        var res = await app.CreateClient().GetAsync("/api/player/does-not-exist/content");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Version_changes_when_content_changes_but_not_with_clock()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        await CreateClientAsync(owner, "Acme");
        var playlistId = await CreatePlaylistAsync(owner, [TextSlide("One")]);
        var key = await PairScreenAsync(owner, playlistId);

        string Version(JsonElement c) => c.GetProperty("version").GetString()!;
        var first = Version(await owner.GetFromJsonAsync<JsonElement>($"/api/player/{key}/content", Json));
        await Task.Delay(20);
        var again = Version(await owner.GetFromJsonAsync<JsonElement>($"/api/player/{key}/content", Json));
        Assert.Equal(first, again);

        (await owner.PutAsJsonAsync($"/api/playlists/{playlistId}", new { name = "Main", items = new[] { TextSlide("Two") } }, Json)).EnsureSuccessStatusCode();
        var changed = Version(await owner.GetFromJsonAsync<JsonElement>($"/api/player/{key}/content", Json));
        Assert.NotEqual(first, changed);
    }

    [Fact]
    public async Task Expired_slides_are_dropped_and_future_ones_keep_their_dates()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        await CreateClientAsync(owner, "Acme");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var playlistId = await CreatePlaylistAsync(owner,
        [
            TextSlide("Always"),
            TextSlide("Expired", endDate: today.AddDays(-10).ToString("yyyy-MM-dd")),
            TextSlide("Future", startDate: today.AddDays(5).ToString("yyyy-MM-dd")),
        ]);
        var key = await PairScreenAsync(owner, playlistId);

        var slides = (await owner.GetFromJsonAsync<JsonElement>($"/api/player/{key}/content", Json))
            .GetProperty("playlist").GetProperty("slides").EnumerateArray().ToList();
        Assert.Equal(["Always", "Future"], slides.Select(s => s.GetProperty("title").GetString()));
        Assert.Equal(today.AddDays(5).ToString("yyyy-MM-dd"), slides[1].GetProperty("startDate").GetString());
    }

    [Fact]
    public async Task Slide_end_date_before_start_date_is_rejected()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        await CreateClientAsync(owner, "Acme");
        var res = await owner.PostAsJsonAsync("/api/playlists",
            new { name = "Bad", items = new[] { TextSlide("x", "2026-06-10", "2026-06-01") } }, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Emergency_alert_reaches_the_tv_and_can_be_removed()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        await CreateClientAsync(owner, "Acme");
        var key = await PairScreenAsync(owner, await CreatePlaylistAsync(owner, [TextSlide("Hi")]));

        (await owner.PutAsJsonAsync("/api/settings/alert", new { title = "Closed today", text = "Back tomorrow", color = "#112233", durationMinutes = 30 }))
            .EnsureSuccessStatusCode();
        var alert = (await owner.GetFromJsonAsync<JsonElement>($"/api/player/{key}/content", Json)).GetProperty("settings").GetProperty("alert");
        Assert.Equal("Closed today", alert.GetProperty("title").GetString());
        Assert.Equal("#112233", alert.GetProperty("color").GetString());
        Assert.True(alert.GetProperty("expiresAt").GetInt64() > DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        (await owner.DeleteAsync("/api/settings/alert")).EnsureSuccessStatusCode();
        var settings = (await owner.GetFromJsonAsync<JsonElement>($"/api/player/{key}/content", Json)).GetProperty("settings");
        Assert.Equal(JsonValueKind.Null, settings.GetProperty("alert").ValueKind);
    }

    [Fact]
    public async Task Empty_alert_is_rejected()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        await CreateClientAsync(owner, "Acme");
        var res = await owner.PutAsJsonAsync("/api/settings/alert", new { title = " ", text = "" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}

public class MultiTenantTests
{
    [Fact]
    public async Task Client_admin_cannot_see_or_touch_another_clients_data()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        var businessA = await CreateClientAsync(owner, "Client A", "admin-a");
        var playlistA = await CreatePlaylistAsync(owner, [TextSlide("A only")]);
        await CreateClientAsync(owner, "Client B", "admin-b");

        var adminB = app.CreateClient();
        await LoginAsync(adminB, "admin-b", "secret123");

        var playlists = await adminB.GetFromJsonAsync<JsonElement>("/api/playlists", Json);
        Assert.Equal(0, playlists.GetArrayLength());
        Assert.Equal(HttpStatusCode.NotFound, (await adminB.GetAsync($"/api/playlists/{playlistA}")).StatusCode);

        // Biznesi i klientit tjetër me header-in X-Business-Id → 403.
        adminB.DefaultRequestHeaders.Add("X-Business-Id", businessA.ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await adminB.GetAsync("/api/playlists")).StatusCode);

        // Klientët janë vetëm për pronarin.
        adminB.DefaultRequestHeaders.Remove("X-Business-Id");
        Assert.Equal(HttpStatusCode.Forbidden, (await adminB.GetAsync("/api/clients")).StatusCode);
    }

    [Fact]
    public async Task Inactive_client_cannot_log_in()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        await CreateClientAsync(owner, "Acme", "acme");
        var clientId = int.Parse(owner.DefaultRequestHeaders.GetValues("X-Client-Id").First());
        (await owner.PutAsJsonAsync($"/api/clients/{clientId}", new { name = "Acme", isActive = false })).EnsureSuccessStatusCode();

        var res = await app.CreateClient().PostAsJsonAsync("/api/auth/login", new { username = "acme", password = "secret123" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task User_with_one_screen_only_sees_that_screen()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        await CreateClientAsync(owner, "Acme");
        var playlistId = await CreatePlaylistAsync(owner, [TextSlide("Hi")]);
        await PairScreenAsync(owner, playlistId, "Kitchen");
        await PairScreenAsync(owner, playlistId, "Window");
        var screens = await owner.GetFromJsonAsync<JsonElement>("/api/screens", Json);
        var window = screens.EnumerateArray().First(s => s.GetProperty("name").GetString() == "Window").GetProperty("id").GetInt32();

        (await owner.PostAsJsonAsync("/api/users", new { username = "staff", password = "secret123", role = "User", businessIds = Array.Empty<int>(), screenIds = new[] { window } }))
            .EnsureSuccessStatusCode();
        var staff = app.CreateClient();
        await LoginAsync(staff, "staff", "secret123");

        var visible = await staff.GetFromJsonAsync<JsonElement>("/api/screens", Json);
        Assert.Equal(["Window"], visible.EnumerateArray().Select(s => s.GetProperty("name").GetString()));
        // Pa qasje të plotë: menuja dhe njoftimi urgjent nuk lejohen.
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.PostAsJsonAsync("/api/menu/categories", new { name = "X", sortOrder = 0 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.PutAsJsonAsync("/api/settings/alert", new { title = "X" })).StatusCode);
    }
}

public class SecurityTests
{
    [Fact]
    public async Task Login_is_rate_limited()
    {
        using var app = new TestApp();
        var http = app.CreateClient();
        HttpStatusCode last = 0;
        for (var i = 0; i < 12; i++)
            last = (await http.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "wrong" })).StatusCode;
        Assert.Equal(HttpStatusCode.TooManyRequests, last);
    }

    [Fact]
    public async Task Api_requires_a_token()
    {
        using var app = new TestApp();
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().GetAsync("/api/screens")).StatusCode);
    }

    [Fact]
    public async Task Invalid_time_zone_is_rejected()
    {
        using var app = new TestApp();
        var owner = await app.OwnerAsync();
        await CreateClientAsync(owner, "Acme");
        var settings = await owner.GetFromJsonAsync<JsonElement>("/api/settings", Json);
        var body = JsonSerializer.Deserialize<Dictionary<string, object?>>(settings.GetRawText(), Json)!;
        body["timeZoneId"] = "Mars/Olympus";
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PutAsJsonAsync("/api/settings", body, Json)).StatusCode);
    }
}

public class ScheduleTests
{
    private static ScreenSchedule At(string start, string end, int days = 0b1111111) =>
        new() { StartTime = TimeOnly.Parse(start), EndTime = TimeOnly.Parse(end), DaysOfWeek = days };

    [Theory]
    [InlineData("2026-10-05 08:00", true)]   // e hënë brenda
    [InlineData("2026-10-05 11:00", false)]  // fundi nuk përfshihet
    [InlineData("2026-10-05 06:59", false)]
    public void Daytime_schedule(string now, bool active) =>
        Assert.Equal(active, PlayerContentService.IsActive(At("07:00", "11:00"), DateTime.Parse(now)));

    [Fact]
    public void Overnight_schedule_belongs_to_the_previous_day()
    {
        var fridayOnly = At("22:00", "02:00", 1 << (int)DayOfWeek.Friday);
        Assert.True(PlayerContentService.IsActive(fridayOnly, DateTime.Parse("2026-10-09 23:00")));  // e premte
        Assert.True(PlayerContentService.IsActive(fridayOnly, DateTime.Parse("2026-10-10 01:30")));  // e shtunë pas mesnate
        Assert.False(PlayerContentService.IsActive(fridayOnly, DateTime.Parse("2026-10-11 01:30"))); // e diel pas mesnate
    }

    [Fact]
    public void Currency_token_is_replaced() =>
        Assert.Equal("Menu 6.50€", PlayerContentService.WithCurrency("Menu 6.50{valuta}", "€"));
}
