using System.Text;
using api.Data;
using api.Game;
using api.Services;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

// Load .env file for local development
Env.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Build connection string from environment variables
var pgHost = Environment.GetEnvironmentVariable("PGHOST") ?? "localhost";
var pgPort = Environment.GetEnvironmentVariable("PGPORT") ?? "5432";
var pgDb = Environment.GetEnvironmentVariable("PGDATABASE") ?? "railway";
var pgUser = Environment.GetEnvironmentVariable("PGUSER") ?? "postgres";
var pgPassword = Environment.GetEnvironmentVariable("PGPASSWORD") ?? "postgres";

var connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPassword}";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<GameWorldService>();

var jwt = builder.Configuration.GetSection("Jwt");
var secret = jwt["Secret"] ?? "CHANGE_ME_SUPER_SECRET_KEY_32_CHARS_MIN";
var issuer = jwt["Issuer"] ?? "tribalwars-clone";
var audience = jwt["Audience"] ?? "tribalwars-clone-client";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("client", policy =>
        policy.WithOrigins(builder.Configuration["ClientUrl"] ?? "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Serve built frontend from client/dist at root
var possibleClientDistPaths = new[]
{
    Path.Combine(AppContext.BaseDirectory, "client", "dist"),
    Path.Combine(app.Environment.ContentRootPath, "client", "dist"),
    Path.Combine(Directory.GetCurrentDirectory(), "client", "dist"),
    Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "client", "dist")),
    Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "client", "dist"))
}.Distinct().ToArray();

Console.WriteLine($"ContentRootPath: {app.Environment.ContentRootPath}");
Console.WriteLine($"BaseDirectory: {AppContext.BaseDirectory}");
Console.WriteLine($"CurrentDirectory: {Directory.GetCurrentDirectory()}");

var clientDistPath = possibleClientDistPaths.FirstOrDefault(Directory.Exists);
foreach (var path in possibleClientDistPaths)
{
    Console.WriteLine($"Checking client/dist at: {path} (exists: {Directory.Exists(path)})");
}

if (clientDistPath is not null)
{
    Console.WriteLine($"Serving static files from: {clientDistPath}");
    var clientDistProvider = new PhysicalFileProvider(clientDistPath);

    app.UseFileServer(new FileServerOptions
    {
        FileProvider = clientDistProvider,
        RequestPath = "",
        EnableDefaultFiles = true
    });
}
else
{
    Console.WriteLine("WARNING: client/dist not found in any expected location.");
}

// Swagger in all environments
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("client");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// SPA fallback for client-side routes (preserve /api and /swagger)
if (clientDistPath is not null)
{
    app.MapFallback(async context =>
    {
        var path = context.Request.Path.Value ?? string.Empty;

        if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(Path.Combine(clientDistPath, "index.html"));
    });
}

// Retry database connection
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var maxRetries = 10;
    var retryDelay = TimeSpan.FromSeconds(2);
    
    for (int i = 0; i < maxRetries; i++)
    {
        try
        {
            db.Database.Migrate();
            break;
        }
        catch
        {
            if (i < maxRetries - 1) Thread.Sleep(retryDelay);
            else throw;
        }
    }
}

app.Run();
