using api.Data;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Game;

public class CommandTemplateService(AppDbContext db)
{
    public async Task<List<CommandTemplate>> GetTemplatesAsync(Guid userId)
    {
        return await db.CommandTemplates
            .Where(template => template.UserId == userId)
            .OrderByDescending(template => template.UpdatedAt)
            .ToListAsync();
    }

    public async Task<List<CommandTemplate>> SaveTemplateAsync(
        Guid userId,
        string name,
        string unitType,
        int unitCount,
        DateTime nowUtc,
        int maxTemplates = 6)
    {
        var normalizedName = name.Trim();
        var existing = await db.CommandTemplates
            .FirstOrDefaultAsync(template => template.UserId == userId && template.Name == normalizedName);

        if (existing is null)
        {
            existing = new CommandTemplate
            {
                UserId = userId,
                Name = normalizedName,
                CreatedAt = nowUtc
            };
            db.CommandTemplates.Add(existing);
        }

        existing.UnitType = unitType;
        existing.UnitCount = unitCount;
        existing.UpdatedAt = nowUtc;

        await db.SaveChangesAsync();

        var templates = await db.CommandTemplates
            .Where(template => template.UserId == userId)
            .OrderByDescending(template => template.UpdatedAt)
            .ToListAsync();

        foreach (var extra in templates.Skip(Math.Max(1, maxTemplates)))
        {
            db.CommandTemplates.Remove(extra);
        }

        if (templates.Count > maxTemplates)
        {
            await db.SaveChangesAsync();
            templates = templates.Take(maxTemplates).ToList();
        }

        return templates;
    }

    public async Task<bool> DeleteTemplateAsync(Guid userId, Guid templateId)
    {
        var template = await db.CommandTemplates
            .FirstOrDefaultAsync(entry => entry.Id == templateId && entry.UserId == userId);

        if (template is null)
        {
            return false;
        }

        db.CommandTemplates.Remove(template);
        await db.SaveChangesAsync();
        return true;
    }
}
