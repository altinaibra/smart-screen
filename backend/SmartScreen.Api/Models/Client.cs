namespace SmartScreen.Api.Models;

/// <summary>
/// Klienti që ka blerë aplikacionin. Çdo klient ka bizneset, përdoruesit, ekranet dhe të dhënat e veta
/// dhe nuk sheh asgjë nga klientët e tjerë. Pronari i aplikacionit (roli Owner) sheh të gjithë klientët.
/// </summary>
public class Client
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
    /// <summary>Klienti joaktiv (p.sh. pa pagesë): përdoruesit e tij nuk mund të hyjnë në panel.</summary>
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
