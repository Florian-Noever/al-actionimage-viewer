using System.Reflection;
using System.Runtime.CompilerServices;

using AL_ActionImage_Viewer.ImageInformationProvider.Data;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Utils;

/// <summary>
/// Locates and reflects against the AL Language extension DLL
/// (<c>Microsoft.Dynamics.Nav.CodeAnalysis.dll</c>) to extract all action
/// image resources grouped by category.
/// </summary>
public static class NAVImageInformationProvider
{
    /// <summary>The VS Code marketplace extension identifier for the AL Language extension.</summary>
    public const string ALExtensionId = "ms-dynamics-smb.al";

    /// <summary>
    /// Returns all image groups discovered in the AL extension DLL, keyed by category name.
    /// Returns an empty dictionary if the extension is not installed or the DLL cannot be loaded.
    /// </summary>
    public static Dictionary<string, IEnumerable<ImageInformationDTO>> GetAllImages() => GetAllImagesLocal();

    /// <summary>Returns images from the <c>GetActionImageResources</c> method.</summary>
    public static IEnumerable<ImageInformationDTO> GetActionImages() => GetImagesLocal(NavTypeHelper.GetActionImageResourcesMethodName);

    /// <summary>Returns images from the <c>GetFieldCueGroupImageResources</c> method.</summary>
    public static IEnumerable<ImageInformationDTO> GetFieldCueGroupImages() => GetImagesLocal(NavTypeHelper.GetFieldCueGroupImageResourcesMethodName);

    /// <summary>Returns images from the <c>GetActionCueGroupImageResources</c> method.</summary>
    public static IEnumerable<ImageInformationDTO> GetActionCueGroupImages() => GetImagesLocal(NavTypeHelper.GetActionCueGroupImageResourcesMethodName);

    /// <summary>Returns images from the <c>GetRoleCenterActionGroupImageResources</c> method.</summary>
    public static IEnumerable<ImageInformationDTO> GetRoleCenterActionImages() => GetImagesLocal(NavTypeHelper.GetRoleCenterActionGroupImageResourcesMethodName);

    /// <summary>
    /// Returns <see langword="true"/> if the AL Language extension DLL can be located
    /// on the local machine; <see langword="false"/> otherwise.
    /// </summary>
    public static bool IsALExtensionInstalled() => GetMicrosoftDynamicsNavCodeAnalysisDllPath() is not null;

    /// <summary>
    /// Searches the VS Code extensions folder for the AL Language extension and returns
    /// the full path to <c>Microsoft.Dynamics.Nav.CodeAnalysis.dll</c>, or
    /// <see langword="null"/> if it cannot be found.
    /// </summary>
    public static string? GetMicrosoftDynamicsNavCodeAnalysisDllPath()
    {
        var userFolder = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var vscodeExtensionsFolder = Path.Combine(userFolder, ".vscode", "extensions");
        if (!Directory.Exists(vscodeExtensionsFolder))
            return null;
        var extensions = Directory.GetDirectories(vscodeExtensionsFolder);
        var alExtensionPath = extensions.FirstOrDefault(extension => Path.GetFileName(extension).StartsWith(ALExtensionId)) ?? string.Empty;
        var platform = OperatingSystem.IsWindows() ? "win32"
                     : OperatingSystem.IsMacOS() ? "darwin"
                     : "linux";
        var codeAnalysisDll = Path.Combine(alExtensionPath, "bin", platform, NavTypeHelper.FullNavCodeAnalysisDllName);
        return File.Exists(codeAnalysisDll) ? codeAnalysisDll : null;
    }

    /// <summary>
    /// Loads the DLL, invokes a single named resource method by reflection, and
    /// converts the resulting dictionary into a list of <see cref="ImageInformationDTO"/>.
    /// Returns an empty list on any error.
    /// </summary>
    /// <param name="methodName">The name of the static method to invoke on <c>ImageResources</c>.</param>
    private static List<ImageInformationDTO> GetImagesLocal(string methodName)
    {
        var imagesList = new List<ImageInformationDTO>();

        try
        {
            var dllPath = GetMicrosoftDynamicsNavCodeAnalysisDllPath();
            if (dllPath is null)
                return imagesList;

            var assembly = Assembly.LoadFrom(dllPath);

            var imageResourcesType = assembly.GetType(NavTypeHelper.FullNavCodeAnalysisImageResourcesTypeName);
            var method = imageResourcesType?.GetMethod(methodName, BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
            var imagesDictionary = method?.Invoke(null, null) as IDictionary<string, string>;
            if (imagesDictionary is not null)
            {
                var category = method!.Name
                    .Replace("Get", string.Empty, StringComparison.OrdinalIgnoreCase)
                    .Replace("Resource", string.Empty, StringComparison.OrdinalIgnoreCase);

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

    /// <summary>
    /// Discovers all static methods on <c>ImageResources</c> that return
    /// <c>IDictionary&lt;string, string&gt;</c> and invokes each one to build
    /// the full image groups dictionary. Errors per-method are logged and skipped.
    /// </summary>
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

            var imageResourcesType = assembly.GetType(NavTypeHelper.FullNavCodeAnalysisImageResourcesTypeName)!;

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

    /// <summary>
    /// Eagerly runs the static constructor of <c>ImageResources</c> via
    /// <see cref="RuntimeHelpers.RunClassConstructor"/> so that any missing-type
    /// errors surface with useful diagnostics before the first method invocation.
    /// </summary>
    /// <param name="dllPath">Absolute path to the AL Code Analysis DLL.</param>
    private static void LoadCheckCTor(string dllPath)
    {
        try
        {
            var asm = Assembly.LoadFrom(dllPath);
            var t = asm.GetType(NavTypeHelper.FullNavCodeAnalysisImageResourcesTypeName, throwOnError: true)!;
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

    /// <summary>
    /// Converts a raw <c>IDictionary&lt;string, string&gt;</c> (name → URI-encoded image string)
    /// returned by the AL extension into a strongly-typed list of <see cref="ImageInformationDTO"/>.
    /// Entries that do not yet start with <c>"data:"</c> are prefixed with the PNG data-URL header.
    /// </summary>
    /// <param name="imagesDictionary">Raw dictionary from the AL DLL reflection call.</param>
    /// <param name="category">Category name derived from the method name.</param>
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
