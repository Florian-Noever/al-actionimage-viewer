import * as vscode from 'vscode';
import { wrapError } from '../utils/errors';
import type { WebviewMessage } from '../types/webviewMessages';

type ExportImageMessage = Extract<WebviewMessage, { type: 'export-image' }>;

export async function handleExportImage(msg: ExportImageMessage): Promise<void> {
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
                'Image': [defaultExt],
                'All files': ['*'],
            },
        });
        if (!uri) {
            return; 
        }

        const buf = Buffer.from(base64, 'base64');
        await vscode.workspace.fs.writeFile(uri, buf);
        vscode.window.showInformationMessage(`Saved: ${uri.fsPath}`);
    } catch (e) {
        wrapError('Export Image', e);
    }
}
