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
    // Required if your WASM uses web workers
    plugins: () => [wasm(), topLevelAwait()],
  },
  optimizeDeps: {
    // This forces Vite to treat the WASM package as a dependency
    exclude: ['your-wasm-package-name'] 
  },
  server: {
    fs: {
      // Allow serving files from the parent directory if wasm_pkg is outside src
      allow: ['..']
    }
  }
});