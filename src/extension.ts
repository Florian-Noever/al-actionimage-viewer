import * as vscode from 'vscode';
import * as fs from 'fs';
import { getImageInformations } from './utils/imageInformationProvider';

interface ExportImagePayload {
	name: string;
	mime: string;
	base64: string;
}

interface ExportCategoryPayload {
	category: string;
	images: ExportImagePayload[];
}

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

			if (msg?.type === 'ready' || msg?.type === 'retry') {
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

					// success
					panel.webview.postMessage({ type: 'setData', payload: imageGroups });
				} catch (err: unknown) {
					panel.webview.postMessage({
						type: 'error',
						payload: { message: `Failed to load images: ${err instanceof Error ? err.message : String(err)}` }
					});
				}

				return;
			}

			if (msg?.type === 'notify') {
				const { kind = 'info', message = '' } = msg;
				if (kind === 'error') {
					vscode.window.showErrorMessage(message);
				}
				else if (kind === 'warning') {
					vscode.window.showWarningMessage(message);
				}
				else {
					vscode.window.showInformationMessage(message);
				}
				return;
			}

			if (msg?.type === 'export-image') {
				await exportImage(msg);
				return;
			}

			if (msg?.type === 'export-category') {
				await exportCategory(msg);
				return;
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

async function exportCategory(msg: { type: string; payload?: ExportCategoryPayload }) {
	try {
		const { category, images } = msg.payload ?? {};
		if (!category || !images?.length) {
			throw new Error('Missing category export payload');
		}

		const folderUris = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
			canSelectMany: false,
			openLabel: 'Export Here',
			title: `Export images for "${category}"`,
		});
		if (!folderUris || folderUris.length === 0) { return; }
		const folderUri = folderUris[0];

		const extMap: Record<string, string> = {
			'image/png': 'png', 'image/jpeg': 'jpg',
			'image/gif': 'gif', 'image/bmp': 'bmp', 'image/webp': 'webp',
		};

		let written = 0;
		for (const img of images) {
			if (!img.name || !img.mime || !img.base64) { continue; }
			const ext = extMap[img.mime] ?? 'png';
			const fileUri = vscode.Uri.joinPath(folderUri, `${img.name}.${ext}`);
			const buf = Buffer.from(img.base64, 'base64');
			await vscode.workspace.fs.writeFile(fileUri, buf);
			written++;
		}

		vscode.window.showInformationMessage(
			`Exported ${written} image${written !== 1 ? 's' : ''} to: ${folderUri.fsPath}`
		);
	} catch (err: unknown) {
		vscode.window.showErrorMessage(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

async function exportImage(msg: { type: string; payload?: ExportImagePayload }) {
	try {
		const { name, mime, base64 } = msg.payload ?? {};
		if (!name || !mime || !base64) {
			throw new Error('Missing image payload');
		}

		const defaultExt =
			mime === 'image/png' ? 'png' :
				mime === 'image/jpeg' ? 'jpg' :
					mime === 'image/webp' ? 'webp' : 'bin';

		const uri = await vscode.window.showSaveDialog({
			saveLabel: 'Export Image',
			defaultUri: vscode.Uri.file(`${name}.${defaultExt}`),
			filters: {
				'Image': [defaultExt], // filters are advisory; user can switch to All files
				'All files': ['*']
			}
		});
		if (!uri) { return; }

		const buf = Buffer.from(base64, 'base64');
		await vscode.workspace.fs.writeFile(uri, buf);
		vscode.window.showInformationMessage(`Saved: ${uri.fsPath}`);
	} catch (err: unknown) {
		vscode.window.showErrorMessage(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}
