import * as vscode from 'vscode';
import { getWebviewHtml, handleWebviewMessage } from './webviewUtils';

export class ImageBrowserSidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) { }

    public resolveWebviewView(webviewView: vscode.WebviewView, _resolveContext: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'public')],
        };

        webviewView.webview.html = getWebviewHtml(webviewView.webview, this.context.extensionUri);

        webviewView.webview.onDidReceiveMessage(async (msg) => {
            await handleWebviewMessage(this.context, webviewView.webview, msg);
        });
    }
}
