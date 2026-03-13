using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class FavoriteTarget
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid VillageId { get; set; }
    public Village? Village { get; set; }

    [MaxLength(64)]
    public string Label { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
