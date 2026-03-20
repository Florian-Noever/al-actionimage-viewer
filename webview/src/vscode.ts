export interface VscodeApi {
    postMessage(message: unknown): void;
    getState<T = unknown>(): T | undefined;
    setState<T = unknown>(state: T): void;
}

/** Typed, cached handle to acquireVsCodeApi(). Undefined in plain browser context. */
const _vscode: VscodeApi | undefined =
    typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;

declare function acquireVsCodeApi(): VscodeApi;

export function postMessage(message: unknown): void {
    _vscode?.postMessage(message);
}

export function getState<T = unknown>(): T | undefined {
    return _vscode?.getState<T>();
}

export function setState<T = unknown>(state: T): void {
    _vscode?.setState(state);
}

export const isVscode = !!_vscode;

/** True when the webview is running inside the VS Code sidebar panel (not the full editor panel). */
export function isSidebarMode(): boolean {
    return document.documentElement.dataset.sidebarMode === 'true';
}
