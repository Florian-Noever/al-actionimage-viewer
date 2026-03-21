import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const tests = process.argv.includes('--tests');

/** @type {import('esbuild').Plugin} */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',

    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started');
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log('[watch] build finished');
        });
    },
};

async function buildTests() {
    /** @type {import('esbuild').BuildOptions} */
    const testOptions = {
        bundle: true,
        format: 'cjs',
        sourcemap: true,
        sourcesContent: false,
        platform: 'node',
        logLevel: 'silent',
        plugins: [esbuildProblemMatcherPlugin],
    };
    await Promise.all([
        esbuild.build({
            ...testOptions,
            entryPoints: ['src/test/runTests.ts'],
            outfile: 'out/test/runTests.js',
            external: ['vscode', '@vscode/test-electron'],
        }),
        esbuild.build({
            ...testOptions,
            entryPoints: ['src/test/suite/index.ts'],
            outfile: 'out/test/suite/index.js',
            external: ['vscode', 'mocha'],
        }),
        esbuild.build({
            ...testOptions,
            entryPoints: ['src/test/suite/integration.test.ts'],
            outfile: 'out/test/suite/integration.test.js',
            external: ['vscode'],
        }),
    ]);
}

async function main() {
    const ctx = await esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        format: 'cjs',
        minify: false,
        sourcemap: true,
        sourcesContent: false,
        platform: 'node',
        outfile: 'out/extension.js',
        external: ['vscode'],
        logLevel: 'silent',
        plugins: [
            esbuildProblemMatcherPlugin,
        ],
    });
    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
        if (tests) {
            await buildTests();
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
