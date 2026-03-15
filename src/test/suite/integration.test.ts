import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import type { ImageInformation } from '../../types/imageInformationDTO';
import { readFromBridgeStdout } from '../../utils/binaryReader';
import { getBridgeBinaryPath, getNavCodeAnalysisDllPath } from '../../utils/imageInformationProvider';

suite('Bridge Integration', () => {
    let result: Record<string, ImageInformation[]>;

    suiteSetup(async function () {
        const extensionRoot = path.resolve(__dirname, '../../../');
        const binaryPath = getBridgeBinaryPath(extensionRoot);

        assert.ok(
            fs.existsSync(binaryPath),
            `Bridge binary not found at: ${binaryPath}`
        );

        if (process.platform !== 'win32') {
            fs.chmodSync(binaryPath, 0o755);
        }

        // Pass the DLL path explicitly via --dll-path so the bridge uses the AL
        // extension installed in the test profile
        const args: string[] = [];
        const dllPath = getNavCodeAnalysisDllPath();
        if (dllPath && fs.existsSync(dllPath)) {
            args.push('--dll-path', dllPath);
        }

        result = await readFromBridgeStdout(binaryPath, args);
    });

    test('result is a non-empty object', () => {
        assert.ok(result, 'Result should be defined');
        const categories = Object.keys(result);
        assert.ok(categories.length > 0, 'Result should contain at least one category');
    });

    test('each category contains at least one image', () => {
        const categories = Object.entries(result);
        assert.ok(categories.length > 0, 'result must contain at least one category');
        for (const [category, images] of categories) {
            assert.ok(
                images.length > 0,
                `Category "${category}" should contain at least one image`
            );
        }
    });

    test('every image has a non-empty imageDataUrl', () => {
        const allImages = Object.entries(result).flatMap(([, images]) => images);
        assert.ok(allImages.length > 0, 'result must contain at least one image');
        for (const image of allImages) {
            assert.ok(
                image.imageDataUrl,
                `Image "${image.name}" has a missing imageDataUrl`
            );
        }
    });

    test('every imageDataUrl starts with data:image/', () => {
        const allImages = Object.entries(result).flatMap(([, images]) => images);
        assert.ok(allImages.length > 0, 'result must contain at least one image');
        for (const image of allImages) {
            assert.ok(
                image.imageDataUrl!.startsWith('data:image/'),
                `Image "${image.name}" has an unexpected imageDataUrl prefix: ${image.imageDataUrl!.substring(0, 30)}`
            );
        }
    });

    test('every imageDataUrl contains valid base64 data', () => {
        const allImages = Object.entries(result).flatMap(([, images]) => images);
        assert.ok(allImages.length > 0, 'result must contain at least one image');
        for (const image of allImages) {
            const url = image.imageDataUrl!;
            const separatorIndex = url.indexOf(';base64,');
            assert.ok(
                separatorIndex !== -1,
                `Image "${image.name}" imageDataUrl does not contain ";base64,"`
            );
            const data = url.substring(separatorIndex + ';base64,'.length);
            assert.ok(
                data.length > 0,
                `Image "${image.name}" has empty base64 data`
            );
        }
    });
});
