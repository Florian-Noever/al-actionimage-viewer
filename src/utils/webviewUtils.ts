import * as vscode from 'vscode';
import * as fs from 'fs';
import { handleLoadImages } from '../handlers/loadImages';
import { handleNotify } from '../handlers/notify';
import { handleExportImage } from '../handlers/exportImage';
import { handleExportCategory } from '../handlers/exportCategory';
import { Logger } from './logger';

export async function handleWebviewMessage(context: vscode.ExtensionContext, webview: vscode.Webview, msg: unknown): Promise<void> {
    Logger.info(`Received message from webview: ${JSON.stringify(msg)}`);

    if (typeof msg !== 'object' || msg === null) {
        return;
    }
    const { type } = msg as Record<string, unknown>;

    try {
        switch (type) {
            case 'ready':
            case 'retry':
                await handleLoadImages(context, webview);
                break;
            case 'notify':
                handleNotify(msg as Parameters<typeof handleNotify>[0]);
                break;
            case 'export-image':
                await handleExportImage(msg as Parameters<typeof handleExportImage>[0]);
                break;
            case 'export-category':
                await handleExportCategory(msg as Parameters<typeof handleExportCategory>[0]);
                break;
        }
    } catch (e) {
        Logger.error(`Error handling message of type "${type}": ${e instanceof Error ? e.message : String(e)}`);
        vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
    }
}

export function getWebviewHtml(webview: vscode.Webview, extUri: vscode.Uri, sidebarMode = false): string {
    const mediaPath = vscode.Uri.joinPath(extUri, 'public');

    const indexPath = vscode.Uri.joinPath(mediaPath, 'index.html');
    const html = fs.readFileSync(indexPath.fsPath, 'utf8');

    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'styles.css'));
    const appUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'app.js'));
    const cspSource = webview.cspSource;
    const nonce = getNonce();

    return html
        .replace(/%STYLE_URI%/g, String(stylesUri))
        .replace(/%APP_URI%/g, String(appUri))
        .replace(/%CSP_SOURCE%/g, String(cspSource))
        .replace(/%SIDEBAR_MODE%/g, String(sidebarMode))
        .replace(/%NONCE%/g, nonce);
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
