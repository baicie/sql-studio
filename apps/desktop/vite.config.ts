import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  plugins: [react()],
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@sqlgui/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@sqlgui/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@sqlgui/sdk': path.resolve(__dirname, '../../packages/sqlgui-sdk/src'),
      '@sqlgui/api': path.resolve(__dirname, '../../packages/sqlgui-api/src'),
      '@sqlgui/i18n': path.resolve(__dirname, '../../packages/i18n/src'),
      '@sqlgui/extension-schema': path.resolve(__dirname, '../../packages/extension-schema/src'),
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['monaco-editor'],
  },
});
