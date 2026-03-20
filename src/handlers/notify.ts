import * as vscode from 'vscode';
import type { WebviewMessage } from '../types/webviewMessages';

type NotifyMessage = Extract<WebviewMessage, { type: 'notify' }>;

export function handleNotify(msg: NotifyMessage): void {
    const { kind = 'info', message = '' } = msg;
    if (kind === 'error') {
        vscode.window.showErrorMessage(message);
    } else if (kind === 'warning') {
        vscode.window.showWarningMessage(message);
    } else {
        vscode.window.showInformationMessage(message);
    }
}
