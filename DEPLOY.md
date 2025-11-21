# Airport OS - Deployment Guide

## Deploy to Netlify

### Option 1: Deploy via Netlify CLI (Recommended)

1. **Install Netlify CLI** (if not already installed):
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

### Option 2: Deploy via Netlify Dashboard

1. **Build the project** (already done):
   ```bash
   npm run build
   ```

2. **Go to [Netlify](https://app.netlify.com)**

3. **Drag and drop** the `dist` folder to the Netlify dashboard

   OR

4. **Connect your Git repository**:
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider (GitHub, GitLab, etc.)
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Deploy site"

### Option 3: Deploy via Git Push (Automatic)

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **In Netlify Dashboard**:
   - Add new site → Import from Git
   - Select your repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Deploy!

## Important Notes

- The app uses **localStorage** (Zustand persist) for data storage, so data will be stored per browser/device
- All routes are configured to redirect to `index.html` for SPA routing
- The build output is in the `dist` folder

## Environment

- Node.js version: 18+ recommended
- Build time: ~2 seconds
- Bundle size: ~392 KB (gzipped: ~121 KB)

