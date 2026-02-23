using AL_ActionImage_Viewer.ImageInformationProvider.Utils;

namespace AL_ActionImage_Viewer.ImageInformationProvider;

internal class Program
{
    private static async Task Main()
        => await BridgeWriteProvider.Write();
}
