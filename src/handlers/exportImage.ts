import * as vscode from 'vscode';

interface ExportImagePayload {
    name: string;
    mime: string;
    base64: string;
}

export async function handleExportImage(msg: { payload?: ExportImagePayload }): Promise<void> {
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
        if (!uri) { return; }

        const buf = Buffer.from(base64, 'base64');
        await vscode.workspace.fs.writeFile(uri, buf);
        vscode.window.showInformationMessage(`Saved: ${uri.fsPath}`);
    } catch (err: unknown) {
        vscode.window.showErrorMessage(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
