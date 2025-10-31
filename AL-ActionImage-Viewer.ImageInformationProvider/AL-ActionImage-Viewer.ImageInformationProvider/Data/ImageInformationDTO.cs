namespace AL_ActionImage_Viewer.ImageInformationProvider.Data;

public sealed class ImageInformationDTO
{
    public string? Name { get; set; }
    public string? Category { get; set; }
    public string[] Tags { get; set; } = [];
    public string? ImageDataUrl { get; set; }

    public override string ToString() => $"{Name} ({Category})";
}
