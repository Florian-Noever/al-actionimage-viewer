using AL_ActionImage_Viewer.ImageInformationProvider.Utils;

namespace AL_ActionImage_Viewer.ImageInformationProvider;

internal class Program
{
    /// <summary>Entry point - delegates entirely to <see cref="BridgeWriteProvider.Write"/>.</summary>
    private static async Task Main()
        => await BridgeWriteProvider.Write();
}
