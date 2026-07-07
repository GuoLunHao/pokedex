import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import apiPlugin from './vite-plugin-api.js'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    // Base path — CHANGE THIS to match your GitHub Pages URL
    // e.g. '/pokedex/' if deployed to https://guolunhao.github.io/pokedex/
    base: isProd ? '/pokedex/' : '/',

    plugins: [
      react(),
      // API plugin only needed in dev mode
      !isProd && apiPlugin(),
    ].filter(Boolean),

    server: {
      port: 5173,
      watch: {
        usePolling: true,
      },
    },

    build: {
      outDir: 'dist',
    },
  }
})
