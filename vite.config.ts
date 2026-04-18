import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const APP_VERSION = process.env.npm_package_version || '1.0.1';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Bake version + build timestamp into the bundle at build time.
    // APP_VERSION is resolved here at config-load time so it is never
    // the string 'undefined' even when npm_package_version is not set.
    __APP_VERSION__:    JSON.stringify(APP_VERSION),
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['motion'],
          'vendor-ui': ['@base-ui/react', 'lucide-react', 'clsx', 'class-variance-authority', 'tailwind-merge'],
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    host: true,
    allowedHosts: ['.producinghollywood.com', 'teleprompter-4rx3.onrender.com'],
  },
});
