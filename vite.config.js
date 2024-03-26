import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from "vite-plugin-svgr";

// import wasm from 'vite-plugin-wasm'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "esnext" // Needed so that build can occur with the top-level 'await' statements
  },
  plugins: [svgr(), react()],
  assetsInclude: ['**/*.csv'],
  // optimizeDeps: {
  //   include: ['parquet-wasm'] // Add the library name here
  // },
})
