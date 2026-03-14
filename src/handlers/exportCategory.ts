import * as vscode from 'vscode';

interface ExportImagePayload {
    name: string;
    mime: string;
    base64: string;
}

interface ExportCategoryPayload {
    category: string;
    images: ExportImagePayload[];
}

const EXT_MAP: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/webp': 'webp',
};

export async function handleExportCategory(msg: { payload?: ExportCategoryPayload; }): Promise<void> {
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

        const total = images.length;
        let written = 0;

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Exporting "${category}"`,
                cancellable: false,
            },
            async (progress) => {
                progress.report({ increment: 0, message: `0 / ${total}` });

                for (const img of images) {
                    if (!img.name || !img.mime || !img.base64) {
                        continue;
                    }
                    const ext = EXT_MAP[img.mime] ?? 'png';
                    const fileUri = vscode.Uri.joinPath(folderUri, `${img.name}.${ext}`);
                    const buf = Buffer.from(img.base64, 'base64');
                    await vscode.workspace.fs.writeFile(fileUri, buf);
                    written++;
                    progress.report({
                        increment: 100 / total,
                        message: `${written} / ${total}`,
                    });
                }
            }
        );

        vscode.window.showInformationMessage(`Exported ${written} image${written !== 1 ? 's' : ''} to: ${folderUri.fsPath}`);
    } catch (e) {
        if (e instanceof Error) {
            throw new Error(`Export Category failed: ${e.message}`, { cause: e });
        }

        throw new Error(`Export Category failed: ${String(e)}`);
    }
}
