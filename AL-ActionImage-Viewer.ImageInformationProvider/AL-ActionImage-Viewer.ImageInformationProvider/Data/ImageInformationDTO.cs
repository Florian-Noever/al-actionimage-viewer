namespace AL_ActionImage_Viewer.ImageInformationProvider.Data;

/// <summary>
/// Represents a single action image together with its metadata as transferred
/// through the binary wire protocol and consumed by the VS Code extension.
/// </summary>
public sealed class ImageInformationDTO
{
    /// <summary>The unique identifier / display name of the image (e.g. <c>"Add"</c>).</summary>
    public string? Name { get; set; }

    /// <summary>The category the image belongs to (e.g. <c>"ActionImages"</c>).</summary>
    public string? Category { get; set; }

    /// <summary>Optional search tags associated with the image.</summary>
    public string[] Tags { get; set; } = [];

    /// <summary>
    /// The image encoded as a data-URL, e.g. <c>"data:image/png;base64,…"</c>.
    /// </summary>
    public string? ImageDataUrl { get; set; }

    /// <inheritdoc />
    public override string ToString() => $"{Name} ({Category})";
}
