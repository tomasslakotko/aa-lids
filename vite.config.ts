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
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };
  }
  
  // Fallback: Vite will generate self-signed certificate
  // Browser will show a warning, but it will work
  return true;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true,
    // Enable HTTPS for camera access (required on iOS/iPad)
    // @ts-ignore - Vite accepts boolean or ServerOptions
    https: getHttpsConfig(),
  },
})
