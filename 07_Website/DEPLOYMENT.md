# SuperImmersive 8 Website — Deployment Guide

## Tech Stack

- **Frontend:** Static HTML/CSS/JS (single page)
- **Hosting:** Bluehost (cPanel)
- **Domain:** www.superimmersive8.com
- **Git:** https://github.com/aip-jd36/superimmersive8.git
- **Forms:** Formspree (to be configured)
- **Calendar:** Calendly (https://calendly.com/aipenguins/superimmersive8)

---

## Files to Deploy

Only these 3 files from `07_Website/`:

```
index.html
styles.css
script.js
```

---

## Deployment to Bluehost

### Step 1: Clean Out WordPress

1. Log in to Bluehost → cPanel
2. Click **File Manager**
3. Navigate to `public_html/`
4. Delete all WordPress files:
   - `wp-admin/`
   - `wp-content/`
   - `wp-includes/`
   - `wp-config.php`
   - `index.php`
   - `.htaccess` (backup first if you have custom rules)
   - All other WP files

**Tip:** You can move them to a `_wordpress_backup/` folder instead of deleting.

### Step 2: Upload Static Files

1. In File Manager, still in `public_html/`
2. Click **Upload**
3. Upload these 3 files:
   - `index.html`
   - `styles.css`
   - `script.js`

### Step 3: Test

1. Visit www.superimmersive8.com
2. Check:
   - Site loads
   - Mobile responsive
   - Calendly link works
   - Navigation works
   - Contact form shows (will need Formspree setup later)

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

## Future: Vercel Auto-Deploy (Optional)

If you want automatic deployment from GitHub:

1. Sign up at vercel.com
2. Import GitHub repo: `aip-jd36/superimmersive8`
3. Set **Root Directory** to `07_Website`
4. Deploy
5. Point domain DNS to Vercel (or keep Bluehost)

**Benefit:** Every git push auto-deploys. No manual upload.

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
