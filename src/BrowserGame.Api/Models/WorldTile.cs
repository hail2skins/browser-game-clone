using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class WorldTile
{
    public int Id { get; set; }

    public int X { get; set; }
    public int Y { get; set; }

    [Required, MaxLength(32)]
    public string Terrain { get; set; } = "plains";
}
