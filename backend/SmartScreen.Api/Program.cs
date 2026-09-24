using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SmartScreen.Api.Data;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------- Databaza (SQLite ose SQL Server) ----------
var provider = config["Database:Provider"] ?? "Sqlite";
builder.Services.AddDbContext<AppDbContext>(o =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        o.UseSqlServer(config.GetConnectionString("SqlServer"));
    else
        o.UseSqlite(ResolveSqlitePath(config.GetConnectionString("Sqlite"), builder.Environment.ContentRootPath));
});

// Rruga relative e SQLite lidhet me dosjen e aplikacionit (jo me dosjen aktuale të procesit),
// që databaza të mos përfundojë p.sh. në C:\Windows\System32 kur punon si shërbim/IIS.
static string ResolveSqlitePath(string? connectionString, string contentRoot)
{
    var csb = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(connectionString ?? "Data Source=smartscreen.db");
    if (!Path.IsPathRooted(csb.DataSource) && csb.DataSource != ":memory:")
        csb.DataSource = Path.Combine(contentRoot, csb.DataSource);
    return csb.ToString();
}

// ---------- Shërbimet ----------
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Smart Screen API",
        Version = "v1",
        Description = "API për menaxhimin e ekraneve (TV), medias, playlistave dhe menusë. " +
                      "Për endpoint-et e mbrojtura: POST /api/auth/login → kopjoni token-in → klikoni Authorize.",
    });
    var bearer = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Vendosni vetëm token-in (pa fjalën Bearer).",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
    };
    o.AddSecurityDefinition("Bearer", bearer);
    o.AddSecurityRequirement(new OpenApiSecurityRequirement { [bearer] = [] });
});
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<PlayerContentService>();
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

const long maxUpload = 1L * 1024 * 1024 * 1024;
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = maxUpload);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = maxUpload);
builder.Services.Configure<IISServerOptions>(o => o.MaxRequestBodySize = maxUpload);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = config["Jwt:Issuer"],
        ValidAudience = config["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!)),
    });
builder.Services.AddAuthorization();

// TV-të mund të hapin player-in nga një aplikacion lokal (file://), prandaj lejojmë çdo origjinë.
// Admini përdor token Bearer (jo cookie), kështu që kjo nuk rrezikon CSRF.
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("player-register", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

// ---------- Krijimi i databazës + të dhënat fillestare ----------
using (var scope = app.Services.CreateScope())
{
    var sp = scope.ServiceProvider;
    var db = sp.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(db, config, sp.GetRequiredService<IPasswordHasher<AppUser>>());
    await MediaStore.ImportLegacyFilesAsync(db, config, app.Environment, app.Logger);
}

// Swagger UI: http://localhost:5080/swagger
app.UseSwagger();
app.UseSwaggerUI(o =>
{
    o.SwaggerEndpoint("/swagger/v1/swagger.json", "Smart Screen API v1");
    o.DocumentTitle = "Smart Screen API";
});

app.UseCors();

// Frontend-i (React build) shërbehet direkt në rrënjë: http://localhost:5080/
var appRoot = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "app");
Directory.CreateDirectory(appRoot);
var appFiles = new StaticFileOptions { FileProvider = new PhysicalFileProvider(appRoot) };
app.UseStaticFiles(appFiles);

// Player-i për TV (/player) nga wwwroot/player, dhe aplikacionet për TV (/downloads).
// .apk / .ipk / .wgt nuk njihen nga ASP.NET, prandaj u shtojmë llojin që të mund të shkarkohen.
var contentTypes = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
contentTypes.Mappings[".apk"] = "application/vnd.android.package-archive";
contentTypes.Mappings[".ipk"] = "application/octet-stream";
contentTypes.Mappings[".wgt"] = "application/widget";
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypes,
    OnPrepareResponse = ctx =>
    {
        // Mos i ruaj në cache skedarët e player-it që TV-të të marrin versionin e ri pas rifreskimit.
        if (ctx.Context.Request.Path.StartsWithSegments("/player"))
            ctx.Context.Response.Headers.CacheControl = "no-cache";
    },
});

// Media e ngarkuar – lexohet nga databaza (MediaChunks). Emrat janë GUID, kështu që mund të ruhen
// në cache përgjithmonë. Range mbështetet që videot të luhen/kërcejnë pa u shkarkuar të gjitha.
app.MapMethods("/uploads/{fileName}", ["GET", "HEAD"], async (string fileName, AppDbContext db, HttpContext ctx) =>
{
    var media = await db.MediaAssets.AsNoTracking()
        .Where(m => m.FileName == fileName)
        .Select(m => new { m.Id, m.ContentType, m.SizeBytes, m.CreatedAt })
        .FirstOrDefaultAsync();
    if (media is null) return Results.NotFound();

    ctx.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
    return Results.File(
        new MediaChunkStream(db, media.Id, media.SizeBytes),
        media.ContentType,
        lastModified: media.CreatedAt,
        entityTag: new Microsoft.Net.Http.Headers.EntityTagHeaderValue($"\"{fileName}\""),
        enableRangeProcessing: true);
});

// Routing pas skedarëve statikë, që fallback-u i React të mos kapë /player/.
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

// Adresat e serverit në rrjetin lokal, që paneli të tregojë URL-në e saktë për TV-të
// (jo "localhost", që në TV nuk funksionon).
app.MapGet("/api/server-info", (HttpContext ctx) =>
    Results.Ok(new { addresses = ServerAddresses(ctx), port = ctx.Connection.LocalPort })).RequireAuthorization();

// Player-i për Windows (PC / mini-PC te TV-ja): një .cmd që hap player-in në ekran të plotë (kiosk)
// me Microsoft Edge dhe e shton vetveten te Startup, që të niset sa herë ndizet kompjuteri.
// "--unsafely-treat-insecure-origin-as-secure" lejon Service Worker-in (puna pa rrjet) edhe në http:// të rrjetit lokal.
app.MapGet("/downloads/smart-screen-player.cmd", (HttpContext ctx) =>
{
    var origin = ServerAddresses(ctx).FirstOrDefault() ?? $"http://localhost:{ctx.Connection.LocalPort}";
    var url = origin + "/player/";
    var script = string.Join("\r\n",
        "@echo off",
        "rem Smart Screen Player - hap player-in ne ekran te plote. Mbyllja: Alt+F4",
        $"set URL={url}",
        $"set ORIGIN={origin}",
        "set STARTUP=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\SmartScreenPlayer.cmd",
        "if /I not \"%~f0\"==\"%STARTUP%\" copy /Y \"%~f0\" \"%STARTUP%\" >nul",
        "start \"\" msedge --kiosk %URL% --edge-kiosk-type=fullscreen --no-first-run --autoplay-policy=no-user-gesture-required --unsafely-treat-insecure-origin-as-secure=%ORIGIN% --user-data-dir=\"%LOCALAPPDATA%\\SmartScreenPlayer\"",
        "");
    return Results.File(Encoding.ASCII.GetBytes(script), "application/octet-stream", "SmartScreenPlayer.cmd");
});

static List<string> ServerAddresses(HttpContext ctx)
{
    var port = ctx.Connection.LocalPort;
    // Përshtatësit me gateway (WiFi/Ethernet i vërtetë) para atyre virtualë (Hyper-V, WSL, VirtualBox).
    var addresses = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
        .Where(n => n.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up
                    && n.NetworkInterfaceType != System.Net.NetworkInformation.NetworkInterfaceType.Loopback)
        .Select(n => n.GetIPProperties())
        .OrderByDescending(p => p.GatewayAddresses.Any(g => !g.Address.Equals(System.Net.IPAddress.Any)))
        .SelectMany(p => p.UnicastAddresses)
        .Select(a => a.Address)
        .Where(a => a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork && !System.Net.IPAddress.IsLoopback(a)
                    && !a.ToString().StartsWith("169.254."))
        .Select(a => $"http://{a}:{port}")
        .Distinct()
        .ToList();

    // Nëse paneli është hapur me një adresë që nuk është localhost (p.sh. domen), vendose të parën.
    var host = ctx.Request.Host.Host;
    if (host is not ("localhost" or "127.0.0.1" or "[::1]") && (ctx.Request.Host.Port is null || ctx.Request.Host.Port == port))
    {
        var own = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
        addresses.Remove(own);
        addresses.Insert(0, own);
    }
    return addresses;
}

// Çdo rrugë tjetër (p.sh. /screens, /menu) -> index.html i React (routing në klient).
// Nëse frontend-i nuk është ndërtuar ende, jep një mesazh të qartë në vend të 404.
app.MapFallback(async ctx =>
{
    var path = ctx.Request.Path;
    if (path.StartsWithSegments("/api") || path.StartsWithSegments("/uploads") || path.StartsWithSegments("/player") || path.StartsWithSegments("/downloads") || path.StartsWithSegments("/swagger"))
    {
        ctx.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    var index = Path.Combine(appRoot, "index.html");
    if (File.Exists(index))
    {
        ctx.Response.ContentType = "text/html; charset=utf-8";
        ctx.Response.Headers.CacheControl = "no-cache";
        await ctx.Response.SendFileAsync(index);
    }
    else
    {
        ctx.Response.ContentType = "text/html; charset=utf-8";
        await ctx.Response.WriteAsync(
            "<h2>Frontend-i nuk është ndërtuar ende.</h2>" +
            "<p>Për zhvillim: <code>cd frontend &amp;&amp; npm run dev</code> dhe hapni <a href='http://localhost:5173'>http://localhost:5173</a></p>" +
            "<p>Ose ndërtojeni: <code>cd frontend &amp;&amp; npm run build</code> dhe rifreskoni këtë faqe.</p>" +
            "<p>Player-i për TV: <a href='/player/'>/player/</a></p>");
    }
});

app.Run();
