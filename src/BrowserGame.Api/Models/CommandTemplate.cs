using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class CommandTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    [Required, MaxLength(64)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string UnitType { get; set; } = "Spearman";

    public int UnitCount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
