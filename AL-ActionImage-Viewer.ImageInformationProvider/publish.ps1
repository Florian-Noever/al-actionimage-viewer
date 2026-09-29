param(
    [string[]] $PublishProfile = @('win32', 'linux', 'darwin')
)

$project = Join-Path $PSScriptRoot 'AL-ActionImage-Viewer.ImageInformationProvider' 'AL-ActionImage-Viewer.ImageInformationProvider.csproj'

foreach ($name in $PublishProfile) {
    Write-Host "Publishing $name..."
    dotnet publish $project -c Release "-p:PublishProfile=$name"
    if ($LASTEXITCODE -ne 0) {
        throw "Publishing $name failed with exit code $LASTEXITCODE."
    }
}

Write-Host "Published $($PublishProfile -join ', ') successfully."
