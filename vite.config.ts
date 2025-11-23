import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0', // Allow access from network (for iPad/phone)
    // HTTPS disabled - use ngrok for HTTPS (recommended for camera access)
    // ngrok handles HTTPS automatically and works perfectly on iPad/phone
    // Run: ngrok http 3001
    strictPort: false,
  },
})
