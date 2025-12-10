import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// WASM 파일 복사 및 engine.js 수정 플러그인
const wasmPlugin = () => ({
  name: 'wasm-plugin',
  closeBundle() {
    try {
      const distDir = join(__dirname, 'dist')
      const srcDir = join(__dirname, 'src/wasm_pkg')
      
      // 1. 해시된 WASM 파일 찾기
      const files = readdirSync(distDir)
      const wasmFile = files.find(f => f.endsWith('.wasm') && f.includes('engine_bg'))
      
      if (wasmFile) {
        // 2. 고정 이름으로 복사
        const source = join(distDir, wasmFile)
        const dest = join(distDir, 'engine_bg.wasm')
        copyFileSync(source, dest)
        console.log('✅ WASM 파일 복사 완료:', wasmFile, '→ engine_bg.wasm')
        
        // 3. engine.js 파일도 dist로 복사하고 수정
        const engineJsSource = join(srcDir, 'engine.js')
        const engineJsDest = join(distDir, 'engine.js')
        
        // engine.js 내용 읽기
        let content = readFileSync(engineJsSource, 'utf-8')
        
        // 상대 경로를 절대 경로로 변경
        content = content.replace(
          /module_or_path = new URL\('engine_bg\.wasm', import\.meta\.url\);/,
          "module_or_path = '/engine_bg.wasm';"
        )
        
        // 수정된 내용 저장
        writeFileSync(engineJsDest, content)
        console.log('✅ engine.js 수정 및 복사 완료')
      }
    } catch (error) {
      console.error('❌ WASM 플러그인 에러:', error)
    }
  }
})

export default defineConfig({
  plugins: [react(), wasmPlugin()],
  build: {
    target: 'es2020'
    // rollupOptions 제거!
  }
})