# Implementation Plan: RecordForm ($29 Creator Record)

**PRD:** `08_Platform/prds/PRD_RECORD_FORM.md`
**Status:** Mostly built (March 2026). URL migration pending.
**Route (current):** `/submit` (shared with CertForm)
**Route (target):** `/record`

---

## Current State

RecordForm is functionally complete. The following has been built and is live in production:

| Feature | Status | Notes |
|---------|--------|-------|
| Submit form (10 sections) | ✅ Live | `app/submit/page.tsx` — tier selection at top of Section 1 |
| $29 Stripe checkout | ✅ Live | `api/checkout/create-session/route.ts` — routes to $29 product when `tier='creator_record'` |
| Stripe webhook auto-approve | ✅ Live | `api/webhooks/stripe/route.ts` — auto-sets status='approved' for creator_record tier |
| Creator Record PDF auto-generation | ✅ Live | `generateCreatorRecordPDF()` called in webhook; uploads to `documents` bucket |
| Approval email (creator + admin) | ✅ Live | `sendCreatorRecordApprovedEmail()` in `lib/emails.ts` |
| Admin retry button | ✅ Live | `api/admin/submissions/[id]/generate-creator-record/route.ts` with `?force=true` |
| Creator dashboard — submission list | ✅ Live | `app/dashboard/page.tsx` |
| Creator dashboard — submission detail | ✅ Live | `app/dashboard/submissions/[id]/page.tsx` — PDF download gated to approved status |
| DB columns: `tier`, `submission_mode` | ✅ Live | Migration `20260323000000_add_tier_and_submission_mode.sql` confirmed applied |
| Sections 5/6 licensed content path | ✅ Live | `has_licensed_content` + `license_notes` stored in JSONB |
| Section 7 audio file upload | ✅ Live | `license_path` stored in `audio_disclosure` JSONB when `audio_source='licensed'` |

---

## File Map

### Form
- `app/app/submit/page.tsx` — Main form (10 sections, tier selection in Section 1, Evidence Custodian in Section 4, Indemnification in Section 10)
- `components/AddToolModal.tsx` — Tool disclosure modal; `requireReceipt` prop is `false` for Creator Record (receipts optional)

### Payment
- `app/app/api/checkout/create-session/route.ts` — Creates Stripe session; accepts `tier` param; routes to `STRIPE_PRICE_CREATOR_RECORD_ID` ($29) or `STRIPE_PRICE_SI8_CERTIFIED_ID` ($499)
- `app/app/api/webhooks/stripe/route.ts` — On payment success:
  - Sets `status='approved'` and `payment_status='paid'` for creator_record tier
  - Calls `generateCreatorRecordPDF()`
  - Calls `sendCreatorRecordApprovedEmail()`
  - Sets `status='pending'` for si8_certified tier (goes to human review queue)

### PDF
- `app/lib/pdf/CreatorRecordPDF.tsx` — React PDF component (amber/gold, 2 pages, "SELF-ATTESTED — NOT FOR COMMERCIAL USE" stamp)
- `app/lib/pdf/generateChainOfTitle.tsx` — Contains `generateCreatorRecordPDF()`: assigns `CR-YYYY-{id-prefix}`, renders PDF, uploads to `documents` Supabase bucket, upserts `rights_packages` row

### Emails
- `app/lib/emails.ts` — Contains:
  - `sendCreatorRecordApprovedEmail(submission)` — creator email (amber CTA, upgrade pitch) + admin awareness email
  - `sendSubmissionReceivedEmail()` — receipt on form submit (shared with CertForm)

### Admin
- `app/app/api/admin/submissions/[id]/generate-creator-record/route.ts` — Manual PDF retry; always passes `force=true`; returns PDF URL
- `app/app/admin/submissions/[id]/page.tsx` — Admin submission detail; shows "Generate Creator Record" button for creator_record tier submissions

### Database
- `submissions` table: `tier` ('creator_record' | 'si8_certified'), `submission_mode` ('creator' | 'agency'), all form data stored as JSONB
- `rights_packages` table: auto-upserted on Creator Record PDF generation with placeholder values for all NOT NULL fields
- `opt_ins` table: created when creator checks catalog opt-in in Section 10 (Video & Showcase)
- Storage bucket `documents`: Creator Record PDFs stored here; accessible via signed URL for creator download

---

## Remaining Work

### 1. URL Migration: `/submit` → `/record`

**Current behavior:** Both RecordForm and CertForm share `/submit`. The tier is selected via a radio button in Section 1. When the user selects SI8 Certified, the form behaves as CertForm. When they select Creator Record, it behaves as RecordForm.

**Target behavior:** Two separate routes:
- `/record` — RecordForm only. No tier selector. `tier` hardcoded to `'creator_record'`.
- `/certify` — CertForm only. No tier selector. `tier` hardcoded to `'si8_certified'`.

**Implementation steps:**
1. Create `app/app/record/page.tsx` — copy current `submit/page.tsx`; remove tier selection UI; hardcode `tier = 'creator_record'` in form state and checkout API call
2. Remove CertForm-specific sections from the RecordForm copy (they don't exist yet, but as CertForm gets built, keep `/record` clean)
3. Update all internal links to use `/record` instead of `/submit` for Creator Record flow
4. Keep `/submit` active during transition until CertForm is live at `/certify`; then deprecate `/submit`
5. Add redirect in `next.config.js` or `vercel.json`: `/submit` → `/record` (after both new routes are live)

**Files to touch:**
- Create `app/app/record/page.tsx`
- `app/app/page.tsx` — update CTA links
- `app/app/dashboard/page.tsx` — update "New Submission" link
- Marketing site `07_Website/newsite/index.html` — update CTA href from `/submit` to `/record`

### 2. Known Bug: "Unknown Tool" in Admin Panel

**Issue:** The add-tool modal saves tool name as `tool.tool_name`. The admin submission detail page reads `tool.tool`. These are different keys — admin shows "Unknown tool".

**Fix:**
- Option A (recommended): Update admin display to read `tool.tool_name || tool.tool` (backwards-compatible)
- Option B: Update `AddToolModal.tsx` to save as `tool.tool` — requires re-testing existing submissions

**File:** `app/app/admin/submissions/[id]/page.tsx` — wherever tool list is rendered

### 3. Stripe Live Mode

**Current:** Test mode keys in `.env.local`
**Required before launch:**
- Replace `STRIPE_SECRET_KEY` with live key
- Replace `STRIPE_WEBHOOK_SECRET` with live webhook secret
- Create live Stripe products for Creator Record ($29) and SI8 Certified ($499)
- Replace `STRIPE_PRICE_CREATOR_RECORD_ID` and `STRIPE_PRICE_SI8_CERTIFIED_ID` env vars with live product IDs
- Test with real card before any marketing goes live

### 4. Test Data Cleanup

Remove from production Supabase DB:
- Submission records with email containing "TEST" (STEC_TEST, STEC_TEST3)
- Submission with `video_url` containing "TESTLINK"
- Corresponding `rights_packages`, `opt_ins` records

---

## Environment Variables (RecordForm-specific)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_CREATOR_RECORD_ID=   # $29 product
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_SITE_URL=
```

---

## Test Plan

Before marking URL migration complete:

1. **Full RecordForm flow at `/record`:**
   - Submit form with all required fields
   - Verify `tier='creator_record'` in DB
   - Complete $29 Stripe test payment
   - Verify webhook sets `status='approved'`
   - Verify Creator Record PDF auto-generated in `documents` bucket
   - Verify creator email received (amber design, upgrade CTA)
   - Verify admin awareness email received
   - Log into dashboard → submission detail → download PDF

2. **Licensed content path:**
   - In Section 5 or 6, check "I have a license on file"
   - Enter license notes
   - Verify PDF shows `[Y] Licensed content — creator holds rights documentation` + notes

3. **Audio licensed path:**
   - Select "Licensed" in Section 7 audio
   - Upload file
   - Verify `audio_disclosure.license_path` stored in DB

4. **Admin retry:**
   - Use admin panel → submission detail → "Generate Creator Record" button
   - Verify PDF regenerated and URL updated

5. **Catalog opt-in:**
   - Check opt-in in Section 10
   - Verify `opt_ins` row created with `visible=false`
   - Admin catalog → toggle to visible
   - Verify film appears in `/catalog`

---

## What RecordForm Does NOT Need

The following were explicitly deferred (see PRD) and should NOT be added:

- File uploads for likeness/IP licensed paths (text description is correct for this tier)
- Fair Use path (creates false confidence at self-attested tier)
- Scene-level attribution
- Risk Rating output (requires human reviewer)
- Production evidence upload
- Vendor warranties
- Commercial context fields (budget, distribution channels)
- Brand safety categories
