import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { writeFileSync, readFileSync } from 'fs'

// Plugin to copy index.html → 404.html so GitHub Pages serves the SPA for all routes
function copy404Plugin() {
  return {
    name: 'copy-404',
    closeBundle() {
      const index = readFileSync(resolve(__dirname, 'dist/index.html'), 'utf-8')
      writeFileSync(resolve(__dirname, 'dist/404.html'), index)
    }
  }
}

export default defineConfig({
  plugins: [react(), copy404Plugin()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.[hash].js',
        chunkFileNames: 'assets/app-[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      }
    }
  }
})
