import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  clearScreen: false,
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
        config: resolve(__dirname, 'src/renderer/config/index.html'),
        controller: resolve(__dirname, 'src/renderer/controller/index.html'),
      },
    },
  },
  plugins: [vue()],
});
