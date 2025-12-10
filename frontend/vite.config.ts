import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

// WASM 파일 복사 플러그인
const wasmCopyPlugin = () => ({
  name: 'wasm-copy',
  closeBundle() {
    try {
      const wasmFile = join(__dirname, 'src/wasm_pkg/engine_bg.wasm')
      const dest = join(__dirname, 'dist/engine_bg.wasm')
      copyFileSync(wasmFile, dest)
      console.log('✅ WASM 파일 복사 완료:', dest)
    } catch (error) {
      console.error('❌ WASM 파일 복사 실패:', error)
    }
  }
})

export default defineConfig({
  plugins: [react(), wasmCopyPlugin()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Embed-Opener-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['../engine']
  },
  build: {
    target: 'es2020',
  }
})