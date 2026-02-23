using System.Text;

using AL_ActionImage_Viewer.ImageInformationProvider.Data;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Utils;

public static class BridgeWriteProvider
{
    public const string NamedPipeName = "ImageInfoPipe";

    private static void WriteString(BinaryWriter bw, string? s)
    {
        if (s is null)
        {
            bw.Write(-1);
            return;
        }
        var bytes = Encoding.UTF8.GetBytes(s);
        bw.Write(bytes.Length);
        bw.Write(bytes);
        bw.Flush();
    }

    private static void WriteStringArray(BinaryWriter bw, string[] arr)
    {
        bw.Write(arr?.Length ?? 0);
        if (arr is not null)
        {
            foreach (var s in arr)
            {
                WriteString(bw, s ?? string.Empty);
            }
        }
    }

    private static void WriteItem(BinaryWriter bw, ImageInformationDTO dto)
    {
        WriteString(bw, dto.Name);
        WriteString(bw, dto.Category);
        WriteStringArray(bw, dto.Tags ?? []);
        WriteString(bw, dto.ImageDataUrl);
    }

    public static async Task Write()
    {
        try
        {
#if DEBUG
            Console.Error.WriteLine("Retrieving AL Images");
            var dictDebug = NAVImageInformationProvider.GetAllImages();
            Console.Error.WriteLine($"Retrieved {dictDebug.Values.Sum(x => x.Count())} Images");
#endif

            using var stdout = Console.OpenStandardOutput();
            using var bw = new BinaryWriter(stdout, Encoding.UTF8, leaveOpen: true);

            Console.Error.WriteLine("Retrieving AL Images");
            var dict = NAVImageInformationProvider.GetAllImages();
            Console.Error.WriteLine($"Retrieved {dict.Values.Sum(x => x.Count())} Images");

            Console.Error.WriteLine("Writing Count");
            bw.Write(dict.Count);
            bw.Flush();

            foreach (var kvp in dict)
            {
                Console.Error.WriteLine($"Writing Category {kvp.Key}");
                WriteString(bw, kvp.Key);

                if (kvp.Value is ICollection<ImageInformationDTO> coll)
                {
                    Console.Error.WriteLine($"Writing {coll.Count} items");
                    bw.Write(coll.Count);
                    bw.Flush();
                    foreach (var item in coll)
                    {
                        WriteItem(bw, item);
                    }
                }
                else
                {
                    bw.Write(-1);
                    bw.Flush();
                    foreach (var item in kvp.Value)
                    {
                        WriteItem(bw, item);
                    }

                    bw.Write(int.MaxValue);
                    bw.Flush();
                }
            }

            bw.Flush();
            Console.Error.WriteLine("All data written. Closing pipe.");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Exception during write: " + ex.ToString());
        }
    }
}
