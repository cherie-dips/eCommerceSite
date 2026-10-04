import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The 3D library is about 1 MB on its own; it's only loaded on the 3D pages.
    chunkSizeWarningLimit: 1100,
  },
})
