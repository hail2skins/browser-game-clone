using System.Text;
using api.Data;
using api.Services;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// Load .env file for local development (Railway has env vars built-in)
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

Console.WriteLine($"Connecting to: {pgHost}:{pgPort}/{pgDb}");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<JwtService>();

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

// Enable Swagger in all environments (useful for API testing)
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("client");
app.UseAuthentication();
app.UseAuthorization();

// API routes
app.MapControllers();

// Serve static files from client/dist (the Fantasy UI)
// Try multiple paths for different environments (dev vs published)
var possiblePaths = new[]
{
    Path.Combine(app.Environment.ContentRootPath, "..", "..", "client", "dist"), // Published: /app/src/BrowserGame.Api/../../client/dist
    Path.Combine(app.Environment.ContentRootPath, "..", "client", "dist"),       // Dev: repo_root/client/dist
    Path.Combine(app.Environment.ContentRootPath, "client", "dist"),             // Alternative: content_root/client/dist
};

var clientDistPath = possiblePaths.FirstOrDefault(Directory.Exists);

if (clientDistPath != null)
{
    Console.WriteLine($"Serving static files from: {clientDistPath}");
    app.UseDefaultFiles();
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(clientDistPath),
        RequestPath = ""
    });
    
    // Fallback to index.html for SPA routing
    app.MapFallbackToFile("index.html", new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(clientDistPath)
    });
}
else
{
    Console.WriteLine("Warning: client/dist not found. API mode only.");
}

// Retry database connection with delay for Railway service startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var maxRetries = 10;
    var retryDelay = TimeSpan.FromSeconds(2);
    
    for (int i = 0; i < maxRetries; i++)
    {
        try
        {
            Console.WriteLine($"Database connection attempt {i + 1}/{maxRetries}...");
            db.Database.Migrate();
            Console.WriteLine("Database connected successfully!");
            break;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed: {ex.Message}");
            if (i < maxRetries - 1)
            {
                Thread.Sleep(retryDelay);
            }
            else
            {
                throw;
            }
        }
    }
}

app.Run();
