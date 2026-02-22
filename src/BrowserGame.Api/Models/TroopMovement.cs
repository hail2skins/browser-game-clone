using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class TroopMovement
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SourceVillageId { get; set; }
    public Village? SourceVillage { get; set; }

    public Guid TargetVillageId { get; set; }
    public Village? TargetVillage { get; set; }

    [Required, MaxLength(32)]
    public string UnitType { get; set; } = "spearman";

    public int UnitCount { get; set; }

    [Required, MaxLength(32)]
    public string Mission { get; set; } = "attack";

    [Required, MaxLength(32)]
    public string Status { get; set; } = "outbound";

    public int LootWood { get; set; }
    public int LootClay { get; set; }
    public int LootIron { get; set; }

    public DateTime DepartedAt { get; set; } = DateTime.UtcNow;
    public DateTime ArrivesAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
