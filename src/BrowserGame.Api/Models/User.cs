using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public bool IsApproved { get; set; } = false;

    public bool IsAdmin { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastLoginAt { get; set; }

    public ICollection<Village> Villages { get; set; } = new List<Village>();
}
