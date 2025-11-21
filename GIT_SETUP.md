# Git & Netlify Auto-Deploy Setup Guide

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Repository name: `airport-os` (or any name you prefer)
4. Description: "Internal Airport OS System - Reservations, Check-in, Boarding, OCC"
5. Choose **Public** or **Private**
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **"Create repository"**

## Step 2: Connect Local Repository to GitHub

After creating the repo, GitHub will show you commands. Use these:

```bash
# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/airport-os.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**OR if you prefer SSH:**
```bash
git remote add origin git@github.com:YOUR_USERNAME/airport-os.git
git branch -M main
git push -u origin main
```

## Step 3: Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **"Deploy with GitHub"** (or GitLab/Bitbucket)
4. Authorize Netlify to access your GitHub account
5. Select your repository: `airport-os`
6. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 18 (or latest LTS)
7. Click **"Deploy site"**

## Step 4: Auto-Deploy is Now Active! 🎉

- Every time you push to `main` branch, Netlify will automatically rebuild and deploy
- You can also set up branch previews for pull requests

## Future Updates

To update your live site:
```bash
git add .
git commit -m "Your update message"
git push
```

Netlify will automatically deploy the changes!

