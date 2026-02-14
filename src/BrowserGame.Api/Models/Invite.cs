using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Invite
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(64)]
    public string Code { get; set; } = string.Empty;

    public Guid CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public Guid? UsedByUserId { get; set; }
    public User? UsedByUser { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ExpiresAt { get; set; }

    public bool IsRevoked { get; set; } = false;

    public bool IsUsed => UsedByUserId.HasValue;
}
