namespace SmartScreen.Api.Services;

/// <summary>Dosja ku ruhen fotot dhe videot e ngarkuara (shërbehen në /uploads).</summary>
public class UploadStorage
{
    public string Root { get; }

    public UploadStorage(IConfiguration config, IWebHostEnvironment env)
    {
        var configured = config["Storage:UploadsPath"];
        Root = Path.GetFullPath(string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "uploads")
            : Path.Combine(env.ContentRootPath, configured));
        Directory.CreateDirectory(Root);
    }

    public string PathFor(string fileName) => Path.Combine(Root, Path.GetFileName(fileName));

    public void Delete(string fileName)
    {
        var path = PathFor(fileName);
        if (File.Exists(path)) File.Delete(path);
    }
}
