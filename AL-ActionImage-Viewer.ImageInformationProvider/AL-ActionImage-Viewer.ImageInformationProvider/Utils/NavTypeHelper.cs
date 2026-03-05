namespace AL_ActionImage_Viewer.ImageInformationProvider.Utils;

public static class NavTypeHelper
{
    public const string FullNavCodeAnalysisTypeName = "Microsoft.Dynamics.Nav.CodeAnalysis";

    public const string ImageResourcesTypeName = "ImageResources";

    public const string GetActionImageResourcesMethodName = "GetActionImageResources";
    public const string GetFieldCueGroupImageResourcesMethodName = "GetFieldCueGroupImageResources";
    public const string GetActionCueGroupImageResourcesMethodName = "GetActionCueGroupImageResources";
    public const string GetRoleCenterActionGroupImageResourcesMethodName = "GetRoleCenterActionGroupImageResources";

    public static string FullNavCodeAnalysisDllName => $"{FullNavCodeAnalysisTypeName}.dll";

    public static string FullNavCodeAnalysisImageResourcesTypeName => $"{FullNavCodeAnalysisTypeName}.{ImageResourcesTypeName}";
}
