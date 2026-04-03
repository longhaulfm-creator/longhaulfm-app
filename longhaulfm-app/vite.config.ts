// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';
import path from 'path'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tauri expects a fixed port in dev mode
  server: {
    port:        1420,
    strictPort:  true,
    // On Windows the Tauri CLI uses this host
    host:        command === 'serve' ? '0.0.0.0' : undefined,
    hmr: {
      protocol: 'ws',
      host:     'localhost',
      port:     1421,
    },
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  build: {
    // Tauri v2 supports ES2021
    target:    ['es2021', 'chrome100', 'safari13'],
    // Don't minify for debug builds
    minify:    !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },

  // Env vars starting with VITE_ are exposed to the frontend
  envPrefix: ['VITE_'],
}))
