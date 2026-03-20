import * as vscode from 'vscode';
import pkg from '../package.json';
import { getWebviewHtml, handleWebviewMessage } from './utils/webviewUtils';
import { ImageBrowserSidebarProvider } from './utils/imageBrowserSidebarProvider';

export const MANIFEST = pkg;
export const COMMAND_OPEN = pkg.contributes.commands[0].command;

export let log: vscode.LogOutputChannel;

export function activate(context: vscode.ExtensionContext) {
	log = vscode.window.createOutputChannel(MANIFEST.displayName, { log: true });
	context.subscriptions.push(log);

	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND_OPEN, async () => {
			const panel = vscode.window.createWebviewPanel(
				'al-actionimage-viewer.panel',
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
			panel.webview.onDidReceiveMessage(async (msg) => await handleWebviewMessage(context, panel.webview, msg));
		})
	);

	const sidebarProvider = new ImageBrowserSidebarProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(MANIFEST.contributes.views['al-actionimage-viewer'][0].id, sidebarProvider)
	);

	log.info(`Successfully activated "${MANIFEST.displayName}" extension.`);
}

export function deactivate() { }
