namespace SmartScreen.Api.Dtos;

public class UploadMediaForm
{
    public IFormFile? File { get; set; }
    public string? Name { get; set; }
}
