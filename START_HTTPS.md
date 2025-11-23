# How to Start with HTTPS

## Quick Start (Easiest - Use ngrok)

**This is the easiest way to test on iPad/phone:**

1. **Start your dev server (HTTP is fine for this):**
   ```bash
   npm run dev
   ```

2. **In another terminal, install and run ngrok:**
   ```bash
   # Install ngrok (if not installed)
   brew install ngrok
   # Or download from: https://ngrok.com/download
   
   # Start ngrok tunnel
   ngrok http 3001
   ```

3. **Use the HTTPS URL from ngrok:**
   - ngrok will show a URL like: `https://abc123.ngrok-free.app`
   - Copy this URL
   - Open it on your iPad/phone
   - **No certificate warnings!** ✅

## Alternative: Use mkcert for Local HTTPS

If you want to use `https://localhost:3001` directly:

1. **Install mkcert:**
   ```bash
   brew install mkcert
   mkcert -install
   ```

2. **Generate certificates:**
   ```bash
   mkcert localhost 127.0.0.1 ::1
   ```

3. **Move certificates to project root:**
   - Move `localhost.pem` and `localhost-key.pem` to your project folder

4. **Restart dev server:**
   ```bash
   npm run dev
   ```

5. **Access:** `https://localhost:3001`

## Troubleshooting "Site Can't Provide Secure Connection"

If you get this error:

1. **Make sure dev server is running:**
   ```bash
   npm run dev
   ```
   Look for: `Local: https://localhost:3001/`

2. **Try HTTP first to make sure server works:**
   - Temporarily remove HTTPS from `vite.config.ts`
   - Access `http://localhost:3001`
   - If this works, the issue is with HTTPS config

3. **Use ngrok instead (recommended):**
   - ngrok handles HTTPS automatically
   - No configuration needed
   - Works perfectly on iPad/phone

## For iPad/Phone Access

**Option 1: ngrok (Easiest)**
- Start ngrok: `ngrok http 3001`
- Use the HTTPS URL on your device

**Option 2: Local Network**
- Find your laptop IP: `ifconfig | grep "inet "`
- Access: `https://YOUR_IP:3001`
- You'll need to accept the certificate warning

**Option 3: Cloudflare Tunnel**
```bash
npm install -g cloudflared
cloudflared tunnel --url http://localhost:3001
```

