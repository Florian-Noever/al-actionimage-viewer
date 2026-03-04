import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: path.resolve(__dirname, 'webview'),
    plugins: [vue()],
    build: {
        outDir: path.resolve(__dirname, 'public'),
        emptyOutDir: false,
        rollupOptions: {
            input: path.resolve(__dirname, 'webview/src/main.ts'),
            output: {
                format: 'iife',
                entryFileNames: 'app.js',
                assetFileNames: (info) =>
                    info.name?.endsWith('.css') ? 'styles.css' : (info.name ?? '[name][extname]'),
                inlineDynamicImports: true,
            },
        },
        cssCodeSplit: false,
        assetsInlineLimit: 8192,
        sourcemap: false,
        minify: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'webview/src'),
        },
    },
});
