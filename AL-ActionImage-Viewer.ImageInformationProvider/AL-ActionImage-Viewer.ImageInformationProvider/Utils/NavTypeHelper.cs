namespace AL_ActionImage_Viewer.ImageInformationProvider.Utils;

/// <summary>
/// Centralised constants for the reflection-based access to the AL Language
/// extension DLL (<c>Microsoft.Dynamics.Nav.CodeAnalysis.dll</c>).
/// </summary>
public static class NavTypeHelper
{
    /// <summary>The root namespace / assembly name of the AL Code Analysis library.</summary>
    public const string FullNavCodeAnalysisTypeName = "Microsoft.Dynamics.Nav.CodeAnalysis";

    /// <summary>The simple class name that hosts the image resource methods.</summary>
    public const string ImageResourcesTypeName = "ImageResources";

    /// <summary>Reflection method name for standard action images.</summary>
    public const string GetActionImageResourcesMethodName = "GetActionImageResources";

    /// <summary>Reflection method name for field cue-group images.</summary>
    public const string GetFieldCueGroupImageResourcesMethodName = "GetFieldCueGroupImageResources";

    /// <summary>Reflection method name for action cue-group images.</summary>
    public const string GetActionCueGroupImageResourcesMethodName = "GetActionCueGroupImageResources";

    /// <summary>Reflection method name for role-center action-group images.</summary>
    public const string GetRoleCenterActionGroupImageResourcesMethodName = "GetRoleCenterActionGroupImageResources";

    /// <summary>File name of the AL Code Analysis DLL (with extension).</summary>
    public static string FullNavCodeAnalysisDllName => $"{FullNavCodeAnalysisTypeName}.dll";

    /// <summary>Fully-qualified type name used as the target of reflection calls.</summary>
    public static string FullNavCodeAnalysisImageResourcesTypeName => $"{FullNavCodeAnalysisTypeName}.{ImageResourcesTypeName}";
}
