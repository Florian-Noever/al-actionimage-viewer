using System.CommandLine;

using AL_ActionImage_Viewer.ImageInformationProvider.Utils;

internal class Program
{
    private static async Task Main(string[] args)
    {
        var dllPathOption = new Option<string?>("--dll-path")
        {
            Description = "Path to Microsoft.Dynamics.Nav.CodeAnalysis.dll. " +
                  "If omitted the path is resolved automatically from ~/.vscode/extensions/.",
        };

        var rootCommand = new RootCommand("AL ActionImage Viewer image information bridge")
        {
            dllPathOption
        };

        rootCommand.SetAction(async parseResult =>
        {
            var dllPath = parseResult.GetValue(dllPathOption);
            await BridgeWriteProvider.Write(dllPath: dllPath);
        });

        await rootCommand.Parse(args).InvokeAsync();
    }
}
