export function wrapError(operation: string, e: unknown): never {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${operation} failed: ${msg}`, { cause: e instanceof Error ? e : undefined });
}
