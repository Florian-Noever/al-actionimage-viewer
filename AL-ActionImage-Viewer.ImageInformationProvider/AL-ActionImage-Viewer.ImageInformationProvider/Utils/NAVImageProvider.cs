using AL_ActionImage_Viewer.ImageInformationProvider.Abstractions;
using AL_ActionImage_Viewer.ImageInformationProvider.Data;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Utils;

/// <summary>
/// Non-static adapter that implements <see cref="IImageProvider"/> by delegating
/// to the static <see cref="NAVImageInformationProvider"/>. Used as the default
/// production implementation inside <see cref="BridgeWriteProvider.Write"/>.
/// </summary>
public sealed class NAVImageProvider : IImageProvider
{
    private readonly string? _dllPath;

    /// <param name="dllPath">
    /// Optional explicit path to <c>Microsoft.Dynamics.Nav.CodeAnalysis.dll</c>.
    /// When <see langword="null"/> the path is resolved automatically from
    /// <c>~/.vscode/extensions/</c>.
    /// </param>
    public NAVImageProvider(string? dllPath = null)
    {
        _dllPath = dllPath;
    }

    /// <inheritdoc />
    public Dictionary<string, IEnumerable<ImageInformationDTO>> GetAllImages()
        => _dllPath is null
            ? NAVImageInformationProvider.GetAllImages()
            : NAVImageInformationProvider.GetAllImages(_dllPath);
}
