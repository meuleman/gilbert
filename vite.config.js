import path from "path";
import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import fixReactVirtualized from "esbuild-plugin-react-virtualized";
import viteTailwindPlugin from "vite-plugin-tailwind";

// import wasm from 'vite-plugin-wasm'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,             // adjust if needed
    strictPort: true,       // fail if 5173 is taken

    allowedHosts: 'all'
    //allowedHosts: ['.amazonaws.com']
  },
  build: {
    target: "esnext", // Needed so that build can occur with the top-level 'await' statements
    rollupOptions: {
      output: {
        manualChunks: {
          worker: ["./src/lib/csnWorker.js"],
        },
      },
    },
  },
  plugins: [
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: "__tla",
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: (i) => `__tla_${i}`,
    }),
    svgr(),
    react(),
    viteTailwindPlugin,
  ],
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ["**/*.csv"],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [fixReactVirtualized],
    },
  },
  // optimizeDeps: {
  //   include: ['parquet-wasm'] // Add the library name here
  // },
});
