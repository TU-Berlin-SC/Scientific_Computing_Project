import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  worker: {
    // ⚠️ 수정됨: 함수 () => [] 가 아니라 그냥 배열 [] 이어야 합니다.
    plugins: [
        wasm(), 
        topLevelAwait()
    ],
  },
  optimizeDeps: {
    // ⚠️ 수정됨: 실제 engine 패키지 이름을 적거나, 잘 모르겠으면 일단 비워두셔도 됩니다.
    exclude: ['engine'] 
  },
  server: {
    fs: {
      // Allow serving files from the parent directory if wasm_pkg is outside src
      allow: ['..']
    }
  }
});