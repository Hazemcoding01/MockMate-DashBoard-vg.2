import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'postcss',
    minify: false
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://mockmateai-001-site1.jtempurl.com',
        changeOrigin: true
      }
    }
  }
});