import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  
  // 루트 디렉토리 명시
  root: '.',
  
  // 빌드 설정
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    
    // 빌드된 파일들 최적화
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        manualChunks: {
          react: ['react', 'react-dom']
        },
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    
    // 청크 크기 경고 비활성화
    chunkSizeWarningLimit: 1000,
  },
  
  // 개발 서버 설정
  server: {
    port: 3000,
    open: true,
    cors: true,
    host: 'localhost'
  },
  
  // 프리뷰 서버 설정
  preview: {
    port: 4173,
    open: true,
    host: 'localhost'
  },
  
  // public 디렉토리 설정
  publicDir: 'public',
  
  // 경로 별칭 설정
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // 최적화
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})