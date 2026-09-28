import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MANIFEST } from '../extension';
import { readFromBridgeStdout } from './binaryReader';
import { ImageInformationDTO } from '../types/imageInformationDTO';
import { Logger } from './logger';

enum Platform {
    Windows = 'win32',
    Linux = 'linux',
    MacOS = 'darwin'
}

let executableBitSet = false;
const EXE_NAME = 'AL-ActionImage-Viewer.ImageInformationProvider';
const NAV_CODE_ANALYSIS_DLL = 'Microsoft.Dynamics.Nav.CodeAnalysis.dll';

function platformFolder(): Platform {
    switch (process.platform) {
        case 'win32':
            return Platform.Windows;
        case 'linux':
            return Platform.Linux;
        case 'darwin':
            return Platform.MacOS;
        default:
            Logger.warn(`Unsupported platform: ${process.platform}`);
            throw new Error(`Unsupported platform: ${process.platform}`);
    }
}

export function getBridgeBinaryPath(extensionRoot: string): string {
    const folder = platformFolder();
    const file =
        folder === Platform.Windows
            ? `${EXE_NAME}.exe`
            : EXE_NAME; // No extension on Unix-based platforms
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
    // AL 18+ ships the DLL directly in bin/, older versions in bin/<platform>/
    const binPath = path.join(alExt.extensionPath, 'bin');
    return [binPath, path.join(binPath, platformFolder())]
        .map(folder => path.join(folder, NAV_CODE_ANALYSIS_DLL))
        .find(dllPath => fs.existsSync(dllPath));
}

export async function getImageInformations(context: vscode.ExtensionContext): Promise<Record<string, ImageInformationDTO[]>> {
    const bridgePath = getImageInfoProviderPath(context);

    // Ensure the binary is executable on non-Windows platforms
    if (process.platform !== 'win32' && !executableBitSet) {
        fs.chmodSync(bridgePath, 0o755); // +x
        executableBitSet = true;
    }

    const args: string[] = [];
    const dllPath = getNavCodeAnalysisDllPath();
    if (dllPath) {
        Logger.info(`Using AL DLL at: ${dllPath}`);
        args.push('--dll-path', dllPath);
    } else {
        Logger.warn('AL Language extension DLL not found; bridge will attempt auto-discovery.');
    }

    return await readFromBridgeStdout(bridgePath, args);
}
