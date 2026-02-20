# Website Troubleshooting Guide

**Last Updated:** February 20, 2026

---

## Site Not Updating After Git Push

### ✅ Correct Process
1. Edit files in `07_Website/`
2. `git add .`
3. `git commit -m "description"`
4. `git push origin main`
5. Wait 2 minutes for Vercel auto-deploy

### ❌ Common Mistakes

**MISTAKE: Uploading to Bluehost cPanel**
- ❌ Do NOT upload files to Bluehost File Manager
- ❌ Bluehost does NOT host the website
- ✅ Bluehost only manages domain registration
- ✅ Website is hosted on Vercel

**MISTAKE: Editing .htaccess on Bluehost**
- ❌ .htaccess on Bluehost has no effect
- ✅ Vercel doesn't use .htaccess (uses `vercel.json` if needed)

**MISTAKE: Expecting instant updates**
- ❌ Changes don't appear immediately after git push
- ✅ Wait 1-2 minutes for Vercel deployment
- ✅ Check Vercel dashboard for deployment status

---

## How to Verify Deployment

### Check Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click `superimmersive8` project
3. See latest deployment status
4. Look for "Ready" status with green checkmark

### Check Git Status
```bash
git status
# Should show: "Your branch is up to date with 'origin/main'"
```

### Force Browser Refresh
- **Mac:** Cmd + Shift + R
- **Windows:** Ctrl + Shift + R
- Or open incognito window

---

## Website Architecture

```
Domain Registration: Bluehost (DNS management only)
        ↓
    DNS points to Vercel IP
        ↓
Hosting: Vercel (actual website files)
        ↓
Auto-deploy from GitHub repo
        ↓
Builds from: 07_Website/ directory
```

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Where is site hosted? | Vercel |
| What does Bluehost do? | Domain registration only |
| How to deploy? | `git push origin main` |
| How long for deploy? | 1-2 minutes |
| Where to upload files? | Don't upload - use git push |
| Where to check deploy? | https://vercel.com/dashboard |

---

## If Site Still Not Updating

1. **Check Vercel deployment logs**
   - Go to Vercel dashboard → superimmersive8 → Latest deployment
   - Click "View Function Logs" or "Build Logs"
   - Look for errors

2. **Verify git push succeeded**
   ```bash
   git log origin/main -1
   # Should show your latest commit
   ```

3. **Check DNS (advanced)**
   - Visit https://dnschecker.org/#A/superimmersive8.com
   - Should point to Vercel IP, not Bluehost

4. **Clear all cache**
   - Close all browser tabs
   - Clear browser cache completely
   - Open fresh incognito window
   - Visit site

---

## Common Error Messages

### "This site can't be reached"
- DNS propagation in progress (wait 5-10 minutes)
- Or domain expired (check Bluehost domain status)

### "404 - File Not Found"
- Check Vercel Root Directory setting = `07_Website`
- Verify files exist in `07_Website/` folder in repo

### Build Failed on Vercel
- Check build logs in Vercel dashboard
- Verify HTML/CSS/JS syntax is valid
- No build step needed for static site

---

**Remember: Always deploy via git push, never via file upload!**
