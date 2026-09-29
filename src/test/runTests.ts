import * as path from 'path';
import * as cp from 'child_process';
import pkg from '../../package.json';
import { pathToFileURL } from 'url';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';

const IS_WINDOWS = process.platform === 'win32';

// The VS Code CLI on Windows runs through cmd.exe, which splits unquoted paths at spaces
function quoteForShell(value: string): string {
    return IS_WINDOWS ? `"${value}"` : value;
}

async function main() {
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');

    // Install ms-dynamics-smb.al into the isolated .vscode-test/extensions/ folder.
    const [cliPath, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    const install = cp.spawnSync(
        quoteForShell(cliPath),
        [...cliArgs, '--install-extension', pkg.extensionDependencies[0]].map(quoteForShell),
        {
            encoding: 'utf-8',
            stdio: 'inherit',
            shell: IS_WINDOWS, // required: VS Code CLI on Windows is a .cmd file
        }
    );
    if (install.status !== 0) {
        throw install.error ?? new Error(`Installing ${pkg.extensionDependencies[0]} failed with exit code ${install.status}`);
    }

    // Convert both paths to file:// URIs
    const extensionDevelopmentPath = pathToFileURL(path.resolve(__dirname, '../../')).href;
    const extensionTestsPath = pathToFileURL(path.resolve(__dirname, './suite/index')).href;

    await runTests({ vscodeExecutablePath, extensionDevelopmentPath, extensionTestsPath });
}

main().catch((err) => {
    console.error('Failed to run tests:', err);
    process.exit(1);
});
