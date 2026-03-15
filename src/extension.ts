import * as vscode from 'vscode';
import * as fs from 'fs';
import pkg from '../package.json';
import { handleLoadImages } from './handlers/loadImages';
import { handleNotify } from './handlers/notify';
import { handleExportImage } from './handlers/exportImage';
import { handleExportCategory } from './handlers/exportCategory';

export const MANIFEST = pkg;
export const COMMAND_OPEN = pkg.contributes.commands[0].command;

export let log: vscode.LogOutputChannel;

export function activate(context: vscode.ExtensionContext) {
	log = vscode.window.createOutputChannel(MANIFEST.displayName, { log: true });
	context.subscriptions.push(log);

	const disposable = vscode.commands.registerCommand(COMMAND_OPEN, async () => {
		const panel = vscode.window.createWebviewPanel(
			'imageBrowser',
			MANIFEST.displayName,
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

			try {
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
			} catch (e) {
				log.error(`Error handling message of type "${msg?.type}": ${e instanceof Error ? e.message : String(e)}`);
				vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
			}
		});
	});
	context.subscriptions.push(disposable);

	log.info(`Successfully activated "${MANIFEST.displayName}" extension.`);
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
