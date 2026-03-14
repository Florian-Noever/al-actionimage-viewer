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
    /// <inheritdoc />
    public Dictionary<string, IEnumerable<ImageInformationDTO>> GetAllImages()
        => NAVImageInformationProvider.GetAllImages();
}
