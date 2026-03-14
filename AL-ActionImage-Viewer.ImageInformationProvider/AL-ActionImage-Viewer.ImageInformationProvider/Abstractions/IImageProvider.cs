using AL_ActionImage_Viewer.ImageInformationProvider.Data;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Abstractions;

/// <summary>
/// Abstraction over the image-loading mechanism so that production code
/// (reflection against the AL Language extension DLL) can be replaced with
/// a test double during unit testing.
/// </summary>
public interface IImageProvider
{
    /// <summary>
    /// Returns all discovered image groups keyed by category name.
    /// </summary>
    /// <returns>
    /// A dictionary whose keys are category names (e.g. <c>"ActionImages"</c>)
    /// and whose values are the images belonging to that category.
    /// </returns>
    Dictionary<string, IEnumerable<ImageInformationDTO>> GetAllImages();
}
