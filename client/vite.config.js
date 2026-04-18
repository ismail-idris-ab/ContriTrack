import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor libs from app code so repeat visitors cache them separately
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-axios': ['axios'],
          'vendor-oauth': ['@react-oauth/google'],
        },
      },
    },
  },
});
