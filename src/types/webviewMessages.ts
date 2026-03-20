export interface ExportImagePayload {
    name: string;
    mime: string;
    base64: string;
}

export interface ExportCategoryPayload {
    category: string;
    images: ExportImagePayload[];
}

export type WebviewMessage =
    | { type: 'ready' }
    | { type: 'retry' }
    | { type: 'notify'; kind?: string; message?: string }
    | { type: 'export-image'; payload?: ExportImagePayload }
    | { type: 'export-category'; payload?: ExportCategoryPayload };

export function isWebviewMessage(msg: unknown): msg is WebviewMessage {
    return typeof msg === 'object' && msg !== null && typeof (msg as Record<string, unknown>).type === 'string';
}
