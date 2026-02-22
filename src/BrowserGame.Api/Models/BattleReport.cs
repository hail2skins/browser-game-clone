using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class BattleReport
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AttackerUserId { get; set; }
    public Guid DefenderUserId { get; set; }

    [Required, MaxLength(64)]
    public string AttackerVillageName { get; set; } = string.Empty;

    [Required, MaxLength(64)]
    public string DefenderVillageName { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string UnitType { get; set; } = "spearman";

    public int AttackerSent { get; set; }
    public int AttackerSurvivors { get; set; }
    public int DefenderSurvivors { get; set; }

    public int LootWood { get; set; }
    public int LootClay { get; set; }
    public int LootIron { get; set; }

    [Required, MaxLength(16)]
    public string Outcome { get; set; } = "draw";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
