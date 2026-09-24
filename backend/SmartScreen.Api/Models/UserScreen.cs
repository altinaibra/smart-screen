namespace SmartScreen.Api.Models;

/// <summary>
/// Ekrane të veçanta që një përdorues mund t'i kontrollojë pa qasje të plotë në biznesin e tyre.
/// Përdoruesi sheh vetëm këto ekrane, playlistat dhe median e biznesit (për të vendosur reklamat).
/// </summary>
public class UserScreen
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public int ScreenId { get; set; }
    public Screen? Screen { get; set; }
}
