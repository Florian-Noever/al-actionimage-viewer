@echo off
setlocal

set PROJECT=AL-ActionImage-Viewer.ImageInformationProvider\AL-ActionImage-Viewer.ImageInformationProvider.csproj

echo Publishing win32...
dotnet publish "%PROJECT%" -c Release /p:PublishProfile=win32
if %errorlevel% neq 0 ( echo win32 publish failed & exit /b %errorlevel% )

echo Publishing linux...
dotnet publish "%PROJECT%" -c Release /p:PublishProfile=linux
if %errorlevel% neq 0 ( echo linux publish failed & exit /b %errorlevel% )

echo Publishing darwin...
dotnet publish "%PROJECT%" -c Release /p:PublishProfile=darwin
if %errorlevel% neq 0 ( echo darwin publish failed & exit /b %errorlevel% )

echo All platforms published successfully.
endlocal
