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
      // البروكسي العادي لباقي الصفحات
      '/api': {
        target: 'https://mockmateai-001-site1.jtempurl.com',
        changeOrigin: true,
        secure: false,
      },
      // البروكسي الذكي للإنترفيو عشان يشيل كلمة /api اللي بتعمل 404 🚀
      '/api/interview-sessions': {
        target: 'https://mockmateai-001-site1.jtempurl.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // السطر ده بيمسح الـ api ويبعتها صح للباك إند
      }
    },
  },
});