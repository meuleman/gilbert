import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from "vite-plugin-svgr";
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'

// import wasm from 'vite-plugin-wasm'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "esnext", // Needed so that build can occur with the top-level 'await' statements
    rollupOptions: {
      output: {
        manualChunks: {
          worker: ['./src/lib/csnWorker.js']
        }
      }
    }
  },
  plugins: [svgr(), react()],
  assetsInclude: ['**/*.csv'],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [fixReactVirtualized],
    },
  },
  // optimizeDeps: {
  //   include: ['parquet-wasm'] // Add the library name here
  // },
})
