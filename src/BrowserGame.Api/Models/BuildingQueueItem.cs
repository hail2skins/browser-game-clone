using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class BuildingQueueItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid VillageId { get; set; }
    public Village? Village { get; set; }

    [Required, MaxLength(32)]
    public string BuildingType { get; set; } = "MainBuilding";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime CompletesAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
