import * as path from 'path';
import * as cp from 'child_process';
import pkg from '../../package.json';
import { pathToFileURL } from 'url';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';

async function main() {
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');

    // Install ms-dynamics-smb.al into the isolated .vscode-test/extensions/ folder.
    const [cliPath, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    cp.spawnSync(cliPath, [...cliArgs, '--install-extension', pkg.extensionDependencies[0]], {
        encoding: 'utf-8',
        stdio: 'inherit',
        shell: process.platform === 'win32', // required: VS Code CLI on Windows is a .cmd file
    });

    // Convert both paths to file:// URIs
    const extensionDevelopmentPath = pathToFileURL(path.resolve(__dirname, '../../')).href;
    const extensionTestsPath = pathToFileURL(path.resolve(__dirname, './suite/index')).href;

    await runTests({ vscodeExecutablePath, extensionDevelopmentPath, extensionTestsPath });
}

main().catch((err) => {
    console.error('Failed to run tests:', err);
    process.exit(1);
});
