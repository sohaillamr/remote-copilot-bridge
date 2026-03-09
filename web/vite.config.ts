import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'syntax-highlighter': ['react-syntax-highlighter'],
          'markdown': ['react-markdown', 'remark-gfm'],
          'charts': ['recharts'],
          'framer': ['framer-motion'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
