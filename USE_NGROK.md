# Use ngrok for HTTPS (Easiest Solution)

Since local HTTPS is causing issues, use ngrok - it's the easiest and most reliable way.

## Step 1: Install ngrok

**macOS:**
```bash
brew install ngrok
```

**Or download from:** https://ngrok.com/download

## Step 2: Start Your Dev Server

```bash
npm run dev
```

The server will run on: `http://localhost:3001` (HTTP is fine)

## Step 3: Start ngrok (in a NEW terminal)

```bash
ngrok http 3001
```

## Step 4: Copy the HTTPS URL

ngrok will show something like:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3001
```

**Copy the HTTPS URL** (the one starting with `https://`)

## Step 5: Use on iPad/Phone

1. Open Safari on your iPad/phone
2. Paste the ngrok HTTPS URL
3. The app will load with HTTPS ✅
4. Camera will work! ✅

## Why ngrok is Better

- ✅ Automatic HTTPS (no certificate setup)
- ✅ Works on any device
- ✅ No browser warnings
- ✅ Works over internet (not just local network)
- ✅ Super easy to set up

## Free ngrok Account

You may need to sign up for a free ngrok account:
1. Go to: https://dashboard.ngrok.com/signup
2. Get your authtoken
3. Run: `ngrok config add-authtoken YOUR_TOKEN`

Then `ngrok http 3001` will work!

