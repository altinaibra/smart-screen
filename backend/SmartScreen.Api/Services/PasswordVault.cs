using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Models;

namespace SmartScreen.Api.Services;

/// <summary>
/// Vendos fjalëkalimin e përdoruesit: hash-i për hyrjen dhe, për përdoruesit e klientëve, një kopje e enkriptuar
/// që pronari ta shohë te "Klientët". Çelësi ruhet në databazë (tabela AppSecrets), që fjalëkalimet të mbeten
/// të lexueshme pas rinisjes, ripublikimit ose zhvendosjes së serverit. Fjalëkalimi i pronarit nuk ruhet i lexueshëm.
/// </summary>
public class PasswordVault(AppDbContext db, IPasswordHasher<AppUser> hasher, IDataProtectionProvider protection)
{
    private const string KeyName = "PasswordKey";
    private const string Prefix = "v2:";
    private const int NonceSize = 12, TagSize = 16;

    public void Set(AppUser user, string password)
    {
        user.PasswordHash = hasher.HashPassword(user, password);
        user.PasswordEncrypted = user.IsOwner ? null : Encrypt(password);
    }

    /// <summary>Fjalëkalimi i lexueshëm; null nëse nuk dihet (vendosur para këtij versioni ose me çelës të humbur).</summary>
    public string? Reveal(AppUser user)
    {
        var value = user.PasswordEncrypted;
        if (string.IsNullOrEmpty(value)) return null;
        try
        {
            if (!value.StartsWith(Prefix, StringComparison.Ordinal))
                // Versioni i mëparshëm: çelësat e Data Protection te dosja "keys" (nëse ekzistojnë ende).
                return protection.CreateProtector("SmartScreen.ClientPasswords").Unprotect(value);

            var data = Convert.FromBase64String(value[Prefix.Length..]);
            var nonce = data.AsSpan(0, NonceSize);
            var tag = data.AsSpan(NonceSize, TagSize);
            var cipher = data.AsSpan(NonceSize + TagSize);
            var plain = new byte[cipher.Length];
            using var aes = new AesGcm(Key(), TagSize);
            aes.Decrypt(nonce, cipher, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }
        catch (Exception e) when (e is CryptographicException or FormatException)
        {
            return null;
        }
    }

    private string Encrypt(string password)
    {
        var plain = Encoding.UTF8.GetBytes(password);
        var data = new byte[NonceSize + TagSize + plain.Length];
        var nonce = data.AsSpan(0, NonceSize);
        RandomNumberGenerator.Fill(nonce);
        using var aes = new AesGcm(Key(), TagSize);
        aes.Encrypt(nonce, plain, data.AsSpan(NonceSize + TagSize), data.AsSpan(NonceSize, TagSize));
        return Prefix + Convert.ToBase64String(data);
    }

    private byte[]? _key;

    /// <summary>Çelësi AES (256 bit) nga databaza; krijohet herën e parë.</summary>
    private byte[] Key()
    {
        if (_key is not null) return _key;
        var stored = db.AppSecrets.AsNoTracking().Where(s => s.Name == KeyName).Select(s => s.Value).FirstOrDefault();
        if (stored is null)
        {
            stored = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            db.Database.ExecuteSql($"INSERT INTO AppSecrets (Name, Value) VALUES ({KeyName}, {stored})");
        }
        return _key = Convert.FromBase64String(stored);
    }
}
