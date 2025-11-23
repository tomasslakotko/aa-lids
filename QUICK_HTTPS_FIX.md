# Quick Fix: "Site Can't Provide Secure Connection"

If you're getting this error, try these steps:

## Option 1: Use mkcert (Recommended - No Warnings)

1. **Install mkcert:**
   ```bash
   brew install mkcert
   ```

2. **Install local CA:**
   ```bash
   mkcert -install
   ```

3. **Generate certificates:**
   ```bash
   mkcert localhost 127.0.0.1 ::1
   ```

4. **Move certificates to project root:**
   The command above creates two files. Move them to your project root (same folder as `vite.config.ts`):
   - `localhost.pem`
   - `localhost-key.pem`

5. **Restart dev server:**
   ```bash
   npm run dev
   ```

6. **Access:** `https://localhost:3001` (no warnings!)

## Option 2: Use ngrok (For Testing on iPad/Phone)

If mkcert doesn't work or you want to test on real devices:

1. **Install ngrok:**
   - Download from: https://ngrok.com/download
   - Or: `brew install ngrok`

2. **Start your dev server:**
   ```bash
   npm run dev
   ```

3. **In another terminal, start ngrok:**
   ```bash
   ngrok http 3001
   ```

4. **Use the HTTPS URL from ngrok:**
   - ngrok will give you a URL like: `https://abc123.ngrok.io`
   - Use this URL on your iPad/phone
   - No certificate warnings!

## Option 3: Check Browser Settings

If using self-signed certificate:

1. **Chrome:** Click "Advanced" → "Proceed to localhost (unsafe)"
2. **Safari (Mac):** You may need to accept the certificate in Keychain Access
3. **Safari (iOS):** Go to Settings → Safari → Advanced → Experimental Features → Allow Insecure Localhost (if available)

## Troubleshooting

- **"Site can't provide secure connection":** Usually means the HTTPS server isn't starting. Check the terminal for errors.
- **Certificate errors:** Use mkcert (Option 1) for trusted certificates
- **Can't access from iPad:** Make sure both devices are on the same WiFi network, or use ngrok

