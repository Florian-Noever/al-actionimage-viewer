import type { ImageMap } from './imageInformationDTO';

export type ExtensionMessage =
    | { type: 'loading'; payload: { message?: string } }
    | { type: 'error'; payload: { message?: string } }
    | { type: 'setData'; payload: ImageMap };

export function isExtensionMessage(data: unknown): data is ExtensionMessage {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof (data as Record<string, unknown>).type === 'string'
    );
}
