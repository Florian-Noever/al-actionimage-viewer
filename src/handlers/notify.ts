import * as vscode from 'vscode';

export function handleNotify(msg: { kind?: string; message?: string }): void {
    const { kind = 'info', message = '' } = msg;
    if (kind === 'error') {
        vscode.window.showErrorMessage(message);
    } else if (kind === 'warning') {
        vscode.window.showWarningMessage(message);
    } else {
        vscode.window.showInformationMessage(message);
    }
}
