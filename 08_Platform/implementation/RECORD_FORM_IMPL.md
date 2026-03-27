# Implementation Plan: RecordForm ($29 Creator Record)

**PRD:** `08_Platform/prds/PRD_RECORD_FORM.md`
**Status:** Complete — live in production (March 2026)
**Route:** `/record` (`/submit` redirects here)

---

## Current State — All Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Submit form (10 sections) | ✅ Live | `app/record/page.tsx` — tier hardcoded to `creator_record` |
| $29 Stripe checkout | ✅ Live | `api/checkout/create-session/route.ts` — `allow_promotion_codes: true` |
| Stripe webhook auto-approve | ✅ Live | `api/webhooks/stripe/route.ts` — auto-sets status='approved' for creator_record tier |
| Creator Record PDF auto-generation | ✅ Live | `generateCreatorRecordPDF()` called in webhook; uploads to `documents` bucket |
| Approval email (creator + admin) | ✅ Live | `sendCreatorRecordApprovedEmail()` in `lib/emails.ts` |
| Admin retry button | ✅ Live | `api/admin/submissions/[id]/generate-creator-record/route.ts` with `?force=true` |
| Creator dashboard — submission list | ✅ Live | `app/dashboard/page.tsx` |
| Creator dashboard — submission detail | ✅ Live | `app/dashboard/submissions/[id]/page.tsx` — PDF download gated to approved status |
| DB columns: `tier`, `submission_mode` | ✅ Live | Migration `20260323000000_add_tier_and_submission_mode.sql` confirmed applied |
| Sections 5/6 licensed content path | ✅ Live | `has_licensed_content` + `license_notes` stored in JSONB |
| Section 7 audio file upload | ✅ Live | `license_path` stored in `audio_disclosure` JSONB; upload uses live session userId (not stale state) |
| URL migration `/submit` → `/record` | ✅ Live | `app/record/page.tsx` is canonical; `app/submit/page.tsx` is a redirect |
| "Unknown tool" bug | ✅ Fixed | Admin reads `tool.tool_name \|\| tool.tool` |
| Stripe live mode | ✅ Live | sk_live + whsec_live in Vercel env vars (Mar 27, 2026) |
| Test data cleanup | ✅ Done | All test submissions deleted; only "Cloud World" remains in prod DB |
| Promo codes | ✅ Live | 4 tiers in live mode: EARLY10 (10%), AGENCY30 (30%), BETA-[NAME] (50%), COMP-[NAME] (100%) |
| Custom domain | ✅ Live | `app.superimmersive8.com` (CNAME → Vercel) |

---

## File Map

### Form
- `app/app/record/page.tsx` — RecordForm (10 sections, tier hardcoded to `creator_record`, audio upload uses live session)
- `app/app/submit/page.tsx` — Redirect to `/record` only
- `components/AddToolModal.tsx` — Tool disclosure modal; `requireReceipt` prop is `false` for Creator Record (receipts optional)

### Payment
- `app/app/api/checkout/create-session/route.ts` — Creates Stripe session; `allow_promotion_codes: true`; routes to $29 for creator_record
- `app/app/api/webhooks/stripe/route.ts` — On payment success: sets `status='approved'`, calls `generateCreatorRecordPDF()`, calls `sendCreatorRecordApprovedEmail()`

### PDF
- `app/lib/pdf/CreatorRecordPDF.tsx` — React PDF component (amber/gold, 2 pages, "SELF-ATTESTED — NOT FOR COMMERCIAL USE" stamp)
- `app/lib/pdf/generateChainOfTitle.tsx` — Contains `generateCreatorRecordPDF()`: assigns `CR-YYYY-{id-prefix}`, renders PDF, uploads to `documents` Supabase bucket, upserts `rights_packages` row

### Emails
- `app/lib/emails.ts` — `sendCreatorRecordApprovedEmail()`: creator email (amber CTA, upgrade pitch) + admin awareness email

### Admin
- `app/app/api/admin/submissions/[id]/generate-creator-record/route.ts` — Manual PDF retry; always passes `force=true`
- `app/app/admin/submissions/[id]/page.tsx` — Admin submission detail; shows "Generate Creator Record" button for creator_record tier

### Database
- `submissions` table: `tier` ('creator_record' | 'si8_certified'), `submission_mode` ('creator' | 'agency')
- `rights_packages` table: auto-upserted on Creator Record PDF generation with placeholder values for all NOT NULL fields
- `opt_ins` table: created when creator checks catalog opt-in in Section 10
- Storage bucket `documents`: Creator Record PDFs stored here; accessible via signed URL

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=sk_live_...         # live mode
STRIPE_WEBHOOK_SECRET=whsec_live_...  # live mode webhook
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
RESEND_API_KEY=
NEXT_PUBLIC_SITE_URL=https://app.superimmersive8.com
```

---

## Stripe Promo Codes Setup (Live Mode)

| Coupon | Discount | Code Style | Max Redemptions |
|--------|----------|------------|-----------------|
| SI8 Early Adopter | 10% | Shared: `EARLY10` | 200 total |
| SI8 Partner | 30% | Shared: `AGENCY30` | 50 total |
| SI8 Beta | 50% | Per-person: `BETA-[NAME]` | 1 per code |
| SI8 Complimentary | 100% | Per-person: `COMP-[NAME]` | 1 per code |

Per-person codes created on-demand: Stripe Dashboard → Coupons → [Coupon] → Promotion Codes → Add code.

---

## Completed Test Plan

- [x] Full RecordForm flow at `/record` — submit → pay → webhook → auto-approve → PDF → email
- [x] Licensed content path (Sections 5/6)
- [x] Audio licensed path (Section 7 file upload)
- [x] Admin retry button
- [x] Catalog opt-in → admin toggle → appears in showcase
- [x] Promo code (EARLY10) → correct discount applied at checkout
- [x] 100% off promo code (COMP-TEST-LIVE) → $0 live payment → auto-approve + PDF
- [x] Custom domain redirect flow (`app.superimmersive8.com`)

---

## What RecordForm Does NOT Need

The following are intentionally deferred (see PRD):
- File uploads for likeness/IP licensed paths (text description correct for this tier)
- Fair Use path (creates false confidence at self-attested tier)
- Scene-level attribution
- Risk Rating output (requires human reviewer)
- Production evidence upload
- Commercial context fields (budget, distribution channels)
- Brand safety categories
