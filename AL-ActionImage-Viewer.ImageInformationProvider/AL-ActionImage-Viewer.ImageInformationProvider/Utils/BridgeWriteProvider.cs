using System.Text;

using AL_ActionImage_Viewer.ImageInformationProvider.Abstractions;
using AL_ActionImage_Viewer.ImageInformationProvider.Data;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Utils;

/// <summary>
/// Serialises image data from an <see cref="IImageProvider"/> into the binary
/// wire protocol and writes it to stdout (or a supplied <see cref="Stream"/>).
/// The protocol must remain byte-for-byte compatible with the TypeScript
/// <c>BinaryReader</c> / <c>parseBridgePayload</c> in the VS Code extension.
/// </summary>
public static class BridgeWriteProvider
{
    /// <summary>Named-pipe identifier (reserved; stdout is used in production).</summary>
    public const string NamedPipeName = "ImageInfoPipe";

    /// <summary>
    /// Writes a single nullable string as <c>[int32 byteLength][-1 if null][UTF-8 bytes]</c>.
    /// </summary>
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

    /// <summary>Writes a string array as <c>[int32 count][string…]</c>.</summary>
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

    /// <summary>Writes one <see cref="ImageInformationDTO"/> as name, category, tags, imageDataUrl.</summary>
    private static void WriteItem(BinaryWriter bw, ImageInformationDTO dto)
    {
        WriteString(bw, dto.Name);
        WriteString(bw, dto.Category);
        WriteStringArray(bw, dto.Tags ?? []);
        WriteString(bw, dto.ImageDataUrl);
    }

    /// <summary>
    /// Serialises <paramref name="dict"/> into the binary wire protocol and writes it to
    /// <paramref name="output"/>. This method is <c>public</c> so that it can be called directly without going through <see cref="Write"/>.
    /// </summary>
    public static void WriteToStream(Stream output, Dictionary<string, IEnumerable<ImageInformationDTO>> dict)
    {
        using var bw = new BinaryWriter(output, Encoding.UTF8, leaveOpen: true);

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
        Console.Error.WriteLine("All data written.");
    }

    /// <summary>
    /// Application entry-point helper: retrieves all images from
    /// <paramref name="provider"/> (defaults to <see cref="NAVImageProvider"/>) and
    /// writes them to stdout using <see cref="WriteToStream"/>.
    /// All exceptions are caught and logged to <c>stderr</c> - the process always
    /// exits cleanly.
    /// </summary>
    /// <param name="provider">
    /// Optional image provider. When <see langword="null"/> the production
    /// <see cref="NAVImageProvider"/> is used.
    /// </param>
    /// <param name="dllPath">
    /// Optional explicit path to <c>Microsoft.Dynamics.Nav.CodeAnalysis.dll</c>.
    /// Ignored when <paramref name="provider"/> is supplied. When both are
    /// <see langword="null"/> the DLL path is resolved automatically from
    /// <c>~/.vscode/extensions/</c>.
    /// </param>
    public static async Task Write(IImageProvider? provider = null, string? dllPath = null)
    {
        try
        {
            var imageProvider = provider ?? new NAVImageProvider(dllPath);

#if DEBUG
            Console.SetOut(TextWriter.Null);
            using var stdout = Stream.Null;
#else
            using var stdout = Console.OpenStandardOutput();
#endif

            Console.Error.WriteLine("Retrieving AL Images");
            var dict = imageProvider.GetAllImages();
            Console.Error.WriteLine($"Retrieved {dict.Values.Sum(x => x.Count())} Images");

            WriteToStream(stdout, dict);

            Console.Error.WriteLine("All data written. Closing pipe.");

#if DEBUG
            Console.Error.WriteLine("Press any key to exit...");
            if (!Console.IsInputRedirected)
                Console.ReadKey();
#endif
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Exception during write: " + ex.ToString());
        }
    }
}
