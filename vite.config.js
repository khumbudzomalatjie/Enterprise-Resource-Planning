import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ndanduleni-auth-module/', // MUST match your repository name exactly
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
