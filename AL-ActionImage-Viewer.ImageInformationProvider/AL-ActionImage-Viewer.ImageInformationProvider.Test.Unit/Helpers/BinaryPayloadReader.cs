using System.Text;

using AL_ActionImage_Viewer.ImageInformationProvider.Data;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Test.Unit.Helpers;

/// <summary>
/// Deserialises the binary wire protocol written by <c>BridgeWriteProvider.WriteToStream</c>.
/// Must mirror the protocol exactly: integers are little-endian int32, strings are
/// [int32 byteLength (-1 = null)][UTF-8 bytes].
/// </summary>
public static class BinaryPayloadReader
{
    public static Dictionary<string, List<ImageInformationDTO>> Read(Stream stream)
    {
        var result = new Dictionary<string, List<ImageInformationDTO>>();
        using var br = new BinaryReader(stream, Encoding.UTF8, leaveOpen: true);

        var groupCount = br.ReadInt32();

        for (var g = 0; g < groupCount; g++)
        {
            var category = ReadString(br) ?? string.Empty;
            var items = new List<ImageInformationDTO>();

            var itemCount = br.ReadInt32();

            if (itemCount >= 0)
            {
                // Collection path: exact item count known upfront
                for (var i = 0; i < itemCount; i++)
                {
                    items.Add(ReadItem(br));
                }
            }
            else
            {
                // Streaming path: items follow until int.MaxValue sentinel.
                // WriteString writes [int32 byteLen][bytes], so the first 4 bytes of
                // each item are the name's byte length. int.MaxValue as that length
                // is the EOF sentinel - identical to the TypeScript reader logic.
                while (true)
                {
                    var nameLen = br.ReadInt32();
                    if (nameLen == int.MaxValue)
                        break;

                    var name = nameLen < 0 ? null : Encoding.UTF8.GetString(br.ReadBytes(nameLen));

                    items.Add(new ImageInformationDTO
                    {
                        Name = name,
                        Category = ReadString(br),
                        Tags = ReadStringArray(br),
                        ImageDataUrl = ReadString(br),
                    });
                }
            }

            result[category] = items;
        }

        return result;
    }

    private static ImageInformationDTO ReadItem(BinaryReader br) => new()
    {
        Name = ReadString(br),
        Category = ReadString(br),
        Tags = ReadStringArray(br),
        ImageDataUrl = ReadString(br),
    };

    private static string? ReadString(BinaryReader br)
    {
        var len = br.ReadInt32();
        if (len < 0)
            return null;
        var bytes = br.ReadBytes(len);
        return Encoding.UTF8.GetString(bytes);
    }

    private static string[] ReadStringArray(BinaryReader br)
    {
        var count = br.ReadInt32();
        if (count <= 0)
            return [];
        var arr = new string[count];
        for (var i = 0; i < count; i++)
            arr[i] = ReadString(br) ?? string.Empty;
        return arr;
    }
}
