import * as vscode from 'vscode';
import * as fs from 'fs';
import { handleLoadImages } from './handlers/loadImages';
import { handleNotify } from './handlers/notify';
import { handleExportImage } from './handlers/exportImage';
import { handleExportCategory } from './handlers/exportCategory';

export const EXTENSION = 'al-actionimage-viewer';
export const EXTENSION_NAME = 'AL ActionImage Viewer';
export const COMMAND_OPEN = 'open';

export let log: vscode.LogOutputChannel;

export function activate(context: vscode.ExtensionContext) {
	log = vscode.window.createOutputChannel(EXTENSION_NAME, { log: true });
	context.subscriptions.push(log);

	const disposable = vscode.commands.registerCommand(EXTENSION + '.' + COMMAND_OPEN, async () => {
		const panel = vscode.window.createWebviewPanel(
			'imageBrowser',
			EXTENSION_NAME,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'public')],
			}
		);
		panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'icon.svg');
		panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri);
		panel.webview.onDidReceiveMessage(async (msg) => {
			log.info(`Received message from webview: ${JSON.stringify(msg)}`);

			switch (msg?.type) {
				case 'ready':
				case 'retry':
					await handleLoadImages(context, panel);
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
		});
	});
	context.subscriptions.push(disposable);

	log.info(`Successfully activated "${EXTENSION_NAME}" extension.`);
}

export function deactivate() { }

function getWebviewHtml(webview: vscode.Webview, extUri: vscode.Uri) {
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

