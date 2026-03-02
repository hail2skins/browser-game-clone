using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class UnitQueueItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid VillageId { get; set; }
    public Village? Village { get; set; }

    [Required, MaxLength(32)]
    public string UnitType { get; set; } = "spearman";

    public int Count { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime CompletesAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
