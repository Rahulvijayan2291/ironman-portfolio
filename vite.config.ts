import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// SITE_URL (optional) is injected into absolute Open Graph URLs at build time.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const raw = env.VITE_SITE_URL || env.SITE_URL || ''
  const site = raw ? raw.replace(/\/?$/, '/') : ''

  return {
    // Relative base keeps the build portable (root domain, sub-path, GitHub Pages).
    base: './',
    plugins: [
      react(),
      {
        name: 'inject-site-url',
        transformIndexHtml: (html: string) => html.split('__SITE_URL__').join(site),
      },
    ],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 1100, // the lazy 3D chunk is intentionally large
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion'
            if (id.includes('node_modules/gsap')) return 'gsap'
            return undefined
          },
        },
      },
    },
  }
})
