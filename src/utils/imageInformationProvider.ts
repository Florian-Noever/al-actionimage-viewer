import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MANIFEST } from '../extension';
import { readFromBridgeStdout } from './binaryReader';
import { ImageInformation } from '../types/imageInformationDTO';

enum Platform {
    Windows = 'win32',
    Linux = 'linux',
    MacOS = 'darwin'
}

let executableBitSet = false;
const exeName = 'AL-ActionImage-Viewer.ImageInformationProvider';
const navCodeAnalysisDll = 'Microsoft.Dynamics.Nav.CodeAnalysis.dll';

function platformFolder(): Platform {
    switch (process.platform) {
        case 'win32':
            return Platform.Windows;
        case 'linux':
            return Platform.Linux;
        case 'darwin':
            return Platform.MacOS;
        default:
            throw new Error(`Unsupported platform: ${process.platform}`);
    }
}

export function getBridgeBinaryPath(extensionRoot: string): string {
    const folder = platformFolder();
    const file =
        folder === Platform.Windows
            ? `${exeName}.exe`
            : exeName; // No extension on Unix-based platforms
    return path.join(extensionRoot, 'bin', folder, file);
}

function getImageInfoProviderPath(context: vscode.ExtensionContext): string {
    return getBridgeBinaryPath(context.extensionUri.fsPath);
}

export function getNavCodeAnalysisDllPath(): string | undefined {
    const alExt = vscode.extensions.getExtension(MANIFEST.extensionDependencies[0]);
    if (!alExt) {
        return;
    }
    return path.join(alExt.extensionPath, 'bin', platformFolder(), navCodeAnalysisDll);
}

export async function getImageInformations(context: vscode.ExtensionContext): Promise<Record<string, ImageInformation[]>> {
    const bridgePath = getImageInfoProviderPath(context);

    // Ensure the binary is executable on non-Windows platforms
    if (process.platform !== 'win32' && !executableBitSet) {
        fs.chmodSync(bridgePath, 0o755); // +x
        executableBitSet = true;
    }

    const args: string[] = [];
    const dllPath = getNavCodeAnalysisDllPath();
    if (dllPath) {
        args.push('--dll-path', dllPath);
    }

    return await readFromBridgeStdout(bridgePath, args);
}
