import * as vscode from 'vscode';
import { readFromBridgeStdout } from './binaryReader';
import { ImageInformation } from '../types/imageInformationDTO';

function platformFolder(): 'win32' | 'linux' | 'darwin' {
    switch (process.platform) {
        case 'win32':
        case 'linux':
        case 'darwin':
            return process.platform;
        default:
            throw new Error(`Unsupported platform: ${process.platform}`);
    }
}

function getImageInfoProviderPath(context: vscode.ExtensionContext): string {
    const folder = platformFolder();
    const file =
        folder === 'win32'
            ? 'AL-ActionImage-Viewer.ImageInformationProvider.exe'
            : 'AL-ActionImage-Viewer.ImageInformationProvider';

    const uri = vscode.Uri.joinPath(context.extensionUri, 'bin', folder, file);
    return uri.fsPath;
}

export async function getImageInformations(context: vscode.ExtensionContext): Promise<Record<string, ImageInformation[]>> {
    const path = getImageInfoProviderPath(context);
    return await readFromBridgeStdout(path);
}
