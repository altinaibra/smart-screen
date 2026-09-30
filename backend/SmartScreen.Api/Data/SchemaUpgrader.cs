using System.Data.Common;
using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace SmartScreen.Api.Data;

/// <summary>
/// Projekti përdor EnsureCreated (pa migrime), i cili nuk prek një databazë ekzistuese.
/// Kjo klasë shton tabelat dhe kolonat e reja të modelit që mungojnë në databazë,
/// që përditësimet të mos kërkojnë fshirjen e databazës.
/// </summary>
public static partial class SchemaUpgrader
{
    public static async Task UpgradeAsync(AppDbContext db)
    {
        var sqlServer = db.Database.IsSqlServer();
        var conn = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync();
        try
        {
            var statements = SplitScript(db.Database.GenerateCreateScript(), sqlServer);

            foreach (var entity in db.Model.GetEntityTypes())
            {
                var table = entity.GetTableName();
                if (table is null) continue;

                var columns = await GetColumnsAsync(conn, table, sqlServer);
                if (columns.Count == 0)
                {
                    // Tabela mungon: krijo atë dhe indekset e saj me DDL-në që gjeneron vetë EF.
                    foreach (var sql in statements.Where(s => IsForTable(s, table)))
                        await db.Database.ExecuteSqlRawAsync(sql);
                    continue;
                }

                var sample = entity.ClrType.IsAbstract ? null : Activator.CreateInstance(entity.ClrType);
                var storeId = Microsoft.EntityFrameworkCore.Metadata.StoreObjectIdentifier.Table(table, entity.GetSchema());
                foreach (var prop in entity.GetProperties())
                {
                    var column = prop.GetColumnName(storeId);
                    if (column is null || columns.Contains(column)) continue;

                    var type = prop.GetColumnType();
                    var value = prop.PropertyInfo is { } pi && sample is not null ? pi.GetValue(sample) : null;
                    var nullable = prop.IsNullable ? "NULL" : "NOT NULL";
                    var def = value is null ? (prop.IsNullable ? "" : " DEFAULT " + Literal(DefaultFor(prop.ClrType))) : " DEFAULT " + Literal(value);
                    var q = (string n) => sqlServer ? $"[{n}]" : $"\"{n}\"";
                    await db.Database.ExecuteSqlRawAsync($"ALTER TABLE {q(table)} ADD {q(column)} {type} {nullable}{def}");
                }
            }
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    private static List<string> SplitScript(string script, bool sqlServer)
    {
        var parts = sqlServer ? GoSeparator().Split(script) : SemicolonSeparator().Split(script);
        return parts.Select(p => p.Trim()).Where(p => p.Length > 0).ToList();
    }

    private static bool IsForTable(string sql, string table) =>
        Regex.IsMatch(sql, $@"^CREATE\s+TABLE\s+[\[""]{Regex.Escape(table)}[\]""]", RegexOptions.IgnoreCase) ||
        Regex.IsMatch(sql, $@"^CREATE\s+(UNIQUE\s+)?INDEX\s+.*\s+ON\s+[\[""]{Regex.Escape(table)}[\]""]", RegexOptions.IgnoreCase | RegexOptions.Singleline);

    private static async Task<HashSet<string>> GetColumnsAsync(DbConnection conn, string table, bool sqlServer)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sqlServer
            ? "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @t"
            : "SELECT name FROM pragma_table_info(@t)";
        var p = cmd.CreateParameter();
        p.ParameterName = "@t";
        p.Value = table;
        cmd.Parameters.Add(p);

        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) result.Add(reader.GetString(0));
        return result;
    }

    private static object DefaultFor(Type t)
    {
        t = Nullable.GetUnderlyingType(t) ?? t;
        if (t == typeof(string)) return "";
        if (t == typeof(DateTime)) return DateTime.UtcNow;
        return t.IsValueType ? Activator.CreateInstance(t)! : "";
    }

    private static string Literal(object value) => value switch
    {
        string s => "'" + s.Replace("'", "''") + "'",
        bool b => b ? "1" : "0",
        DateTime d => "'" + d.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) + "'",
        Enum e => "'" + e + "'",
        IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
        _ => "'" + value + "'",
    };

    [GeneratedRegex(@"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex GoSeparator();

    [GeneratedRegex(@";\s*(\r?\n|$)")]
    private static partial Regex SemicolonSeparator();
}
