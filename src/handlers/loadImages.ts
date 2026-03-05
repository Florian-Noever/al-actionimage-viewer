import * as vscode from 'vscode';
import { getImageInformations } from '../utils/imageInformationProvider';

export async function handleLoadImages(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): Promise<void> {
    panel.webview.postMessage({ type: 'loading', payload: { message: 'Loading images…' } });

    try {
        const imageGroups = await getImageInformations(context);

        const empty = !imageGroups || Object.keys(imageGroups).length === 0;
        if (empty) {
            panel.webview.postMessage({
                type: 'error',
                payload: { message: 'No images found. Please check your configuration or try again.' }
            });
            return;
        }

        panel.webview.postMessage({ type: 'setData', payload: imageGroups });
    } catch (err: unknown) {
        panel.webview.postMessage({
            type: 'error',
            payload: { message: `Failed to load images: ${err instanceof Error ? err.message : String(err)}` }
        });
    }
}
