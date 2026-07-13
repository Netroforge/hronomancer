import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'electron/main/index.ts'),
                },
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'electron/preload/index.ts'),
                },
                output: {
                    format: 'cjs',
                    entryFileNames: '[name].js',
                },
            },
        },
    },
    renderer: {
        root: resolve(__dirname, 'src/renderer'),
        build: {
            rollupOptions: {
                input: {
                    overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
                    config: resolve(__dirname, 'src/renderer/config/index.html'),
                },
            },
        },
        plugins: [vue()],
    },
});
