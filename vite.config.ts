import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    // Silence the chunk size warning — our split keeps chunks well under 600KB
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — ~150KB
          'vendor-react': ['react', 'react-dom'],
          // Animation — ~100KB
          'vendor-motion': ['motion'],
          // UI primitives
          'vendor-ui': ['@base-ui/react', 'lucide-react', 'clsx', 'class-variance-authority', 'tailwind-merge'],
        },
      },
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify - file watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
    host: true,
    allowedHosts: ['.producinghollywood.com', 'teleprompter-4rx3.onrender.com'],
  },
});
