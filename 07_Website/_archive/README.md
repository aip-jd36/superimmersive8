# Website Archive — v3 Site Files
**Archived:** [DATE — to be filled when migration runs]
**Reason:** v4 site (CaaS positioning) promoted to root. These files preserved for reference and rollback.

---

## What's Here

These are the original v3 website files that were live at `www.superimmersive8.com` before the v4 migration. The v3 site was built around the Rights Agency + AI Product Placement model (superseded by the CaaS model in March 2026).

| File | Description |
|------|-------------|
| `index.html` | v3 English homepage |
| `index-zh.html` | v3 Traditional Chinese homepage |
| `styles.css` | v3 site stylesheet |
| `script.js` | v3 site JavaScript |
| `pricing.html` | v3 pricing page (English) |
| `pricing-zh.html` | v3 pricing page (Traditional Chinese) |
| `rights-verified-chain-of-title.html` | Rights Verified — Chain of Title page |
| `rights-verified-how-it-works.html` | Rights Verified — How It Works page |
| `rights-verified-legal-brief.html` | Rights Verified — Legal Brief page |
| `rights-verified-rights-playbook.html` | Rights Verified — Rights Playbook page |
| `rights-verified-vetting-criteria.html` | Rights Verified — Vetting Criteria page |
| `submit.html` | Old submission intake form |
| `submit.css` | Old submission form styles |
| `submit.js` | Old submission form JavaScript |
| `homepage-v4-mock.html` | Early v4 homepage mockup (never published) |
| `authorship-examples.html` | Authorship examples reference page |
| `risk-briefing.html` | Risk briefing product page |
| `confirmation.html` | Old form confirmation page |
| `filmmaker-terms.html` | Filmmaker terms page |

---

## How to Restore the v3 Site

### Option A — Vercel instant rollback (fastest, no git needed)
1. Go to Vercel dashboard → SI8 marketing site project → Deployments
2. Find the deployment tagged `Checkpoint: pre-v4 migration`
3. Click "..." → "Promote to Production"
4. Done in ~30 seconds

### Option B — Restore files from this archive
```bash
# From the repo root
cp 07_Website/_archive/index.html 07_Website/index.html
cp 07_Website/_archive/styles.css 07_Website/styles.css
cp 07_Website/_archive/script.js 07_Website/script.js
# ... repeat for any other files needed

git add -A
git commit -m "Restore v3 site from archive"
git push origin main
```

### Option C — Full v3 restore
```bash
# Copy all archived files back to root
cp 07_Website/_archive/*.html 07_Website/
cp 07_Website/_archive/*.css 07_Website/
cp 07_Website/_archive/*.js 07_Website/

git add -A
git commit -m "Full v3 site restore from archive"
git push origin main
```

---

## v3 Site Context

- **Model:** Rights Agency + AI Product Placement (B2B agency sales)
- **Positioning:** "The trusted operator at the intersection of AI creators, rights, and commercial deployment"
- **Built:** January–March 2026
- **Superseded by:** v4 CaaS model (March 2026) — see `BUSINESS_PLAN_v4.md`
- **Why archived (not deleted):** Legal/compliance reference, design reference, potential content reuse

---

## Do Not Delete

These files should remain in `_archive/` indefinitely. They represent a complete working version of the site and are a useful fallback and design reference.
