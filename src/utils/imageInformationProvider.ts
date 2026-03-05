import * as vscode from 'vscode';
import * as fs from 'fs';
import { readFromBridgeStdout } from './binaryReader';
import { ImageInformation } from '../types/imageInformationDTO';

enum Platform {
    Windows = 'win32',
    Linux = 'linux',
    MacOS = 'darwin'
}

let executableBitSet = false;

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

function getImageInfoProviderPath(context: vscode.ExtensionContext): string {
    const folder = platformFolder();
    const file =
        folder === Platform.Windows
            ? 'AL-ActionImage-Viewer.ImageInformationProvider.exe'
            : 'AL-ActionImage-Viewer.ImageInformationProvider';

    const uri = vscode.Uri.joinPath(context.extensionUri, 'bin', folder, file);
    return uri.fsPath;
}

export async function getImageInformations(context: vscode.ExtensionContext): Promise<Record<string, ImageInformation[]>> {
    const path = getImageInfoProviderPath(context);

    // Ensure the binary is executable on non-Windows platforms (only needs to happen once)
    if (process.platform !== 'win32' && !executableBitSet) {
        fs.chmodSync(path, 0o755); // +x
        executableBitSet = true;
    }

    return await readFromBridgeStdout(path);
}
