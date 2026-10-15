namespace SmartScreen.Api.Models;

/// <summary>Vlera të fshehta të serverit që duhet të ruhen bashkë me databazën (p.sh. çelësi i fjalëkalimeve).</summary>
public class AppSecret
{
    public string Name { get; set; } = "";
    public string Value { get; set; } = "";
}
