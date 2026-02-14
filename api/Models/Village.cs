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

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
