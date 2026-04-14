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
    // We force 0.0.0.0 so it listens on your local IP (192.168.8.2)
    host: '0.0.0.0', 
    https: true, 
    hmr: {
      protocol: 'wss',
      // This MUST be your local IP so the tablet knows where to send updates
      host: '192.168.8.2', 
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