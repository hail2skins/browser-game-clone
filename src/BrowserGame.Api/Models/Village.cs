using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Village
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    [Required, MaxLength(128)]
    public string Name { get; set; } = "New Village";

    [MaxLength(128)]
    public string LocationPlaceholder { get; set; } = "TBD";

    public int X { get; set; }
    public int Y { get; set; }

    public int Wood { get; set; } = 500;
    public int Clay { get; set; } = 500;
    public int Iron { get; set; } = 500;

    public int MainBuildingLevel { get; set; } = 1;
    public int TimberCampLevel { get; set; } = 1;
    public int ClayPitLevel { get; set; } = 1;
    public int IronMineLevel { get; set; } = 1;
    public int WarehouseLevel { get; set; } = 1;

    public DateTime LastResourceTickAt { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
