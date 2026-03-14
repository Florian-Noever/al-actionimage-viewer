using AL_ActionImage_Viewer.ImageInformationProvider.Abstractions;
using AL_ActionImage_Viewer.ImageInformationProvider.Data;
using AL_ActionImage_Viewer.ImageInformationProvider.Test.Unit.Helpers;
using AL_ActionImage_Viewer.ImageInformationProvider.Utils;

using Moq;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Test.Unit;

public class BridgeWriteProviderTests
{
    // -------------------------------------------------------------------------
    // Happy path
    // -------------------------------------------------------------------------

    [Fact]
    public void WriteToStream_HappyPath_AllGroupsAndItemsWrittenCorrectly()
    {
        var expected = TestDataGenerator.GenerateImageGroups();

        using var ms = new MemoryStream();
        BridgeWriteProvider.WriteToStream(ms, expected);

        ms.Seek(0, SeekOrigin.Begin);
        var actual = BinaryPayloadReader.Read(ms);

        Assert.Equal(expected.Count, actual.Count);

        foreach (var (category, expectedItems) in expected)
        {
            Assert.True(actual.ContainsKey(category), $"Category '{category}' missing from output.");
            var actualItems = actual[category];
            var expectedList = expectedItems.ToList();

            Assert.Equal(expectedList.Count, actualItems.Count);

            for (var i = 0; i < expectedList.Count; i++)
            {
                Assert.Equal(expectedList[i].Name, actualItems[i].Name);
                Assert.Equal(expectedList[i].Category, actualItems[i].Category);
                Assert.Equal(expectedList[i].ImageDataUrl, actualItems[i].ImageDataUrl);
                Assert.Equal(expectedList[i].Tags, actualItems[i].Tags);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Streaming path (IEnumerable that is NOT ICollection)
    // -------------------------------------------------------------------------

    [Fact]
    public void WriteToStream_StreamingPath_WritesSentinelCorrectly()
    {
        // Wrap values in a bare IEnumerable so BridgeWriteProvider takes the streaming branch
        var source = TestDataGenerator.GenerateImageGroups();
        var streamingDict = source.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.Select(x => x)); // Select returns IEnumerable<T>, not ICollection<T>

        using var ms = new MemoryStream();
        BridgeWriteProvider.WriteToStream(ms, streamingDict);

        ms.Seek(0, SeekOrigin.Begin);
        var actual = BinaryPayloadReader.Read(ms);

        // Data must round-trip identically regardless of the streaming/collection path
        Assert.Equal(source.Count, actual.Count);
        foreach (var (category, expectedItems) in source)
        {
            Assert.True(actual.ContainsKey(category));
            Assert.Equal(expectedItems.Count(), actual[category].Count);
        }
    }

    // -------------------------------------------------------------------------
    // Empty dictionary
    // -------------------------------------------------------------------------

    [Fact]
    public void WriteToStream_EmptyDictionary_WritesGroupCountZero()
    {
        using var ms = new MemoryStream();
        BridgeWriteProvider.WriteToStream(ms, []);

        ms.Seek(0, SeekOrigin.Begin);
        using var br = new System.IO.BinaryReader(ms);
        var groupCount = br.ReadInt32();

        Assert.Equal(0, groupCount);
        Assert.Equal(ms.Length, ms.Position); // nothing more written
    }

    // -------------------------------------------------------------------------
    // Null string fields
    // -------------------------------------------------------------------------

    [Fact]
    public void WriteToStream_NullStringFields_WritesNegativeOneLength()
    {
        var dict = new Dictionary<string, IEnumerable<ImageInformationDTO>>
        {
            ["TestCategory"] =
            [
                new() { Name = null, Category = "TestCategory", Tags = [], ImageDataUrl = null },
            ]
        };

        using var ms = new MemoryStream();
        BridgeWriteProvider.WriteToStream(ms, dict);

        ms.Seek(0, SeekOrigin.Begin);
        var actual = BinaryPayloadReader.Read(ms);

        Assert.Single(actual["TestCategory"]);
        var item = actual["TestCategory"][0];
        Assert.Null(item.Name);
        Assert.Null(item.ImageDataUrl);
    }

    // -------------------------------------------------------------------------
    // Broken stream
    // -------------------------------------------------------------------------

    [Fact]
    public void WriteToStream_BrokenStream_ThrowsIOException()
    {
        var dict = TestDataGenerator.GenerateImageGroups(imagesPerCategory: 1);

        using var broken = new ThrowingStream();
        var ex = Assert.Throws<IOException>(() =>
            BridgeWriteProvider.WriteToStream(broken, dict));

        Assert.Equal("Simulated broken pipe.", ex.Message);
    }

    // -------------------------------------------------------------------------
    // Provider throws - Write() outer catch must not re-throw
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Write_DataProviderThrows_CompletesWithoutPropagatingException()
    {
        var mockProvider = new Mock<IImageProvider>();
        mockProvider
            .Setup(p => p.GetAllImages())
            .Throws(new InvalidOperationException("DLL not found."));

        // Should complete without throwing; the outer catch swallows the error
        var exception = await Record.ExceptionAsync(() => BridgeWriteProvider.Write(mockProvider.Object));

        Assert.Null(exception);
        mockProvider.Verify(p => p.GetAllImages(), Times.Once);
    }
}
