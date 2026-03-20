import * as vscode from 'vscode';
import * as fs from 'fs';
import { handleLoadImages } from '../handlers/loadImages';
import { handleNotify } from '../handlers/notify';
import { handleExportImage } from '../handlers/exportImage';
import { handleExportCategory } from '../handlers/exportCategory';
import { Logger } from './logger';
import { isWebviewMessage } from '../types/webviewMessages';

export async function handleWebviewMessage(context: vscode.ExtensionContext, webview: vscode.Webview, msg: unknown): Promise<void> {
    Logger.info(`Received message from webview: ${JSON.stringify(msg)}`);

    if (!isWebviewMessage(msg)) {
        return;
    }

    try {
        switch (msg.type) {
            case 'ready':
            case 'retry':
                await handleLoadImages(context, webview);
                break;
            case 'notify':
                handleNotify(msg);
                break;
            case 'export-image':
                await handleExportImage(msg);
                break;
            case 'export-category':
                await handleExportCategory(msg);
                break;
        }
    } catch (e) {
        Logger.error(`Error handling message of type "${msg.type}": ${e instanceof Error ? e.message : String(e)}`);
        vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
    }
}

export function setupWebviewMessageListener(context: vscode.ExtensionContext, webview: vscode.Webview): vscode.Disposable {
    return webview.onDidReceiveMessage(async (msg) => {
        await handleWebviewMessage(context, webview, msg);
    });
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
