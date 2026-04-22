import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), basicSsl()],
  appType: 'spa',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0', 
    https: true, 
    hmr: {
      protocol: 'wss',
      // Forced to localhost for browser security compliance in Incognito
      host: 'localhost', 
      port: 1420,
    },
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },

  envPrefix: ['VITE_'],
}))