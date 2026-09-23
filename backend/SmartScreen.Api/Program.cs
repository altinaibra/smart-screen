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
        o.UseSqlite(config.GetConnectionString("Sqlite"));
});

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
builder.Services.AddSingleton<UploadStorage>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<PlayerContentService>();
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

const long maxUpload = 1L * 1024 * 1024 * 1024;
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = maxUpload);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = maxUpload);

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
    await DbSeeder.SeedAsync(sp.GetRequiredService<AppDbContext>(), config, sp.GetRequiredService<IPasswordHasher<AppUser>>());
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

// Player-i për TV (/player) nga wwwroot/player
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Mos i ruaj në cache skedarët e player-it që TV-të të marrin versionin e ri pas rifreskimit.
        if (ctx.Context.Request.Path.StartsWithSegments("/player"))
            ctx.Context.Response.Headers.CacheControl = "no-cache";
    },
});

// Media e ngarkuar – emrat janë GUID, kështu që mund të ruhen në cache përgjithmonë.
var storage = app.Services.GetRequiredService<UploadStorage>();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(storage.Root),
    RequestPath = "/uploads",
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable",
});

// Routing pas skedarëve statikë, që fallback-u i React të mos kapë /player/ ose /uploads.
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

// Çdo rrugë tjetër (p.sh. /screens, /menu) -> index.html i React (routing në klient).
// Nëse frontend-i nuk është ndërtuar ende, jep një mesazh të qartë në vend të 404.
app.MapFallback(async ctx =>
{
    var path = ctx.Request.Path;
    if (path.StartsWithSegments("/api") || path.StartsWithSegments("/uploads") || path.StartsWithSegments("/player") || path.StartsWithSegments("/swagger"))
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
