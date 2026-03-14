import { spawn } from 'node:child_process';
import { ImageInformation, ImageInformationDTO } from '../types/imageInformationDTO';
import { log } from '../extension';

class BinaryReader {
    private buf: Buffer;
    private offset = 0;

    constructor(buf: Buffer) {
        this.buf = buf;
    }

    private ensure(n: number) {
        if (this.offset + n > this.buf.length) {
            throw new RangeError('Unexpected end of stream');
        }
    }

    readInt32(): number {
        this.ensure(4);
        const v = this.buf.readInt32LE(this.offset);
        this.offset += 4;
        return v;
    }

    readBytes(len: number): Uint8Array {
        this.ensure(len);
        const slice = this.buf.subarray(this.offset, this.offset + len);
        this.offset += len;
        return slice;
    }

    readString(): string | null {
        const len = this.readInt32();
        if (len < 0) {
            return null;
        }
        const bytes = this.readBytes(len);
        return new TextDecoder().decode(bytes);
    }

    readStringArray(): string[] {
        const count = this.readInt32();
        if (count <= 0) {
            return [];
        }
        const arr: string[] = [];
        for (let i = 0; i < count; i++) {
            const s = this.readString();
            if (s !== null) { arr.push(s); }
        }
        return arr;
    }

    get isEOF(): boolean {
        return this.offset >= this.buf.length;
    }
}

// ---- Parsing logic that mirrors your C# exactly ----
function readItem(br: BinaryReader): ImageInformationDTO {
    return {
        name: br.readString(),
        category: br.readString(),
        tags: br.readStringArray(),
        imageDataUrl: br.readString(),
    };
}

function parseBridgePayload(buf: Buffer): Record<string, ImageInformation[]> {
    const br = new BinaryReader(buf);
    const groupCount = br.readInt32();

    const dict: Record<string, ImageInformation[]> = {};
    const maxGroups =
        groupCount > 0 ? groupCount : Number.MAX_SAFE_INTEGER;

    for (let g = 0; g < maxGroups; g++) {
        // In the C# version, if groupCount < 0 and the pipe closes, it breaks.
        // Here, break if there's nothing left to read for another key.
        if (br.isEOF) {
            break;
        }

        // Try to read the key; if we can't even read a length, we're done.
        let key: string;
        try {
            key = br.readString() ?? '';
        } catch {
            break;
        }

        const itemCount = br.readInt32();
        const items: ImageInformation[] = [];

        if (itemCount >= 0) {
            for (let i = 0; i < itemCount; i++) {
                items.push(readItem(br));
            }
        } else {
            // Streaming item mode:
            while (true) {
                const marker = br.readInt32();
                if (marker === 0x7fffffff) {
                    break;
                } // int.MaxValue terminator

                const nameBytes = br.readBytes(marker);
                const name = new TextDecoder().decode(nameBytes);

                const dto: ImageInformation = {
                    name,
                    category: br.readString(),
                    tags: br.readStringArray(),
                    imageDataUrl: br.readString(),
                };
                items.push(dto);
            }
        }

        dict[key] = items;
    }

    return dict;
}

// ---- Public API: spawn the bridge, collect stdout, parse, return ----
export async function readFromBridgeStdout(bridgeExePath: string, args: string[] = []): Promise<Record<string, ImageInformation[]>> {
    return new Promise((resolve, reject) => {
        const child = spawn(bridgeExePath, args, {
            stdio: ['ignore', 'pipe', 'pipe'], // read stdout, show stderr
            windowsHide: true,
        });

        const chunks: Buffer[] = [];
        child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
        child.stderr.on('data', (e) => log.info(e.toString()));
        child.once('error', reject);

        child.once('close', (code) => {
            try {
                if (code !== 0 && code !== null) {
                    // Non-zero exit isn't necessarily fatal, so continue
                }
                const buf = Buffer.concat(chunks);
                const result = parseBridgePayload(buf);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    });
}
