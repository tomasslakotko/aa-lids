# HTTPS Setup for Localhost

Camera access requires HTTPS (or localhost). Here are two ways to set it up:

## Option 1: Quick Setup (Self-Signed Certificate)

Vite will automatically generate a self-signed certificate. Just run:

```bash
npm run dev
```

Then access: `https://localhost:3001`

**Note:** Your browser will show a security warning. Click "Advanced" → "Proceed to localhost" to continue.

**For iOS/iPad:** You may need to accept the certificate in Safari settings.

## Option 2: Trusted Certificate (Recommended for iOS/iPad)

Use `mkcert` to create a trusted local certificate:

### Step 1: Install mkcert

**macOS:**
```bash
brew install mkcert
```

**Windows:**
Download from: https://github.com/FiloSottile/mkcert/releases

**Linux:**
```bash
sudo apt install libnss3-tools
# Then download from releases page
```

### Step 2: Install Local CA

```bash
mkcert -install
```

### Step 3: Generate Certificate for localhost

```bash
mkcert localhost 127.0.0.1 ::1
```

This creates two files:
- `localhost.pem` (certificate)
- `localhost-key.pem` (private key)

### Step 4: Place Certificates in Project Root

Move the generated files to your project root directory (same folder as `vite.config.ts`).

### Step 5: Start Dev Server

```bash
npm run dev
```

Now access: `https://localhost:3001` - no browser warnings!

## Option 3: Use a Tunnel Service (For Testing on Real Devices)

If you want to test on your iPad/phone over the network:

### Using ngrok:

1. Install ngrok: https://ngrok.com/download
2. Start your dev server: `npm run dev`
3. In another terminal: `ngrok http 3001`
4. Use the HTTPS URL provided by ngrok

### Using Cloudflare Tunnel:

1. Install: `npm install -g cloudflared`
2. Start your dev server: `npm run dev`
3. In another terminal: `cloudflared tunnel --url http://localhost:3001`
4. Use the HTTPS URL provided

## Troubleshooting

- **iOS Safari still doesn't work:** Make sure you're using HTTPS (not HTTP)
- **Certificate warnings:** Use Option 2 (mkcert) for trusted certificates
- **Can't access from iPad:** Make sure both devices are on the same network, or use a tunnel service

