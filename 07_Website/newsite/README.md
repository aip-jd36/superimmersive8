# /newsite/ - SuperImmersive 8 v4 CaaS Website (Staging)

**Status:** Ready for Vercel deployment
**Design System:** Dark theme (#0f0f0f), amber accent (#f59e0b), Space Grotesk + Inter fonts
**URL Structure:** Clean URLs (folder/index.html pattern)

---

## File Structure

```
/newsite/
├── index.html                    ✅ Homepage
├── styles.css                    ✅ Shared styles
├── script.js                     ✅ Shared scripts (mobile menu, dropdowns)
│
├── how-it-works/
│   └── index.html                ✅ 4-stage process + 7 vetting categories
│
├── pricing/
│   └── index.html                ✅ $499 pricing + licensing tiers + comparison table
│
└── rights-verified/
    ├── index.html                ✅ Rights Verified overview
    ├── playbook/
    │   └── index.html            ✅ Full vetting criteria (7 categories)
    └── chain-of-title/
        └── index.html            ✅ 9-field Chain of Title schema
```

---

## Pages Created

### 1. Homepage (`/newsite/index.html`)
- Hero: "Chain of Title Verification for AI Video Content"
- Trusted by section
- The Problem (Adobe vs. SI8 vs. DIY)
- Two Paths: Verification ($499) + Showcase Marketplace (80/20 split)
- Social Proof / Testimonials
- FAQ
- Final CTA

**Navigation:**
- Logo → `/newsite`
- How It Works → `/newsite/how-it-works`
- Pricing → `/newsite/pricing`
- Browse Catalog → `/catalog`
- Rights Verified dropdown:
  - Overview → `/newsite/rights-verified`
  - Full Playbook → `/newsite/rights-verified/playbook`
  - Chain of Title → `/newsite/rights-verified/chain-of-title`
- Login dropdown:
  - Creator Login → `/auth/login`
  - Admin Login → `/auth/admin/login`
- Get Verified CTA → `/auth/signup`

**Language Selector:**
- EN (active) / 繁體中文 (links to `/newsite/zh/` - not yet built)

---

### 2. How It Works (`/newsite/how-it-works/index.html`)
- What is Chain of Title Verification?
- Why Brands Need It (3 risk categories)
- What You Get (9-field Chain of Title)
- 4-Stage Process:
  1. Submit Your Video (70-field form, $499 payment)
  2. We Review (Pre-Screen 15min + Full Review 60min)
  3. Risk Tier Assignment (Certified / Standard / Caution / Reject)
  4. Decision & Chain of Title Generation
- What We Check: 7 Vetting Categories (brief)
- Optional: Opt into Showcase Marketplace
- Final CTA

**Content Source:** Rights Playbook v0.1 + vetting criteria page

---

### 3. Pricing (`/newsite/pricing/index.html`)
- Hero: "Pricing - Simple, transparent. No hidden fees."
- Pricing Card: $499 per video
  - What's Included (8 checklist items)
  - Get Verified CTA
- Optional: Earn Passive Income from Licensing
  - 4 licensing tiers (Editorial, Non-Exclusive, Category-Exclusive, Fully Exclusive)
  - 80/20 split breakdown
- Compare to Alternatives (table: Adobe vs. DIY vs. SI8)
- Volume Discounts (Year 2 placeholder)
- FAQ (Pricing-specific: 7 questions)
- Final CTA

---

## Rights Verified Structure (Already Created)

### 4. Rights Verified Overview (`/newsite/rights-verified/index.html`)
- What Rights Verified is
- How it works (brief)
- Link to Full Playbook
- Link to Chain of Title schema

### 5. Full Playbook (`/newsite/rights-verified/playbook/index.html`)
- 7 vetting categories with pass/fail criteria
- The No List
- Summary table

### 6. Chain of Title (`/newsite/rights-verified/chain-of-title/index.html`)
- 9-field Chain of Title schema
- What each field means
- Why it matters

---

## Shared Components

### `styles.css`
- Extracted from `/07_Website/homepage-v4-mock.html`
- Dark theme: `--color-bg: #0f0f0f`, `--color-accent: #f59e0b`
- Fonts: Space Grotesk (display), Inter (body)
- Responsive breakpoints: 768px, 1024px
- Components: nav, hero, buttons, cards, grids, tables, footer

### `script.js`
- Mobile menu toggle
- Dropdown interactions (hover on desktop, click on mobile)
- Close menu when clicking links

---

## URL Patterns

**Clean URLs (no .html extensions):**
- `/newsite` → `/newsite/index.html`
- `/newsite/how-it-works` → `/newsite/how-it-works/index.html`
- `/newsite/pricing` → `/newsite/pricing/index.html`
- `/newsite/rights-verified` → `/newsite/rights-verified/index.html`
- `/newsite/rights-verified/playbook` → `/newsite/rights-verified/playbook/index.html`
- `/newsite/rights-verified/chain-of-title` → `/newsite/rights-verified/chain-of-title/index.html`

**Auth routes (not built yet):**
- `/auth/signup` (creator signup)
- `/auth/login` (creator login)
- `/auth/admin/login` (admin login)

**Catalog (not built yet):**
- `/catalog` (browse verified content)

---

## Next Steps

### Immediate (Before Vercel Deploy):
1. Test all pages locally (open in browser)
2. Verify all internal links work
3. Test mobile menu and dropdowns
4. Check responsive breakpoints

### Vercel Deployment:
1. Connect GitHub repo to Vercel
2. Set build directory: `/07_Website/newsite`
3. Deploy to staging URL (e.g., `si8-newsite.vercel.app`)
4. Test all pages on staging
5. Point custom domain when ready

### Future Enhancements:
- [ ] Add Traditional Chinese versions (`/newsite/zh/`)
- [ ] Build auth pages (`/auth/signup`, `/auth/login`)
- [ ] Build catalog page (`/catalog`)
- [ ] Add Google Analytics
- [ ] Add Stripe checkout integration for verification fee

---

## Design System

**Colors:**
- Background: `#0f0f0f`
- Surface: `#1a1a1a`
- Text: `#ffffff`
- Text Secondary: `#a0a0a0`
- Accent: `#f59e0b` (amber)
- Border: `#333`

**Typography:**
- Display: Space Grotesk (headings, titles)
- Body: Inter (paragraphs, UI text)

**Spacing:**
- Sections: 8rem padding vertical
- Cards: 3rem padding
- Grid gaps: 2rem

**Responsive:**
- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

---

## Notes

- All pages use shared `styles.css` and `script.js`
- Navigation is consistent across all pages
- Footer is consistent across all pages
- Language selector is visible but zh-TW versions not built yet
- External links (catalog, auth) point to placeholders
- Ready for Vercel deployment with clean URLs
