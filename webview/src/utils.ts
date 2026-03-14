import { postMessage } from './vscode';

export function parseDataUrl(dataUrl: string): { mime: string; base64: string; byteLength: number; } | null {
    const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
    if (!m) {
        return null;
    }
    const [, mime, b64] = m;
    return {
        mime,
        base64: b64,
        byteLength: Math.floor((b64.length * 3) / 4)
    };
}

export function blobFromDataUrl(dataUrl: string): Blob {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
        throw new Error('Not a base64 data URL');
    }
    const bin = atob(parsed.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return new Blob([bytes], { type: parsed.mime });
}

export function notify(kind: 'info' | 'warning' | 'error', message: string): void {
    try {
        postMessage({ type: 'notify', kind, message });
    } catch { /* swallow */ }
}

export function normalize(s: string | null | undefined): string {
    return (s ?? '').toString().trim().toLowerCase();
}

export function makeSearchPredicate(query: string): (name: string) => boolean {
    const q = query.trim();

    const exactMatch = /^"(.*)"$/.exec(q);
    if (exactMatch) {
        const needle = normalize(exactMatch[1]);
        return (name) => normalize(name) === needle;
    }

    const hasLeading = q.startsWith('*');
    const hasTrailing = q.endsWith('*');
    const core = normalize(q.replace(/^\*/, '').replace(/\*$/, ''));

    if (!q || core.length === 0) {
        return () => true;
    }

    if (hasLeading && hasTrailing) {
        return (name) => normalize(name).includes(core);
    }
    if (hasTrailing && !hasLeading) {
        return (name) => normalize(name).startsWith(core);
    }
    if (hasLeading && !hasTrailing) {
        return (name) => normalize(name).endsWith(core);
    }
    return (name) => normalize(name).includes(core);
}
