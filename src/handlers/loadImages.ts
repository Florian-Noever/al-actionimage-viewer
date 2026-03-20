import * as vscode from 'vscode';
import { getImageInformations } from '../utils/imageInformationProvider';

export async function handleLoadImages(context: vscode.ExtensionContext, webview: vscode.Webview): Promise<void> {
    webview.postMessage({ type: 'loading', payload: { message: 'Loading images...' } });

    try {
        const imageGroups = await getImageInformations(context);

        const empty = !imageGroups || Object.keys(imageGroups).length === 0;
        if (empty) {
            webview.postMessage({
                type: 'error',
                payload: { message: 'No images found. Please check your configuration or try again.' }
            });
            return;
        }

        webview.postMessage({ type: 'setData', payload: imageGroups });
    } catch (e) {
        webview.postMessage({
            type: 'error',
            payload: { message: `Failed to load images: ${e instanceof Error ? e.message : String(e)}` }
        });
    }
}
