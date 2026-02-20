# SuperImmersive 8 Website — Deployment Guide

## Tech Stack

- **Frontend:** Static HTML/CSS/JS
- **Hosting:** Vercel (auto-deploy from GitHub)
- **Domain:** www.superimmersive8.com (DNS points to Vercel)
- **Git:** https://github.com/aip-jd36/superimmersive8.git
- **Vercel Project:** superimmersive8
- **Root Directory:** `07_Website/`
- **Forms:** Formspree
- **Calendar:** Calendly (https://calendly.com/aipenguins/superimmersive8)

**IMPORTANT:**
- Site is deployed on Vercel, NOT Bluehost
- Bluehost only manages domain registration
- Do NOT upload files to Bluehost cPanel

---

## Files to Deploy

Only these 3 files from `07_Website/`:

```
index.html
styles.css
script.js
```

---

## Deployment Process (Vercel Auto-Deploy)

### How It Works

1. Make changes to files in `07_Website/`
2. Git commit: `git add . && git commit -m "Description"`
3. Git push: `git push origin main`
4. Vercel detects push automatically
5. Builds from `07_Website/` directory
6. Deploys to production in ~2 minutes

### Monitoring Deployments

**Vercel Dashboard:** https://vercel.com/dashboard
- Click on `superimmersive8` project
- See deployment status: Building → Deploying → Ready
- View logs if deployment fails

### Testing After Deploy

1. Visit www.superimmersive8.com
2. Check:
   - Site loads with latest changes
   - Mobile responsive
   - Calendly link works
   - Navigation works
   - Risk Briefing page loads

---

## Git Workflow

### First Time Push (When Internet Stable)

```bash
git push -u origin main
```

### Regular Updates

```bash
# Make changes to files
git add 07_Website/
git commit -m "Description of changes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push
```

---

## Formspree Setup (TODO)

1. Go to https://formspree.io
2. Sign up (free, 50 submissions/month)
3. Create a new form
4. Copy the form endpoint (looks like: `https://formspree.io/f/xyzabc123`)
5. Replace `YOUR_FORM_ID` in `index.html` line 325:
   ```html
   <form class="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

---

## Vercel Configuration (Already Set Up)

**Project:** superimmersive8
**Framework Preset:** Other
**Root Directory:** `07_Website`
**Build Command:** None (static site)
**Output Directory:** None (uses root)

**Domain Configuration:**
- `superimmersive8.com` → Production (redirect to www)
- `www.superimmersive8.com` → Production (primary)
- `superimmersive8.vercel.app` → Production (Vercel subdomain)

**Auto-Deploy:** Enabled for `main` branch

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Site not loading | Check `public_html/` has only 3 files |
| SSL/HTTPS error | Check Bluehost SSL certificate is enabled |
| Form not working | Add Formspree ID |
| Calendly not opening | Check link: https://calendly.com/aipenguins/superimmersive8 |
| Mobile broken | Clear browser cache |

---

## Quick Deploy Checklist

- [ ] Remove WordPress files from `public_html/`
- [ ] Upload `index.html`, `styles.css`, `script.js`
- [ ] Test site loads
- [ ] Test mobile responsive
- [ ] Test Calendly link
- [ ] Set up Formspree (when ready)
- [ ] Git commit and push changes
- [ ] SSL/HTTPS working

---

**Last Updated:** January 2026
