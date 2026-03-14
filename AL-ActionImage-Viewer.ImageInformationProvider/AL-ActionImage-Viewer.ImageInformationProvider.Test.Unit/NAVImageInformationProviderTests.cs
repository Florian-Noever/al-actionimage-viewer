using AL_ActionImage_Viewer.ImageInformationProvider.Utils;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Test.Unit;

/// <summary>
/// Tests for <see cref="NAVImageInformationProvider"/> that work naturally on any
/// machine where the AL Language extension is NOT installed (e.g. CI). These tests
/// exercise only the filesystem-discovery path - no reflection against real DLLs.
/// </summary>
public class NAVImageInformationProviderTests
{
    [Fact]
    public void IsALExtensionInstalled_ReturnsFalse_WhenDllMissing()
    {
        var installed = NAVImageInformationProvider.IsALExtensionInstalled();
        var dllExists = NAVImageInformationProvider.GetMicrosoftDynamicsNavCodeAnalysisDllPath() is not null;

        // The two helpers must agree
        Assert.Equal(dllExists, installed);
    }

    [Fact]
    public void GetAllImages_ReturnsEmptyDictionary_WhenDllNotPresent()
    {
        if (NAVImageInformationProvider.IsALExtensionInstalled())
            return; // AL extension present - test is not applicable

        var result = NAVImageInformationProvider.GetAllImages();

        Assert.NotNull(result);
        Assert.Empty(result);
    }
}
