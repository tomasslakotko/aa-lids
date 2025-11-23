import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Helper to get HTTPS config
function getHttpsConfig() {
  // Try to use mkcert certificates if they exist (trusted, no warnings)
  const certPath = path.resolve(__dirname, 'localhost.pem');
  const keyPath = path.resolve(__dirname, 'localhost-key.pem');
  
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
      return {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      };
    } catch (e) {
      console.warn('Failed to read mkcert certificates, using self-signed:', e);
    }
  }
  
  // Fallback: Use Vite's built-in HTTPS with self-signed certificate
  // Browser will show a warning, but it will work
  // For iOS, you may need to accept the certificate in Safari settings
  return true;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0', // Allow access from network (for iPad/phone)
    // Enable HTTPS for camera access (required on iOS/iPad)
    // @ts-ignore - Vite accepts boolean or ServerOptions
    https: getHttpsConfig(),
    strictPort: false,
  },
})
