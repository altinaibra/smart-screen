namespace SmartScreen.Api.Models;

/// <summary>
/// Qasje e plotë e një përdoruesi në një biznes: ekranet, reklamat, menuja, cilësimet.
/// Një përdorues mund të ketë shumë biznese. Për qasje vetëm në disa ekrane shih <see cref="UserScreen"/>.
/// </summary>
public class UserBusiness
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public int BusinessId { get; set; }
    public BusinessSettings? Business { get; set; }
}
