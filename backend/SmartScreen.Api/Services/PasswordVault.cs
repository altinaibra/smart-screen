using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Services;

/// <summary>
/// Vendos fjalëkalimin e përdoruesit: hash-i për hyrjen dhe, për përdoruesit e klientëve, një kopje e enkriptuar
/// që pronari ta shohë te "Klientët". Fjalëkalimi i pronarit nuk ruhet asnjëherë i lexueshëm.
/// </summary>
public class PasswordVault(IPasswordHasher<AppUser> hasher, IDataProtectionProvider protection)
{
    private readonly IDataProtector _protector = protection.CreateProtector("SmartScreen.ClientPasswords");

    public void Set(AppUser user, string password)
    {
        user.PasswordHash = hasher.HashPassword(user, password);
        user.PasswordEncrypted = user.IsOwner ? null : _protector.Protect(password);
    }

    /// <summary>Fjalëkalimi i lexueshëm; null nëse nuk dihet (vendosur para këtij versioni) ose çelësi ka humbur.</summary>
    public string? Reveal(AppUser user)
    {
        if (string.IsNullOrEmpty(user.PasswordEncrypted)) return null;
        try { return _protector.Unprotect(user.PasswordEncrypted); }
        catch (CryptographicException) { return null; }
    }
}
