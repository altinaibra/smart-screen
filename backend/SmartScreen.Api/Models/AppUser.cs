namespace SmartScreen.Api.Models;

public class AppUser
{
    /// <summary>Super admini sheh dhe menaxhon të gjitha bizneset dhe përdoruesit.</summary>
    public const string AdminRole = "Admin";
    /// <summary>Përdoruesi sheh vetëm bizneset/ekranet që i janë dhënë (UserBusiness / UserScreen).</summary>
    public const string UserRole = "User";

    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = AdminRole;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<UserBusiness> Businesses { get; set; } = [];
    public List<UserScreen> Screens { get; set; } = [];

    public bool IsAdmin => Role == AdminRole;
}
