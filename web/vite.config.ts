import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http:'+ (process.env.HOST || 'localhost') + ':' + (process.env.PORT || '8080') + '/api',
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});