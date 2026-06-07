import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: ['es2022', 'chrome105', 'safari14'],
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'radix-vendor': [
            '@radix-ui/react-slot',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-toast',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-slider',
            '@radix-ui/react-tabs',
            '@radix-ui/react-switch',
            '@radix-ui/react-label',
            '@radix-ui/react-select',
            '@radix-ui/react-progress',
          ],
          'tauri-vendor': [
            '@tauri-apps/api',
            '@tauri-apps/plugin-clipboard-manager',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-fs',
            '@tauri-apps/plugin-global-shortcut',
            '@tauri-apps/plugin-log',
            '@tauri-apps/plugin-notification',
            '@tauri-apps/plugin-os',
            '@tauri-apps/plugin-process',
            '@tauri-apps/plugin-shell',
            '@tauri-apps/plugin-store',
            '@tauri-apps/plugin-updater',
          ],
        },
      },
    },
  },
});
