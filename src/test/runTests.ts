import * as path from 'path';
import * as cp from 'child_process';
import pkg from '../../package.json';
import { pathToFileURL } from 'url';
import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';

const IS_WINDOWS = process.platform === 'win32';
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const TEST_CACHE_PATH = path.join(PROJECT_ROOT, '.vscode-test');

// On Windows both VS Code launches below go through cmd.exe, which splits unquoted paths at spaces
function quoteForShell(value: string): string {
    return IS_WINDOWS ? `"${value}"` : value;
}

async function main() {
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');

    // Passing the profile folders explicitly keeps test-electron from adding its own, unquoted ones
    const profileArgs = [
        `--extensions-dir=${quoteForShell(path.join(TEST_CACHE_PATH, 'extensions'))}`,
        `--user-data-dir=${quoteForShell(path.join(TEST_CACHE_PATH, 'user-data'))}`,
    ];

    // Install ms-dynamics-smb.al into the isolated .vscode-test/extensions/ folder.
    const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);
    const install = cp.spawnSync(
        quoteForShell(cliPath),
        [...profileArgs, '--install-extension', pkg.extensionDependencies[0]],
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
    const extensionDevelopmentPath = pathToFileURL(PROJECT_ROOT).href;
    const extensionTestsPath = pathToFileURL(path.resolve(__dirname, './suite/index')).href;

    await runTests({
        vscodeExecutablePath,
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: profileArgs,
    });
}

main().catch((err) => {
    console.error('Failed to run tests:', err);
    process.exit(1);
});
