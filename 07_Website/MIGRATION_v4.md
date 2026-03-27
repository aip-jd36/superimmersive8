# Website Migration: v3 → v4
**Status:** PLANNED — not yet executed
**Date planned:** March 27, 2026
**Goal:** Promote `07_Website/newsite/` to root, replacing the old v3 site at `www.superimmersive8.com`

---

## Background

The v4 site (CaaS positioning: "Get Your AI Video Cleared for Commercial Use") was built inside `07_Website/newsite/` to allow parallel development without disrupting the live v3 site. All internal links in the v4 files use `/newsite/` as a path prefix (e.g., `href="/newsite/pricing"`). This migration removes that prefix and makes v4 the canonical site.

---

## Current File Structure (Pre-Migration)

```
07_Website/
├── index.html                        ← v3 homepage (LIVE at www.superimmersive8.com)
├── index-zh.html                     ← v3 Chinese homepage
├── styles.css                        ← v3 styles
├── script.js                         ← v3 scripts
├── pricing.html                      ← v3 pricing
├── pricing-zh.html                   ← v3 Chinese pricing
├── rights-verified-chain-of-title.html
├── rights-verified-how-it-works.html
├── rights-verified-legal-brief.html
├── rights-verified-rights-playbook.html
├── rights-verified-vetting-criteria.html
├── submit.html / submit.css / submit.js
├── homepage-v4-mock.html
├── authorship-examples.html
├── risk-briefing.html
├── confirmation.html
├── filmmaker-terms.html
├── vercel.json                       ← redirects (some point to /newsite/)
├── images/                           ← shared image assets
├── si8-logo.svg
├── api/                              ← Vercel serverless functions (untouched)
└── newsite/                          ← v4 site (currently at /newsite)
    ├── index.html
    ├── styles.css
    ├── script.js
    ├── how-it-works/index.html
    ├── pricing/index.html
    ├── rights-verified/index.html
    ├── rights-verified/chain-of-title/index.html
    ├── rights-verified/playbook/index.html
    └── zh/
        ├── index.html
        ├── how-it-works/index.html
        ├── pricing/index.html
        ├── rights-verified/index.html
        ├── rights-verified/chain-of-title/index.html
        └── rights-verified/playbook/index.html
```

---

## Target File Structure (Post-Migration)

```
07_Website/
├── index.html                        ← v4 homepage (promoted from newsite/)
├── styles.css                        ← v4 styles
├── script.js                         ← v4 scripts
├── how-it-works/index.html
├── pricing/index.html
├── rights-verified/index.html
├── rights-verified/chain-of-title/index.html
├── rights-verified/playbook/index.html
├── zh/
│   ├── index.html
│   ├── how-it-works/index.html
│   ├── pricing/index.html
│   ├── rights-verified/index.html
│   ├── rights-verified/chain-of-title/index.html
│   └── rights-verified/playbook/index.html
├── vercel.json                       ← simplified (rights-verified redirects removed)
├── images/
├── si8-logo.svg
├── api/                              ← untouched
├── _archive/                         ← all v3 files (see _archive/README.md)
└── newsite/                          ← emptied / removed after promotion
```

---

## Migration Steps

### Step 0 — Git Checkpoint
```bash
cd /Users/JD/Desktop/SuperImmersive8
git add -A
git commit -m "Checkpoint: pre-v4 migration — v3 site live, newsite ready"
git push origin main
```

### Step 1 — Create `_archive/` and move v3 files
Move all old v3 root files into `07_Website/_archive/`. See `_archive/README.md` for full list.

### Step 2 — Move v4 files from `newsite/` to root
```
newsite/index.html                        → index.html
newsite/styles.css                        → styles.css
newsite/script.js                         → script.js
newsite/how-it-works/                     → how-it-works/
newsite/pricing/                          → pricing/
newsite/rights-verified/                  → rights-verified/
newsite/zh/                               → zh/
```

### Step 3 — Strip `/newsite` prefix from all internal links
Global find/replace across all moved HTML files:
- `/newsite/` → `/`
- `href="/newsite"` → `href="/"`

This covers: stylesheet links, script tags, nav links, footer links, CTA hrefs, language toggle links.

Files affected:
- `index.html`
- `how-it-works/index.html`
- `pricing/index.html`
- `rights-verified/index.html`
- `rights-verified/chain-of-title/index.html`
- `rights-verified/playbook/index.html`
- `zh/index.html`
- `zh/how-it-works/index.html`
- `zh/pricing/index.html`
- `zh/rights-verified/index.html`
- `zh/rights-verified/chain-of-title/index.html`
- `zh/rights-verified/playbook/index.html`

### Step 4 — Simplify `vercel.json`
Remove the 6 rights-verified redirect rules that pointed to `/newsite/...` — they are no longer needed since the files now live at the correct paths directly.

Keep all creator portal redirects (/catalog, /showcase, /certify, /record, /auth/*, etc.).

### Step 5 — Remove `newsite/` folder
The `newsite/` directory is now empty (all files moved). Remove it.

### Step 6 — Commit and push
```bash
git add -A
git commit -m "v4 site migration: promote newsite/ to root, archive v3 files"
git push origin main
```

---

## Rollback Procedure

If anything breaks after the v4 migration:

**Option A — Vercel instant rollback (fastest)**
1. Go to Vercel dashboard → Deployments
2. Find the last working deployment (the checkpoint commit)
3. Click "..." → "Promote to Production"
4. Site is back to v3 in ~30 seconds. No git changes needed.

**Option B — Git revert**
```bash
git revert HEAD
git push origin main
```
Vercel auto-deploys the revert. Site back to v3 in ~2 minutes.

**Option C — Manual restore from `_archive/`**
If you need to restore specific v3 files:
```bash
cp 07_Website/_archive/index.html 07_Website/index.html
# repeat for any other files
git add -A && git commit -m "Restore v3 [file]" && git push origin main
```

---

## Post-Migration Verification Checklist

- [ ] `www.superimmersive8.com` loads v4 homepage
- [ ] `/how-it-works` loads correctly
- [ ] `/pricing` loads correctly
- [ ] `/rights-verified` loads correctly
- [ ] `/rights-verified/chain-of-title` loads correctly
- [ ] `/rights-verified/playbook` loads correctly
- [ ] `/zh` loads Chinese homepage
- [ ] Language toggle (EN ↔ 繁體中文) works on all pages
- [ ] Nav dropdown (Rights Verified submenu) works
- [ ] All CTAs link to correct destinations (creator portal, Calendly, etc.)
- [ ] `/record` → creator portal RecordForm
- [ ] `/certify` → creator portal CertForm
- [ ] `/catalog` → creator portal Showcase
- [ ] Styles and fonts load correctly (no broken CSS)
- [ ] Mobile responsive on iPhone

---

## Notes

- `api/` folder is untouched throughout — Vercel serverless functions are unaffected
- `images/` folder stays at root — v4 files already reference `/images/` not `/newsite/images/`
- `si8-logo.svg` stays at root
- Google Analytics (G-628BLE9N15) is already in all v4 HTML files — no changes needed
