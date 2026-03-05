using System.Reflection;
using System.Runtime.CompilerServices;

using AL_ActionImage_Viewer.ImageInformationProvider.Data;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Utils;

public static class NAVImageInformationProvider
{
    public const string ALExtensionId = "ms-dynamics-smb.al";

    public static Dictionary<string, IEnumerable<ImageInformationDTO>> GetAllImages() => GetAllImagesLocal();

    public static IEnumerable<ImageInformationDTO> GetActionImages() => GetImagesLocal("GetActionImageResources");

    public static IEnumerable<ImageInformationDTO> GetFieldCueGroupImages() => GetImagesLocal("GetFieldCueGroupImageResources");

    public static IEnumerable<ImageInformationDTO> GetActionCueGroupImages() => GetImagesLocal("GetActionCueGroupImageResources");

    public static IEnumerable<ImageInformationDTO> GetRoleCenterActionImages() => GetImagesLocal("GetRoleCenterActionGroupImageResources");

    public static bool IsALExtensionInstalled() => GetMicrosoftDynamicsNavCodeAnalysisDllPath() is not null;

    public static string? GetMicrosoftDynamicsNavCodeAnalysisDllPath()
    {
        var userFolder = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var vscodeExtensionsFolder = Path.Combine(userFolder, ".vscode", "extensions");
        if (!Directory.Exists(vscodeExtensionsFolder))
            return null;
        var extensions = Directory.GetDirectories(vscodeExtensionsFolder);
        var alExtensionPath = extensions.FirstOrDefault(extension => Path.GetFileName(extension).StartsWith(ALExtensionId)) ?? string.Empty;
        var codeAnalysisDll = Path.Combine(alExtensionPath, "bin", "win32", "Microsoft.Dynamics.Nav.CodeAnalysis.dll");
        return File.Exists(codeAnalysisDll) ? codeAnalysisDll : null;
    }

    private static List<ImageInformationDTO> GetImagesLocal(string methodName)
    {
        var imagesList = new List<ImageInformationDTO>();

        try
        {
            var dllPath = GetMicrosoftDynamicsNavCodeAnalysisDllPath();
            if (dllPath is null)
                return imagesList;

            var assembly = Assembly.LoadFrom(dllPath);

            var imageResourcesType = assembly.GetType("Microsoft.Dynamics.Nav.CodeAnalysis.ImageResources");
            var method = imageResourcesType?.GetMethod(methodName, BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
            var imagesDictionary = method?.Invoke(null, null) as IDictionary<string, string>;
            if (imagesDictionary is not null)
            {
                var category = method!.Name.Replace("Get", string.Empty).Replace("Resource", string.Empty);
                var imageInfos = FromImagesDictionary(imagesDictionary, category);
                imagesList.AddRange(imageInfos);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error loading images via reflection ({methodName}): {ex}");
        }
        return imagesList;
    }

    private static Dictionary<string, IEnumerable<ImageInformationDTO>> GetAllImagesLocal()
    {
        var imageGroupsDict = new Dictionary<string, IEnumerable<ImageInformationDTO>>();

        try
        {
            var dllPath = GetMicrosoftDynamicsNavCodeAnalysisDllPath();
            Console.Error.WriteLine("Found dll path: " + dllPath);
            if (string.IsNullOrWhiteSpace(dllPath))
            {
                Console.Error.WriteLine("DLL path is null or empty.");
                return imageGroupsDict;
            }

            LoadCheckCTor(dllPath);

            var assembly = Assembly.LoadFrom(dllPath);

            var imageResourcesType = assembly.GetType("Microsoft.Dynamics.Nav.CodeAnalysis.ImageResources")!;

            var methods = imageResourcesType
                .GetMethods(BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic)
                .Where(m =>
                    typeof(IDictionary<string, string>).IsAssignableFrom(m.ReturnType) &&
                    m.GetParameters().Length == 0);

            Console.Error.WriteLine($"Found {methods.Count()} image resource methods.");

            foreach (var method in methods)
            {
                try
                {
                    if (method.Invoke(null, null) is IDictionary<string, string> result)
                    {
                        Console.Error.WriteLine($"Invoked method: {method.Name}, found {result.Count} images.");
                        var category = method.Name.Replace("Get", string.Empty).Replace("Resource", string.Empty);
                        var imageInfos = FromImagesDictionary(result, category);
                        imageGroupsDict.Add(category, imageInfos);
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Error invoking method {method.Name}: {ex}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error during image group discovery: {ex}");
        }
        return imageGroupsDict;
    }

    private static void LoadCheckCTor(string dllPath)
    {
        try
        {
            var asm = Assembly.LoadFrom(dllPath);
            var t = asm.GetType("Microsoft.Dynamics.Nav.CodeAnalysis.ImageResources", throwOnError: true)!;
            RuntimeHelpers.RunClassConstructor(t.TypeHandle);
        }
        catch (TypeLoadException tle)
        {
            Console.Error.WriteLine("Missing type: " + tle.TypeName);
            Console.Error.WriteLine("_____________________________");
        }
        catch (TypeInitializationException tie)
        {
            Console.Error.WriteLine($"Error during initialization {tie.TypeName}: {tie}");
            if (tie.InnerException is TypeLoadException tle)
                Console.Error.WriteLine("Missing type: " + tle.TypeName);
            Console.Error.WriteLine("_____________________________");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Error during static ctor: " + ex.ToString());
            Console.Error.WriteLine("_____________________________");
        }
    }

    private static List<ImageInformationDTO> FromImagesDictionary(IDictionary<string, string> imagesDictionary, string category)
    {
        var imageType = "data:image/png;base64,";
        var imagesList = new List<ImageInformationDTO>();
        foreach (var (name, imageString) in imagesDictionary)
        {
            var content = Uri.UnescapeDataString(imageString);
            if (!content.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                content = imageType + content;

            imagesList.Add(new ImageInformationDTO
            {
                Name = name,
                Category = category,
                ImageDataUrl = content
            });
        }
        return imagesList;
    }
}
