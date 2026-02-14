using System.Text;
using api.Data;
using api.Services;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// Load .env file for local development (before building configuration)
Env.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Build connection string from Railway env vars or fall back to ConnectionStrings__DefaultConnection
string connectionString;

// Railway provides DATABASE_URL as postgres://user:pass@host:port/db format
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrEmpty(databaseUrl))
{
    // Parse postgres://user:password@host:port/database format
    try
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':');
        var user = userInfo[0];
        var password = userInfo.Length > 1 ? userInfo[1] : "";
        connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={user};Password={password};SSL Mode=Require;Trust Server Certificate=true";
    }
    catch
    {
        // If parsing fails, use as-is (might already be in Npgsql format)
        connectionString = databaseUrl;
    }
}
else
{
    // Build from individual Railway PostgreSQL env vars or local .env
    var pgHost = Environment.GetEnvironmentVariable("PGHOST") ?? "localhost";
    var pgPort = Environment.GetEnvironmentVariable("PGPORT") ?? "5432";
    var pgDb = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? Environment.GetEnvironmentVariable("PGDATABASE") ?? "hamco_dev";
    var pgUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? Environment.GetEnvironmentVariable("PGUSER") ?? "art";
    var pgPassword = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? Environment.GetEnvironmentVariable("PGPASSWORD") ?? "";
    
    connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPassword}";
}

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("client");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.Run();
