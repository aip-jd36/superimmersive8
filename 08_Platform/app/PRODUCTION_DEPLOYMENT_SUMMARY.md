# Production Deployment Summary
**Date:** March 20-21, 2026
**Version:** Creator Portal v1.1 — Design Polish + Marketing Site Fixes

---

## What Was Deployed

### Features Live in Production

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (signup, login, logout) | ✅ Live | Supabase Auth + Resend email verification |
| Submission form (11 sections) | ✅ Live | PRD v3 spec, Add Tool modal, file uploads |
| File uploads (receipts) | ✅ Live | `/api/upload` server route, `submission-files` bucket |
| Stripe payment ($4.99 test / $499 prod) | ✅ Live | Test mode — switch to live keys when ready |
| Creator dashboard | ✅ Live | Submission list, status badges, summary cards |
| Creator submission detail page | ✅ Live | `/dashboard/submissions/[id]` — status banner, Chain of Title PDF download, catalog status, tool disclosure, rights confirmations |
| Admin panel (`/admin`) | ✅ Live | Review queue, approve/reject, Chain of Title generation |
| Chain of Title PDF generation | ✅ Live | react-pdf, 9-field format, stored in `documents` bucket |
| Public catalog (`/catalog`) | ✅ Live | Dark design theme, live DB fetch, video modal |
| Email notifications | ✅ Live | Creator + admin emails via Resend |
| SI8 design system (logged-in pages) | ✅ Live | Warm off-white palette (#FAFAF7), Space Grotesk + Inter fonts, amber (#C8900A) accent |
| Admin shared layout | ✅ Live | Nav with Admin badge, Review Queue + Catalog links |

---

## Bugs Fixed During Deployment (v1.0)

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Build fail: JSX in `.ts` file | `generateChainOfTitle.ts` needed `.tsx` | Renamed to `.tsx` |
| Build fail: wrong column types | `GenerateRightsPackageButton` expected `pdf_url`/`created_at` vs DB `document_url`/`generated_at` | Updated component types |
| Build fail: `tools_used` not in form schema | Replaced by `tools` state array | Fixed review section |
| Build fail: `display: 'inline-block'` in react-pdf | react-pdf only supports `flex`/`none` | Changed to `flex` |
| Build fail: `Uint8Array` type mismatch | PDF stream chunks can be `string | Buffer` | Cast to `Buffer` |
| File upload RLS rejection | Browser Supabase client doesn't send auth token to Storage | Server-side `/api/upload` route using service role |
| Admin email missing | `sendSubmissionReceivedEmail` only emailed creator | Added admin notification |
| Catalog not showing new entries | Next.js caches GET routes at build time | Added `export const dynamic = 'force-dynamic'` |
| Two Chain of Title cards | Admin page had duplicate inline card + `GenerateRightsPackageButton` | Removed duplicate |
| Old column names in generate route | Route used `pdf_url`/`pdf_generated_at` vs `document_url`/`generated_at` | Updated column names |
| `Cb.Component is not a constructor` | Next.js bundles `@react-pdf/renderer`, breaking its internal React reconciler | Added `experimental.serverComponentsExternalPackages` to `next.config.js` |

## Fixes Applied (v1.1 — March 21, 2026)

| Fix | Details |
|-----|---------|
| Creator submission detail page | Built `/dashboard/submissions/[id]` — status banner, PDF download button (approved only), catalog listing status, tool disclosure cards, rights confirmations (likeness/IP/audio/modification/territory) |
| Text overflow in submission detail | Added `break-words` to authorship statement, logline, and intended use fields |
| SI8 design system applied | Warm off-white palette applied to all logged-in pages via `globals.css` CSS variables. Space Grotesk added to font stack via `layout.tsx`. |
| Admin layout | Created `app/admin/layout.tsx` — shared nav with Admin badge, links to Review Queue and Catalog |
| Catalog dark theme | Restyled `/catalog` to match marketing site dark design (#0f0f0f bg, amber accent, Space Grotesk headings, dark cards with amber hover) |
| Marketing site redirects | Created `07_Website/vercel.json` with redirects: `/catalog`, `/auth/signup`, `/auth/login`, `/auth/admin/login`, `/rights-verified`, `/rights-verified/chain-of-title`, `/rights-verified/playbook` |
| Nav dropdown gap fix | Changed `top: calc(100% + 1rem)` → `top: 100%` + `padding-top: 1rem` on dropdown content — eliminates gap that caused menu to close before clicking |
| Rights Verified content width | Narrowed `.content` from `1200px → 860px` on chain-of-title and playbook pages; `1400px → 1000px` on overview page |
| newsite homepage additions | Added Sample Document section (Neon Dreams Chain of Title download CTA) and Contact section (Calendly + email) between FAQ and final CTA |

---

## Infrastructure Setup (Completed)

### Supabase Storage Buckets
| Bucket | Access | Purpose |
|--------|--------|---------|
| `submission-files` | Private | Creator receipt uploads, scoped by `{userId}/` |
| `documents` | Public | Chain of Title PDFs |
| `catalog-videos` | Public | (Reserved for future) |
| `catalog-thumbnails` | Public | (Reserved for future) |

### Database Schema Additions
```sql
-- rights_packages table
ADD COLUMN document_url text
ADD COLUMN document_path text
ADD COLUMN generated_at timestamp with time zone
ADD COLUMN format varchar(10) DEFAULT 'pdf'

-- Indexes
CREATE INDEX idx_rights_packages_submission_id ON rights_packages(submission_id)
CREATE INDEX idx_rights_packages_catalog_id ON rights_packages(catalog_id)
```

---

## Remaining Before Stripe Live Mode

- [ ] Switch Stripe to live keys in Vercel env vars
- [ ] Create live product in Stripe ($499.00)
- [ ] Update `VERIFICATION_PRICE_ID` in `lib/stripe.ts`
- [ ] Set up production Stripe webhook endpoint
- [ ] Update `NEXT_PUBLIC_SITE_URL` to custom domain (if using)

---

## Known Issues / Next Tasks

- Chain of Title shows "Unknown tool" when tool name isn't recognized — needs tool name mapping fix in submission form
- Test data (STEC_TEST, STEC_TEST3, TESTLINK) in production DB — clean up before real users
- Stripe is in test mode — all payments are $4.99 test amounts
- "Request License" on catalog sends email; no in-app licensing flow yet
- Marketing site and portal are on separate domains (`superimmersive8.com` vs `si8-creator-portal.vercel.app`) — unified domain is a future goal

---

## URL Map

| URL | What It Is |
|-----|-----------|
| `superimmersive8.com/newsite` | Marketing homepage (dark design) |
| `superimmersive8.com/newsite/rights-verified` | Rights Verified overview |
| `superimmersive8.com/rights-verified/chain-of-title` | → redirects to newsite page |
| `superimmersive8.com/rights-verified/playbook` | → redirects to newsite page |
| `superimmersive8.com/catalog` | → redirects to portal catalog |
| `superimmersive8.com/auth/signup` | → redirects to portal signup |
| `si8-creator-portal.vercel.app` | Creator portal (warm off-white design) |
| `si8-creator-portal.vercel.app/catalog` | Public catalog (dark design) |
| `si8-creator-portal.vercel.app/dashboard` | Creator dashboard |
| `si8-creator-portal.vercel.app/admin` | Admin review queue |

---

**Deployed by:** JD + Claude Sonnet 4.6
**Git branch:** main
**Hosting:** Vercel (auto-deploy from GitHub)
**Portal URL:** https://si8-creator-portal.vercel.app
**Marketing URL:** https://superimmersive8.com/newsite
