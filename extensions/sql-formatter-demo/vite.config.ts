import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/extension.ts',
      formats: ['es'],
      fileName: () => 'extension.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['@sqlgui/api'],
    },
  },
});
