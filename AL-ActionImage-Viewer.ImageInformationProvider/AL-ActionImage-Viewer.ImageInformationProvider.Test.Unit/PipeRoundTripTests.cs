using System.IO.Pipes;
using AL_ActionImage_Viewer.ImageInformationProvider.Utils;
using AL_ActionImage_Viewer.ImageInformationProvider.Test.Unit.Helpers;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Test.Unit;

public class PipeRoundTripTests
{
    /// <summary>
    /// Writes all Bogus-generated image groups to an <see cref="AnonymousPipeServerStream"/>
    /// while simultaneously reading from the <see cref="AnonymousPipeClientStream"/>,
    /// then asserts every category and every image field arrives intact.
    /// </summary>
    [Fact]
    public async Task Write_ConcurrentAnonymousPipe_AllImagesArriveIntact()
    {
        var expected = TestDataGenerator.GenerateImageGroups();

        using var serverStream = new AnonymousPipeServerStream(PipeDirection.Out, HandleInheritability.None);
        using var clientStream = new AnonymousPipeClientStream(PipeDirection.In, serverStream.ClientSafePipeHandle);

        // Writer task - runs BridgeWriteProvider.WriteToStream on the pipe write end
        var writeTask = Task.Run(() =>
        {
            BridgeWriteProvider.WriteToStream(serverStream, expected);
            if (OperatingSystem.IsWindows())
                serverStream.WaitForPipeDrain();
            serverStream.Close(); // signal EOF to the reader
        });

        // Reader task - reads from the pipe read end using our BinaryPayloadReader
        var readTask = Task.Run(() => BinaryPayloadReader.Read(clientStream));

        await Task.WhenAll(writeTask, readTask);

        var actual = await readTask;

        // --- Assertions ---
        Assert.Equal(expected.Count, actual.Count);

        foreach (var (category, expectedItems) in expected)
        {
            Assert.True(actual.ContainsKey(category), $"Category '{category}' missing from pipe output.");

            var expectedList = expectedItems.ToList();
            var actualList = actual[category];

            Assert.Equal(expectedList.Count, actualList.Count);

            for (var i = 0; i < expectedList.Count; i++)
            {
                Assert.Equal(expectedList[i].Name, actualList[i].Name);
                Assert.Equal(expectedList[i].Category, actualList[i].Category);
                Assert.Equal(expectedList[i].ImageDataUrl, actualList[i].ImageDataUrl);
                Assert.Equal(expectedList[i].Tags, actualList[i].Tags);
            }
        }
    }
}
