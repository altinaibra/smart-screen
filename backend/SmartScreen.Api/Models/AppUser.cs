namespace SmartScreen.Api.Models;

public class AppUser
{
    /// <summary>Pronari i aplikacionit: sheh dhe menaxhon të gjithë klientët, bizneset dhe përdoruesit.</summary>
    public const string OwnerRole = "Owner";
    /// <summary>Administratori i një klienti: menaxhon bizneset dhe përdoruesit e klientit të vet.</summary>
    public const string AdminRole = "Admin";
    /// <summary>Përdoruesi sheh vetëm bizneset/ekranet që i janë dhënë (UserBusiness / UserScreen).</summary>
    public const string UserRole = "User";

    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = UserRole;
    /// <summary>Klienti i përdoruesit; null vetëm për pronarin (Owner).</summary>
    public int? ClientId { get; set; }
    public Client? Client { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<UserBusiness> Businesses { get; set; } = [];
    public List<UserScreen> Screens { get; set; } = [];

    public bool IsOwner => Role == OwnerRole;
    /// <summary>Menaxhon biznese dhe përdorues (pronari ose administratori i klientit).</summary>
    public bool IsAdmin => Role is OwnerRole or AdminRole;
}
