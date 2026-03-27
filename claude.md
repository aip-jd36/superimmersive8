# SuperImmersive 8 (SI8) - Project Context

## Business Overview

**SuperImmersive 8** is an AI film distribution agency based in Taipei, Taiwan.

**Tagline:** *"The trusted operator at the intersection of AI creators, rights, and commercial deployment."*

### The Two-Layer Business Model

| Layer | What | Visibility | Purpose |
|-------|------|------------|---------|
| **Layer 1: Production** | B2B AI video production for agencies | Private (B2B sales) | Pays the bills, scouts filmmakers |
| **Layer 2: Distribution** | Filmmaker representation, licensing, events | Public (website, brand) | Builds the scalable platform |

**Transition Plan:**
- Year 1: 60% production / 40% distribution
- Year 2: 40% production / 60% distribution
- Year 3+: 20% production / 80% distribution (goal)

### v4 Strategy: Compliance as a Service + Creator Platform (Current Direction — March 2026)

**Major pivot from v3:** From Rights Agency (product placement) to **Compliance Infrastructure Provider** with opt-in marketplace.

**SI8 identity:** B2B compliance infrastructure for AI video content, with a creator marketplace built on top of the verification service.

**The three-gear model:**
- **Gear A (CaaS Foundation — PRIMARY):** B2B verification service at $499/video. Production houses, agencies, brands submit AI video → SI8 reviews (90 min) → Chain of Title documentation delivered. Immediate cash revenue.
- **Gear B (Showcase Marketplace — SECONDARY):** After Gear A verification, creator sees checkbox: "List in catalog for licensing opportunities?" If yes → film appears on superimmersive8.com with Rights Verified badge. Buyers discover → license → SI8 takes 20% commission. Passive recurring revenue.
- **Gear C (Producer Track — TERTIARY):** JD curates custom slates for whale buyers (MyVideo). High-touch, premium pricing ($10K-$20K per slate). Uses Gears A+B as infrastructure.

**Why this pivot:** v3 deadlock (chicken-egg: need creators for buyers, buyers for creators) blocked execution. Filmmaker feedback (Essa, Leon) showed 20% royalty + unproven platform = not compelling. Buyer feedback (Isaac, The Media Shop) showed "need examples first" → no catalog without creators. **CaaS solves this:** Verification customers pay upfront ($499), then OPT-IN to become marketplace inventory. No separate creator recruitment needed.

**Key positioning:** "CarFax for AI video — verification service with discovery marketplace byproduct."

**Competitive differentiation:** "Adobe verifies Firefly only. We verify Sora/Runway/Kling — the tools legal teams are blocking."

**Year 1 message:** "Get Chain of Title documentation for AI video. $499 per video, 5-day turnaround."

**Internal framing:** "The file is the carrier. The Chain of Title is the product."

**SI8's moat = judgment layer:** C2PA/Content Credentials will commoditize provenance metadata. SI8's value is subjective legal review (IP risk, likeness assessment, training data liability) — cannot be automated.

**Opt-in flywheel:** More verifications → more opt-ins → larger catalog → more buyer traffic → more verifications.

**Platform architecture:** Supabase (auth + database + file storage), Next.js frontend, creator login/dashboard, admin review panel, public catalog. Built from day one for Year 3 self-serve scale.

**Conflict of interest:** PMF Strategy Inc. (legal entity) / SI8 (DBA). JD acts as Producer for Gear C deals, SI8 acts as independent verifier for Gear A clients. Role disclosed in each transaction.

**Long-term outcomes (all acceptable):** High-earning services agency / self-serve platform / VC-backed platform. Year 1-2 work is the same regardless. VC path is upside, not a requirement.

**Business plan versions:**
- `BUSINESS_PLAN_v1.md` — supply-side first (archived, January 2026)
- `BUSINESS_PLAN_v2.md` — demand-side first (superseded by v3, February 2026)
- `BUSINESS_PLAN_v3.md` — Rights Agency + AI Product Placement (superseded by v4, February-March 2026)
- `BUSINESS_PLAN_v4.md` — Compliance as a Service + Creator Platform (current, March 2026)
- `VERSION_HISTORY.md` — version log

**Peer Review Validation (March 2026):**

Both ChatGPT (Claude Opus) and Gemini validated the v4 CaaS model:

- **Two-sided CarFax model consensus:** Verification service (Side A) pays for business, marketplace (Side B) is long-term value multiplier
- **Opt-in flywheel solves chicken-egg:** Verification customers become marketplace inventory automatically — no separate creator recruitment
- **Platform required from day one:** Creator auth, submission tracking, opt-in toggles, admin panel required for model to function efficiently
- **Judgment layer is the moat:** As C2PA commoditizes provenance metadata, human legal review becomes MORE valuable
- **Parallel execution (Gemini's emphasis):** Close MyVideo immediately (Month 1), build platform in parallel, launch CaaS Month 2 — don't delay whale deal to build infrastructure first

See: `PEER_REVIEW_SUMMARY_CAAS.md` for full synthesis

### Revenue Model (Year 1 Target: $80-120K)

**Two-tier pricing (updated March 2026):**
- **Creator Record** — $29 early access (~~$49~~) · Self-attested, automated, PDF stamp "SELF-ATTESTED — NOT FOR COMMERCIAL USE" · Funnel mechanism, not primary revenue
- **SI8 Certified** — $499 · 90-minute human review, PDF stamp "CLEARED FOR COMMERCIAL USE" · Primary revenue driver

**Three-gear revenue streams:**

| Stream | Target | How |
|--------|--------|-----|
| **CaaS (Gear A)** | $30-40K | $499/video × 60-70 SI8 Certified verifications |
| **Showcase (Gear B)** | $6-10K | 20% commission on 10 licensing deals ($30-50K GMV) |
| **Producer (Gear C)** | $20-40K | MyVideo $10K + 2-3 additional whale deals |
| **Layer 1 Production (optional)** | $20-30K | If needed to supplement revenue |

**Unit economics:**
- Creator Record: $29 revenue, ~$1.50 cost (Stripe) = 95% gross margin (funnel, not revenue focus)
- SI8 Certified: $499 revenue, ~$17 cost (Stripe + platform overhead) = 97% gross margin
- Showcase licensing: 20% commission (creator keeps 80%), ~85% margin after platform fees
- Producer curation: 50% to filmmaker, 50% to SI8 (after absorbing verification cost internally)

### Geographic Strategy: Parallel Tracks

**Track 1: MyVideo / Taiwan**
- Warm lead with Jamie Lin (Chairman, Taiwan Mobile)
- Goal: Close pilot deal → credibility for everything else

**Track 2: SEA Agencies (Primary Revenue)**
- Target: Singapore, Manila, Kuala Lumpur, Bangkok, Jakarta
- English as business language
- Remote outreach (LinkedIn, email, video)

**Filmmakers: Global (English-speaking)**
- Best creators are globally distributed
- SEA-based filmmakers = priority (can hire for agency work + sign for distribution)

---

## FIRST 30 DAYS — THE 7 THINGS THAT MATTER

*If you only nail these, the entire plan becomes viable.*

| # | Item | Why It Matters |
|---|------|----------------|
| 1 | **Launch website v1 in 7 days** (not perfect) | Positioning, 2 paths, 1 lead form, 1 calendar link, "Rights Verified" blurb. No more. |
| 2 | **Produce 3 credibility assets** | 60-sec sizzle reel, 10-slide deck OR 1-page PDF, Rights Playbook v0.1 (3 pages). Turns cold outreach into warm conversations. |
| 3 | **Lock delivery system** | Brief template, revision doc format, file organization, creator contract template. Before you sell aggressively. |
| 4 | **Build Singapore target list** | 100 agencies. Name, founder/partner, email, LinkedIn, niche, 1 reason why them. This is the substrate of revenue. |
| 5 | **Start outreach: 10/day, 5 days/week** | 50 touches/week. Book calls in Week 3-4. |
| 6 | **Pre-sell event "industry seats"** | If event is Month 3, start booking B2B attendees in Month 1-2. Make them feel scarce. |
| 7 | **Define your "No List"** | Rights Verified boundaries. Prevents catastrophic time waste and risk. |

---

## THE "NO LIST" — RIGHTS VERIFICATION BOUNDARIES

*What SI8 will NOT do (prevents scope creep and risk):*

- ❌ No celebrity likeness (real people's faces without consent)
- ❌ No voice cloning of real people
- ❌ No explicit IP imitation (copyrighted characters, brands)
- ❌ No political persuasion content
- ❌ No deepfakes or deceptive content
- ❌ No adult/explicit content
- ❌ No projects without signed brief (clients must fill intake form)
- ❌ No projects without creator bench capacity (don't sell what you can't deliver)

---

## WEEKLY TIME ALLOCATION (10-15 hrs/week)

| Activity | Hours/Week | Notes |
|----------|------------|-------|
| **Revenue outreach + calls** | 5 hrs | Non-negotiable. Below 5 hrs = miss $5K/month target. |
| **Delivery system + creator bench** | 3 hrs | Templates, QC, creator relationships |
| **Website + credibility assets** | 2 hrs | Iterate, don't perfect |
| **Event planning** | 2 hrs | Only if Month 3 event scheduled |
| **Rights playbook** | 1 hr | Iterate slowly — only what helps sell THIS month |

---

## EXECUTION GAPS - TO FINALIZE

**Priority: CRITICAL** — Must complete in Month 1

### 0. Website Launch (Ship in 7 days, iterate later)
- [x] Positioning + 2 paths (Programs/Partnerships) — ✓ Feb 2026
- [x] Lead intake form (one link for everyone) — ✓ Formspree form live
- [x] Calendar link for booking calls — ✓ Calendly linked
- [x] "Rights Verified" blurb (signals expertise) — ✓ Rights Verified section live
- [x] Mobile responsive — ✓ Responsive breakpoints implemented
- [x] Deploy to Netlify/Vercel — ✓ Deployed to Vercel (auto-deploy from GitHub)
- [x] Connect domain (www.superimmersive8.com) — ✓ Live at superimmersive8.com
- [x] Google Analytics tracking — ✓ GA4 installed on all pages (Measurement ID: G-628BLE9N15) — Mar 4, 2026

### 1. Credibility Assets (Before outreach)
- [ ] 60-second sizzle reel (sample AI video work)
- [x] 1-page PDF (agency-facing) — ✓ Legal Risk Reduction Brief (Feb 2026)
- [x] Rights Playbook v0.2 — ✓ Expanded with legal research, quantifiable metrics, competitive landscape (Feb 2026)
- [x] Rights Verified website section — ✓ 5 pages live (How It Works, Chain of Title, Vetting Criteria, Legal Brief, Playbook) (Feb 2026)
- [x] Sample Chain of Title example — ✓ "Neon Dreams" 12-page PDF with 9-field documentation; HTML template + PDF generation system; gated download on website with 4 entry points (Feb 2026)
- [x] 5 catalog entries with real filmmaker work — ✓ Time Passing (Damon Chang), One Fleeting Moment (Michy1591, vertical 9:16), Adventures of Sam and Cole (Jsizzle), Overtime (JerBear), Karoake Time! (Machete in the Woods); properly filed in 05_Catalog/represented/ with source images + thumbnails + metadata (Mar 2026)

### 2. Sales Ops (This makes or breaks Month 2-6)
- [x] Lead intake + qualification form — ✓ Gated download forms on rights-verified-legal-brief.html + rights-verified-rights-playbook.html (Feb 2026)
- [x] Contact form with instant notifications — ✓ Main website contact form + Resend integration; instant email to jd@superimmersive8.com; all 6 site forms functional; honeypot + time-based spam protection (3-sec minimum); $0/mo stack (Feb 2026, spam protection added Mar 4, 2026)
- [x] Lead gen email automation — ✓ 3-email nurture sequence (Day 0, 3, 7) via Kit + Vercel function; $0/mo stack (Feb 2026)
- [ ] CRM + pipeline stages (6 max): Prospect → Contacted → Meeting Booked → Proposal Sent → Negotiation → Won/Lost
- [ ] Proposal template (1-page + SOW) — must take <45 min per proposal
- [ ] Pricing guardrails: "if X then quote Y" (e.g., "Hero film + cutdowns = $12K baseline")

### 3. Delivery Ops (Production is where founders drown)
- [ ] Production Brief Template (objective, audience, tone, prompt constraints, do-not-do list)
- [ ] Creative QA Checklist (branding, rights lane, motion stability, audio policy, deliverable specs)
- [ ] Revision policy enforcement mechanism ("2 rounds max", "only 1 consolidated revision doc")
- [ ] Creator bench: 2-3 trusted freelancers with clear payout terms + IP assignment
- [ ] Asset management system (folder structure: /Client/Project/01_briefs, /02_versions, /03_deliverables_final)
- [ ] Delivery format and handoff process

**Priority: HIGH** — Must complete before Month 2 outreach

### 3b. Advisory Board (Credibility asset before first deals)
- [ ] Identify 3-5 advisory board candidates (see BUSINESS_PLAN_v2.md for profiles)
- [ ] Draft 1-page advisory memo (what SI8 is, what we're asking, what they get)
- [ ] Reach out — prioritize anyone already in network
- [ ] List on website once confirmed (3+ minimum before publishing)
- [ ] Invite to AI Creators Fest as speakers

**Target profiles:** entertainment/IP lawyer, brand marketing exec (APAC), AI filmmaker/creative technologist, streaming/platform exec

### 3c. Bilingual Website (EN + ZH-TW)
- [x] Translate all website copy to Traditional Chinese (繁體中文) — ✓ index-zh.html live Feb 17, 2026
- [x] Implement language selector in nav (EN / 中文 toggle) — ✓ links to index-zh.html / index.html
- [x] Add `lang="zh-TW"` attribute for Chinese version — ✓ html lang set
- [ ] Test on mobile — both languages
- [x] Complete before Taipei B2B outreach begins — ✓ ready for advisor meetings

### 3d. Corporate Structure & Legal Entity (Finalized Feb 2026)
- [x] Analyze entity structure options (US DBA vs Taiwan LLC vs standalone) — ✓ Three independent analyses (Claude, ChatGPT, Gemini) synthesized (Feb 2026)
- [x] Document Master/Node framework — ✓ STRUCTURE-OVERVIEW.md (Feb 2026)
- [x] Finalize operational decisions (Q1-Q3) — ✓ File DBA, assume US entity OK for MyVideo, CPA validates current structure (Feb 2026)
- [x] File Texas DBA for "SuperImmersive 8" under PMF Strategy Inc. — ✓ Filed and APPROVED Feb 23, 2026 (Document #1560777170004)
- [x] Update Filmmaker Shopping Agreement signature block — ✓ Added professional signature block template (Feb 23, 2026)
- [x] Update Invoice Template with legal entity formatting — ✓ Created comprehensive invoice template (Feb 23, 2026)
- [x] Update website footer (all HTML files) — ✓ All 10 HTML files updated with "PMF Strategy Inc. d/b/a SuperImmersive 8" (Feb 23, 2026)
- [ ] Update Master License Agreement signature block — Pending (create template when needed)
- [ ] Update Rights Verified Package footer/signature — Pending (create when first package issued)
- [ ] Verify bank account for wire transfers — Week 3

**Entity Structure:** PMF Strategy Inc. (Texas S-Corp, 2022) d/b/a SuperImmersive 8
- Role: Master entity (owns IP, catalog, filmmaker agreements)
- Taiwan LLC (沉浸科技顧問有限公司): Optional local reseller (ONLY if Taiwan buyer requires it)
- Documentation: `06_Operations/corporate/` (STRUCTURE-OVERVIEW, ACTION-PLAN, DECISIONS, DBA-FILING-GUIDE)

### 3e. Rights Verified Submission System (Completed Mar 1, 2026)
- [x] Multi-page web intake form (10 sections, 70+ fields) — ✓ Built with progressive disclosure UI
- [x] Client-side validation + test data auto-fill — ✓ Production-ready validation
- [x] Airtable integration — ✓ Submissions table with all fields + timestamp
- [x] Vercel serverless API — ✓ `/api/submit` endpoint with error handling
- [x] Email notifications (filmmaker + internal) — ✓ Resend integration with domain verification
- [x] Confirmation page — ✓ Clean URLs, submission ID display, proper footer
- [x] Rate limiting (5 submissions/day per email) — ✓ Prevents spam
- [x] Submission ID generation (SUB-YYYY-timestamp) — ✓ Unique tracking IDs

**Status:** Fully operational end-to-end filmmaker intake system. Filmmakers can submit work, receive confirmation emails, SI8 gets internal notifications. Form deployed at superimmersive8.com/submit

**Tech Stack:** Vercel (serverless functions) + Airtable (database) + Resend (email) — $0/mo operational cost

### 3f. Creator Portal MVP (Completed Mar 19, 2026 — Updated Mar 21, 2026)
- [x] Database schema design (Supabase PostgreSQL) — ✓ 7 tables with RLS policies
- [x] Authentication system (signup, login, email verification) — ✓ Supabase Auth + Resend SMTP
- [x] Multi-section submission form (10 sections, validated) — ✓ React Hook Form + Zod validation
- [x] Stripe Test Mode integration ($499 Rights Verified fee) — ✓ Test product, webhooks, test cards
- [x] Payment webhook processing — ✓ Updates submission status + sends confirmation email
- [x] Creator dashboard — ✓ Shows submissions, payment status, review status
- [x] Creator submission detail page — ✓ `/dashboard/submissions/[id]` — status banner, Chain of Title PDF download (approved only), catalog listing status, tool disclosure, rights confirmations
- [x] API routes with service_role (bypass RLS) — ✓ `/api/submissions/create`, `/api/submissions`
- [x] Database migrations (5 migrations) — ✓ Triggers, RLS policies, service_role permissions
- [x] Environment variables configuration — ✓ Supabase, Stripe, Resend, site URLs
- [x] End-to-end testing (3 test accounts) — ✓ Full flow verified in production
- [x] SI8 design system — ✓ Warm off-white palette (#FAFAF7 bg, #1a1918 text, #C8900A amber), Space Grotesk + Inter fonts, applied to all logged-in pages via `globals.css`
- [x] Admin shared layout — ✓ `app/admin/layout.tsx` with nav, Admin badge, Review Queue + Catalog links

**Status:** Fully operational Creator Portal. Creators can signup, submit, pay, track submissions, and download Chain of Title PDFs. Admins can review, approve/reject, and generate documentation.

**Tech Stack:** Next.js 14 (App Router) + Supabase (PostgreSQL + Auth) + Stripe (payments) + Resend (emails) + Vercel (hosting)

**Remaining:**
- [x] Switch Stripe to live mode ($29 Creator Record + $499 SI8 Certified real keys) — live (Mar 27, 2026)
- [x] Clean test data from production DB — all test submissions deleted; only "Cloud World" remains (Mar 27, 2026)
- [x] Fix "Unknown tool" display in admin panel — reads `tool.tool_name || tool.tool` (Mar 27, 2026)
- [x] Run DB migration: `20260323000000_add_tier_and_submission_mode.sql` (adds `tier` and `submission_mode` columns) — confirmed live
- [x] Test SI8 Certified full flow: PASSED (Mar 27, 2026)

**Two-Tier Platform (Completed Mar 23, 2026):**
- [x] Tier selection in submit form (Section 1): Creator Record $29 vs SI8 Certified $499
- [x] Submission mode: Individual Creator vs Agency/Production House (agency hides Sections 8/9/catalog opt-in)
- [x] Evidence Custodian Declaration checkbox (Section 4) — required for all tiers
- [x] Indemnification warranty checkbox (Section 11) — required for all tiers
- [x] Receipts optional for Creator Record, required for SI8 Certified (AddToolModal.tsx updated)
- [x] Checkout API accepts `tier` param — routes to $29 or $499 Stripe product
- [x] Webhook auto-approves Creator Record on payment (status='approved')
- [x] Creator Record PDF auto-generated on payment webhook — `CreatorRecordPDF.tsx` (amber, self-attested stamp), `generateCreatorRecordPDF()` (auto-assigns CR-YYYY-ID, uploads to `documents` bucket, upserts `rights_packages` with all required NOT NULL fields)
- [x] Creator Record approval email — `sendCreatorRecordApprovedEmail()` (creator gets self-attested language + upgrade CTA; admin gets low-priority awareness notification)
- [x] Admin manual retry button — if auto-generation fails, admin can trigger via `/api/admin/submissions/[id]/generate-creator-record`
- [x] DB migration run: `tier` and `submission_mode` columns confirmed live in production
- [x] DB migration file created for tier + submission_mode columns

**Submit Form & Creator Portal Polish (Completed Mar 24, 2026):**
- [x] Submit form Sections 5 & 6: "I have a license" alternative path — `has_licensed_content` checkbox + `license_notes` textarea; section-level validation allows either path (Mar 24, 2026)
- [x] Submit form Section 7 (Audio): file upload required when `audio_source === 'licensed'`; uploads to Supabase, stores `license_path` in `audio_disclosure` JSON (Mar 24, 2026)
- [x] Submit form Section 8 (Modification Rights) removed — v3 remnant; `modification_authorized: false` hardcoded; form renumbered to 10 sections total (Mar 24, 2026)
- [x] Creator Record catalog opt-in: all creator submissions can opt into public catalog (removed certified-only restriction); serves as upgrade lead magnet (Mar 24, 2026)
- [x] Creator detail page: fixed `audio_information` → `audio_disclosure` field name; shows "Licensed content confirmed + notes" when `has_licensed_content=true`; Modification Rights section removed (Mar 24, 2026)
- [x] CreatorRecordPDF: shows `[Y] Licensed content — creator holds rights documentation` when `has_licensed_content=true`; displays `license_notes` below (Mar 24, 2026)
- [x] Admin retry route supports `?force=true` to regenerate Creator Record PDF without manual DB delete (Mar 24, 2026)
- [x] Admin submissions table: "Show in Catalog" toggle column — `ToggleVisibilityButton` for opted-in submissions, grey "Not opted in" for others (Mar 24, 2026)

**RecordForm / CertForm Product Design (Completed Mar 26, 2026):**
- [x] Named the two forms: **RecordForm** ($29 Creator Record, route `/record`) and **CertForm** ($499 SI8 Certified, route `/certify`) — separate products, separate routes, not a shared form with tier selection
- [x] PRD: RecordForm — `08_Platform/prds/PRD_RECORD_FORM.md` — complete product doc with all decisions, sections, automated flow, known gaps
- [x] PRD: CertForm — `08_Platform/prds/PRD_CERT_FORM.md` — complete product doc: 11 sections, Risk Rating system (Low/Standard/Elevated/High), 6-step reviewer checklist (~90 min), file uploads for Sections 5 & 6, Fair Use Path C, commercial context layer
- [x] Implementation: RecordForm — `08_Platform/implementation/RECORD_FORM_IMPL.md` — current state audit, remaining work (URL migration, admin bug, Stripe live mode), file map, test plan
- [x] Implementation: CertForm — `08_Platform/implementation/CERT_FORM_IMPL.md` — 8-phase build order, DB migration (14 new columns), section-by-section build notes, reviewer workflow, PDF stamp change
- [x] CertForm stamp change: "SI8 VERIFIED · COMMERCIAL AUDIT PASSED" — applied to `ChainOfTitlePDF.tsx` (Mar 26, 2026)
- [x] URL migration: `/submit` → `/record` complete; `/submit` redirects to `/record` (Mar 27, 2026)
- [x] CertForm build — route `/certify`, all 11 sections, file uploads, reviewer checklist in admin, Risk Rating PDF output (Mar 26, 2026)
- [x] Apply DB migration `20260401000000_add_certform_fields.sql` to production — confirmed live (Mar 27, 2026)

### 3k. Platform Launch Hardening (Completed Mar 27, 2026)
- [x] Stripe live mode activated — `sk_live`, `pk_live`, `whsec_live` in Vercel env vars; webhook endpoint at `app.superimmersive8.com/api/webhooks/stripe`
- [x] Promo codes (live mode): 4 tiers — EARLY10 (10%/200 uses), AGENCY30 (30%/50 uses), BETA-[NAME] (50%/per-person), COMP-[NAME] (100%/per-person single-use)
- [x] `allow_promotion_codes: true` added to Stripe checkout session — promo field shows in Stripe Checkout UI
- [x] Custom domain `app.superimmersive8.com` — CNAME added in Bluehost DNS, configured in Vercel, live
- [x] `NEXT_PUBLIC_SITE_URL` updated to `https://app.superimmersive8.com` in Vercel
- [x] Marketing site `vercel.json` — all redirects updated from `si8-creator-portal.vercel.app` to `app.superimmersive8.com`
- [x] Showcase: YouTube Shorts embed fix — `youtube.com/shorts/` URL pattern added to `getEmbedUrl()` and `getYouTubeThumbnail()`
- [x] Showcase: tier-aware modal badge — amber "SI8 CERTIFIED" vs gray "CREATOR RECORD"
- [x] Showcase: full marketing site nav (Rights Verified dropdown, Login dropdown, EN/繁體中文 toggle)
- [x] RecordForm audio upload fix — upload handler gets userId from live session (not stale state), prevents RLS failures
- [x] Production DB clean — all test submissions deleted; only "Cloud World: Pan from Baby to Auntie Guard" remains
- [x] Live mode end-to-end test: COMP-TEST-LIVE (100% off) → $0 → webhook → auto-approve → PDF generated ✅
- [ ] Showcase seed videos: 1 of 3 complete ("Cloud World") — 2 more needed before public launch

### 3l. Analytics, Tracking & Marketing Site Fixes (Completed Mar 28, 2026)

**Google Analytics (GA4 — G-628BLE9N15):**
- [x] GA tag was only on 2 pages post-v4 migration (pricing EN + ZH) — added to all 13 marketing site pages (Mar 28, 2026)
- [x] Custom event tracking added to homepage + pricing page:
  - `get_verified_click` — "Get Verified" / "Get Certified" CTA clicks
  - `creator_record_click` — Creator Record CTA clicks
  - `view_sample_click` — "View Sample Rights Package" clicks
  - `book_call_click` — Calendly link clicks
  - `request_demo_submit` — Request Demo form submissions
- [x] Events appear in GA4 → Admin → Events → Recent events after 24–48hr processing delay
- [x] To mark as Key Events (conversions): star `get_verified_click`, `request_demo_submit`, `book_call_click` once they appear

**Hotjar / ContentSquare (Project ID: 715376):**
- [x] Snippet added to all 12 marketing site HTML pages (EN + ZH) — Mar 27, 2026
- [x] Mapping: "SI8 Marketing Site" — 3 page groups: Homepage, Pricing, How It Works
- [x] URL format used: full URL (e.g. `https://www.superimmersive8.com/how-it-works`) — matches ContentSquare's path field behavior
- [x] Session Replay: auto-enabled; data accumulates as real traffic arrives
- [x] Zoning Analysis (heatmaps): requires ~30–50 sessions per page before patterns are meaningful

**Demo Form (Request Demo — homepage):**
- [x] `formspree-to-kit.js` was Kit-only (no email) — updated to send Resend admin notification to `jd@superimmersive8.com` on every submission (Mar 28, 2026)
- [x] Notification email includes: name, email, role, timestamp (Taipei time), source
- [x] All 3 env vars confirmed in marketing site Vercel project: `RESEND_API_KEY`, `KIT_API_SECRET`, `KIT_TAG_ID`

**Sample Chain of Title v4:**
- [x] New page at `/sample` — v4 Chain of Title for "Urban Drift" (fictional agency commercial, Runway + Sora, Risk: LOW, "SI8 VERIFIED · COMMERCIAL AUDIT PASSED" stamp)
- [x] Replaces v3 "Neon Dreams" example (wrong model — v3 Rights Agency with product placement tiers)
- [x] Hero "View Sample Rights Package" button fixed — was linking to broken v3 URL `/rights-verified-chain-of-title#sample`
- [x] Sample section copy updated: removed "Tier 1+2", "Modification Rights", "Adobe Firefly" (all v3 language)

### 3g. Public Catalog with Video Player (Completed Mar 19, 2026 — Updated Mar 21, 2026)
- [x] Submit form Section 10: Video & Catalog — ✓ video_url, thumbnail_url, public_description, catalog opt-in checkbox
- [x] Catalog opt-in system — ✓ Creates opt_ins record when checkbox enabled
- [x] Public catalog page (/catalog) — ✓ Dark design matching marketing site, grid layout, responsive
- [x] Video modal player — ✓ YouTube/Vimeo iframe with autoplay
- [x] API route (/api/catalog) — ✓ Fetches approved + visible entries, force-dynamic
- [x] Helper functions — ✓ getEmbedUrl(), getThumbnailUrl() for YouTube/Vimeo
- [x] Catalog metadata display — ✓ Title, filmmaker, genre, catalog_id, description
- [x] Catalog filters — ✓ Search by title/filmmaker/description, genre filter
- [x] End-to-end testing — ✓ Full catalog flow verified in production
- [x] Catalog link in dashboard nav — ✓ Added to dashboard layout

**Status:** Public catalog at si8-creator-portal.vercel.app/catalog — dark design matching marketing site. Marketing site /catalog redirects here via vercel.json.

### 3h. Marketing Site Polish (Mar 21, 2026 — Updated Mar 24, 2026)
- [x] vercel.json redirects — ✓ `/catalog`, `/auth/signup`, `/auth/login`, `/auth/admin/login`, `/rights-verified`, `/rights-verified/chain-of-title`, `/rights-verified/playbook` all redirect correctly
- [x] Nav dropdown fix — ✓ Eliminated 1rem gap that caused hover menu to close before clicking
- [x] Rights Verified content width — ✓ Narrowed from 1200px → 860px (chain-of-title, playbook), 1400px → 1000px (overview)
- [x] Sample document CTA — ✓ Added to homepage — Neon Dreams Chain of Title download
- [x] Contact/Book a Call section — ✓ Replaced with Request Demo form (Kit-connected via /api/formspree-to-kit) + Book a Call Calendly card

### 3j. Marketing Site v4 Promotion to Root (Mar 27, 2026)
- [x] Migration plan documented — ✓ `07_Website/MIGRATION_v4.md` with rollback procedures
- [x] v3 files archived — ✓ `07_Website/_archive/` with `README.md` (file inventory + 3 restore options)
- [x] Git checkpoint committed — ✓ commit `cf392fd` is safe fallback before any migration
- [x] v4 files promoted from `newsite/` to `07_Website/` root — ✓ all 12 HTML files + styles + scripts
- [x] `/newsite/` path prefix stripped from all internal links — ✓ global find/replace across all files
- [x] `vercel.json` simplified — ✓ removed 6 `/newsite/` redirects; kept all creator portal redirects
- [x] `newsite/` directory removed — ✓ cleaned up
- [x] Deployed and verified live — ✓ `www.superimmersive8.com` now serves v4 CaaS site

**File structure post-migration:**
- `07_Website/index.html` — v4 homepage
- `07_Website/how-it-works/`, `pricing/`, `rights-verified/`, `zh/` — v4 pages
- `07_Website/_archive/` — v3 files preserved (index.html, styles.css, pricing.html, rights-verified-*.html, etc.)
- `07_Website/api/` — Vercel serverless functions (untouched)

### 3i. Marketing Site v4 Redesign (Mar 24, 2026)
- [x] Homepage H1 — ✓ "Get Your AI Video Cleared for Commercial Use"
- [x] Homepage hero subtitle — ✓ Adobe gap quote + urgency line ("Without documentation, brands won't approve your campaign")
- [x] Homepage secondary CTA — ✓ "View Sample Rights Package" (was "Showcase") — sends visitors to the actual product PDF
- [x] Nav rename — ✓ "Browse Showcase" → "Showcase" across all EN HTML files
- [x] Remove "Trusted By" section — ✓ Placeholder logos removed until real partners confirmed
- [x] "Without/With" risk visualization section — ✓ Added after Problem section; left=brand legal objections, right=SI8 Certified deliverables; amber ✓/grey ✗ visual treatment
- [x] "Choose Your Documentation" section — ✓ Replaced "Two Ways to Work With Us" (CaaS + Showcase) with $29/$499 tier cards including "Who uses this" lists; Creator Record dimmed (opacity 0.72); stamp labels updated
- [x] Green ✓ checkmarks — ✓ Added to SI8 box in Problem section and "With SI8 Certified" label
- [x] Creator Record stamp — ✓ "SELF-ATTESTED" → "Pre-Commercial Record" on homepage and pricing page
- [x] Money framing — ✓ "Used to unlock $5K–$50K campaigns" in SI8 Certified card; "Without documentation, brands won't approve your campaign" in hero
- [x] Showcase page (catalog/page.tsx) — ✓ Walled garden: top 70% = B2B agency proof-of-work (RIGHTS VERIFIED badges, catalog IDs, Watch & Request License); bottom 30% = creator CTA (80/20 pitch, licensing tier earnings cards)
- [x] Pricing page — ✓ Removed licensing tiers table (4 cards); replaced with compact Showcase callout; fixed "Showcase Showcase" typo; upgrade note reframed
- [x] How It Works page — ✓ Removed "Optional: Opt into Showcase Marketplace" section (earnings tables); Step 1 "70-field submission form" → 4-category intake description
- [x] Request Demo form — ✓ Kit-connected lead capture (name, email, role); POSTs to /api/formspree-to-kit; async submit with success/error states; feeds Kit nurture sequence

### 4. Legal Ops (Rights playbook → actual contracts)
- [ ] Standard Production MSA + SOW
- [ ] Creator contractor agreement (work-for-hire + confidentiality + IP assignment)
- [ ] Rights rider (explicit "Rights Verified" restrictions)
- [ ] Client approval language ("Client agrees final outputs are not infringing to their knowledge")
- [ ] Filmmaker Shopping Agreement (duration, exclusivity, territories)

### 5. Outreach & Messaging
- [ ] LinkedIn message template for Singapore agencies
- [ ] Email follow-up sequence (7 touches over 21 days)
- [x] Instagram filmmaker outreach templates — ✓ 2 message variants (professional/direct), 3 follow-ups, response scripts, A/B testing strategy; streaming platform opportunity angle; located in 03_Sales/filmmakers/INSTAGRAM_OUTREACH_TEMPLATES.md (Mar 2026)
- [x] Common objections and responses — ✓ Included in Instagram outreach template (platform details, pay structure, process, value prop)
- [x] Filmmaker pitch message — ✓ See Instagram outreach templates (Mar 2026)
- [x] Filmmaker value prop (why SI8 vs self-distribute?) — ✓ Platform access + rights verification (documented in outreach templates)

### 6. Comms & Brand Assets
- [ ] Intro email / "what we do" blurb (100 words)
- [ ] One-pager PDF (agency-facing)
- [ ] Case study template (Problem → Approach → Output → Lessons) — ready before first project

### 7. Event Ops (Event failure burns momentum)
- [ ] Sponsor kit (1 page: tiers + audience + benefits)
- [ ] Speaker management (calendar invites, talking points doc, run-of-show)
- [ ] Attendee conversion system (QR booking, "industry seat includes strategy call", follow-up sequence)
- [ ] List-building mechanism (Month 1) — event success depends on distribution list
- [ ] Outsource logistics early (venue + drinks + ticketing = contractor; you own speakers, content, conversion)

**Priority: MEDIUM** — Complete by Month 3

### 8. Filmmaker Acquisition
- [ ] Shopping Agreement terms finalized
- [ ] Filmmaker onboarding process
- [ ] Roster communication/engagement plan
- [ ] How to match filmmakers to opportunities

### 9. Pricing & Negotiation
- [ ] Price negotiation framework
- [ ] Walk-away points by deal type
- [ ] Payment terms policy (50% upfront, 50% on delivery)
- [ ] Discount policy (if any)

### 10. Tools & Systems
- [ ] CRM (simple — Notion, Airtable, or spreadsheet)
- [ ] Project management for productions
- [ ] File storage/delivery system
- [ ] Invoicing and payment tracking

### 11. Metrics & Tracking
- [ ] Weekly KPIs: outreach sent, response rate, calls booked, proposals sent, revenue
- [ ] Pipeline review: weekly 30-min check
- [ ] Monthly review process

**Priority: LOWER** — Complete by Month 4-5

### 12. Risk & Contingency (What Will Break First)

**🔥 Production scope creep** (most common failure mode)
- Fix: Enforce package constraints + revision limits strictly

**🔥 Too many workstreams / context switching**
- Fix: Stable weekly operating cadence (same activities, same days)

**🔥 Event becomes a time sink**
- Fix: Outsource event operations early (logistics = contractor)

**🔥 Overbuilding rights playbook**
- Fix: Only write what helps sell THIS month

**🔥 MyVideo stalls and blocks everything**
- Fix: Don't let Track 1 stall Track 2 — they run in parallel

**Other contingencies:**
- [ ] If SEA agencies don't respond (<10% response rate) — messaging problem, iterate
- [ ] If can't find quality filmmakers — expand search, lower bar initially
- [ ] If first production project goes badly — document learnings, fix process
- [ ] If competitor enters APAC — differentiate on rights expertise + relationships

### 13. Network & Personal Brand
- [ ] Map existing network for warm intros
- [ ] LinkedIn content: 2-3 posts/week
- [ ] Speaking/podcast opportunities

### 14. Cash Flow & Decision Criteria
- [ ] Expense timing by month
- [ ] Minimum deal size worth pursuing ($5K+ for production)
- [ ] Red flags in clients (when to say no)
- [ ] When to fire a client

### 15. E&O Insurance (Future Investigation)
- [ ] Research whether E&O insurance for AI-generated content is available from standard media liability insurers
- [ ] Get quotes at small agency scale
- [ ] Determine if absence of E&O creates sales friction with large-brand buyers
- [ ] Not a Year 1 blocker — investigate before significant production volume

---

## KEY DEPENDENCIES (Hidden Killers)

| Dependency | Risk | Mitigation |
|------------|------|------------|
| **MyVideo ≠ deal execution** | Warm lead ≠ closed deal. Need: internal champion, legal review, programming needs, budget owner, timeline alignment | 60-90 days realistic, but don't let Track 1 stall Track 2 |
| **Need creator bench before selling** | Can't sell "delivery engine" without delivery capacity | Build 2-3 creator relationships BEFORE scaling outreach |
| **Event success = distribution list** | No list = weak attendance | List-building mechanism in Month 1, not just Month 2 |
| **Offers require credibility artifacts** | Agencies need: 2-3 samples, 1 showreel, 1-2 case writeups | Even mock/personal projects work — but you need them |

---

## GEOGRAPHIC FOCUS (Refined)

**Month 1-2: Singapore ONLY**
- Trying Singapore + Manila + KL + Bangkok + Jakarta = getting none
- Pick ONE city first, prove the model, then expand

**Month 3+: Expand to other SEA markets**
- Only after Singapore playbook is working

---

## Key Documents

| Document | Location | Purpose |
|----------|----------|---------|
| **Business Plan v4** (current) | `01_Business/plans/BUSINESS_PLAN_v4.md` | Source of truth for strategy (CaaS + Creator Platform) |
| **Peer Review Summary (CaaS)** | `01_Business/plans/PEER_REVIEW_SUMMARY_CAAS.md` | ChatGPT (Opus) + Gemini feedback synthesis on v4 pivot |
| **Revenue Model v4** | `01_Business/financials/REVENUE_MODEL_v4.md` | Three-gear economics, unit economics, projections |
| **Competitive Analysis (CaaS)** | `01_Business/research/COMPETITIVE_ANALYSIS_CAAS_2026.md` | Updated competitive landscape for CaaS model |
| Business Plan v3 (superseded) | `01_Business/plans/BUSINESS_PLAN_v3.md` | Rights Agency + AI Product Placement (Feb-Mar 2026) |
| Business Plan v2 (superseded) | `01_Business/plans/BUSINESS_PLAN_v2.md` | Demand-side first — reference for operational decisions |
| Business Plan v1 (archived) | `01_Business/plans/BUSINESS_PLAN_v1.md` | Supply-side first — reference only |
| Version History | `01_Business/plans/VERSION_HISTORY.md` | Plan version log |
| Build in Public Log | `02_Marketing/content/BUILD_IN_PUBLIC_LOG.md` | Insights for LinkedIn content |
| **Pricing Strategy v2.0** (current) | `01_Business/pricing/PRICING-STRATEGY-v2.0.md` | Two-tier CaaS pricing: Creator Record $29 + SI8 Certified $499 (March 2026) |
| Pricing Strategy v1.0 (archived) | `01_Business/pricing/PRICING-STRATEGY-v1.0.md` | v3 licensing tiers (Rights Agency model — archived) |
| Rights Playbook v0.1 | `06_Operations/legal/rights-playbook/versions/v0.1.md` | Rights vetting — sales asset for buyers |
| Rights Playbook Decisions | `06_Operations/legal/rights-playbook/DECISIONS.md` | Playbook version log |
| Filmmaker Agreement (WIP) | `06_Operations/legal/filmmaker-agreement/WORKING.md` | Terms for filmmaker representation |
| **Rights Verified — README** | `06_Operations/rights-verified/README.md` | Rights Verified project overview; how all documents relate |
| **Rights Verified — Submission Requirements** | `06_Operations/rights-verified/SUBMISSION-REQUIREMENTS.md` | Filmmaker-facing: what to provide on submission |
| **Rights Verified — Review Process** | `06_Operations/rights-verified/REVIEW-PROCESS.md` | SI8 internal: 4-stage review workflow |
| **Rights Verified — Review Criteria** | `06_Operations/rights-verified/REVIEW-CRITERIA.md` | Pass/fail thresholds per review category |
| **Rights Verified — Chain of Title Schema** | `06_Operations/rights-verified/CHAIN-OF-TITLE-SCHEMA.md` | 9-field output template per catalog entry |
| **Rights Verified — Edge Cases** | `06_Operations/rights-verified/EDGE-CASES.md` | Gray areas, judgment calls, precedents (grows with submissions) |
| **Technical Architecture** | `08_Platform/architecture/TECHNICAL_ARCHITECTURE.md` | Database schema, API structure, tech stack (Supabase + Next.js) |
| **PRD: Creator Portal** | `08_Platform/prds/PRD_CREATOR_PORTAL.md` | Submission flow, Stripe payment, opt-in to Showcase |
| **PRD: Admin Panel** | `08_Platform/prds/PRD_ADMIN_PANEL.md` | Review queue, PDF generation, catalog management |
| **PRD: Public Catalog** | `08_Platform/prds/PRD_PUBLIC_CATALOG.md` | Marketplace, licensing requests, Rights Verified badges |
| **PRD: CaaS Website** | `08_Platform/prds/PRD_CAAS_WEBSITE.md` | Homepage redesign for v4 model (How It Works, Pricing) |
| **PRD: RecordForm** | `08_Platform/prds/PRD_RECORD_FORM.md` | $29 Creator Record — self-attested, 9 sections, automated flow (Mar 2026) |
| **PRD: CertForm** | `08_Platform/prds/PRD_CERT_FORM.md` | $499 SI8 Certified — 11 sections, human review, Risk Rating, reviewer checklist (Mar 2026) |
| **4-Week Sprint Plan** | `08_Platform/implementation/4_WEEK_SPRINT_PLAN.md` | Day-by-day implementation plan (Feb 19 - Mar 18, 2026) |
| **RecordForm Implementation** | `08_Platform/implementation/RECORD_FORM_IMPL.md` | Engineering plan: current state audit, URL migration to /record, known bugs, test plan |
| **CertForm Implementation** | `08_Platform/implementation/CERT_FORM_IMPL.md` | Engineering plan: 8-phase build order, DB migration, reviewer workflow, PDF updates |
| **Chain of Title Examples — README** | `05_Catalog/_examples/README.md` | Chain of Title examples overview; sales and onboarding tool |
| **Chain of Title Template** | `05_Catalog/_examples/TEMPLATE.md` | Blank Chain of Title template for new catalog entries |
| **Example 001: Neon Dreams** | `05_Catalog/_examples/example-001-neon-dreams/` | First complete Chain of Title example (cyberpunk commercial, Tier 1+2) |
| **Chain of Title Changelog** | `05_Catalog/_examples/versions/CHANGELOG.md` | Template version history and evolution tracking |
| **Rights Verified — Decisions** | `06_Operations/rights-verified/DECISIONS.md` | Rights Verified version log + open questions |
| **Corporate Structure Overview** | `06_Operations/corporate/STRUCTURE-OVERVIEW.md` | Legal entity framework (DBA decision, Year 2 transition, buyer perception) |
| **DBA Filing Guide** | `06_Operations/corporate/DBA-FILING-GUIDE.md` | Step-by-step Texas DBA filing instructions |
| **Corporate Decisions** | `06_Operations/corporate/DECISIONS.md` | Corporate structure decision log |
| **Revised Action Plan** (current) | `01_Business/plans/REVISED-ACTION-PLAN.md` | Post-Round 2 execution plan; sequential Week 1, 3-film MyVideo pilot, Tier 3 active offering, contact quotas |
| **Round 2 Feedback Synthesis** | `01_Business/plans/ROUND-2-SYNTHESIS.md` | ChatGPT + Gemini Round 2 feedback; both AIs caught "win via preparation" pattern |
| **Weekly Scoreboard** | `01_Business/plans/WEEKLY-SCOREBOARD.md` | Weekly tracking template with contact-focused metrics (manual touches, follow-ups, reply rate) |
| **Tier 3: Risk Briefing Product** | `03_Sales/tier-3-risk-briefing.md` | Complete Tier 3 product definition (Option A: $2K-$3.5K, Option B: $5K); positioning, deliverables, sales process |

---

## Current Stage

**Pre-launch (Q1 2026)**
- 6-month execution plan: Feb - Jul 2026
- Time budget: 10-15 hours/week
- Goal: $5K/month run rate by Month 6

**Key Milestones:**
- Month 1: Legal + website + MyVideo proposal sent
- Month 2: Outreach begins (SEA agencies + filmmakers)
- Month 3: First event + first production deal
- Month 4-5: Revenue ramp
- Month 6: Assessment — on track for full-time transition?

---

## Folder Structure

```
SuperImmersive8/
├── claude.md                    # This file - project context + gaps list
├── README.md                    # Project overview
│
├── 01_Business/                 # Strategy & Planning
│   ├── plans/                   # Business plans, execution plans
│   ├── financials/              # Budgets, projections
│   ├── research/                # Market research, competitive analysis
│   └── meeting-notes/           # Advisor meetings, key decisions
│
├── 02_Marketing/                # Brand & Growth
│   ├── brand/                   # Logos, style guide
│   ├── content/                 # Blog posts, social content, Build in Public
│   ├── campaigns/               # Launch campaigns
│   └── analytics/               # Metrics, reports
│
├── 03_Sales/                    # CRM & Pipeline
│   ├── filmmakers/              # Creator pipeline, signed roster
│   ├── buyers/                  # Buyer leads, deals
│   ├── sponsors/                # Event sponsors
│   └── templates/               # Outreach templates, contracts
│
├── 04_Events/                   # AI Creators Fest
│   ├── YYYY/                    # Year folders
│   └── planning/                # Venue research, templates
│
├── 05_Catalog/                  # Content Library
│   ├── represented/             # Signed filmmaker work
│   ├── submissions/             # Incoming submissions
│   └── licensing/               # Active deals
│
├── 06_Operations/               # Admin & Legal
│   ├── corporate/               # Corporate structure, DBA filing, entity decisions
│   ├── legal/                   # Contracts, AI Video Rights Playbook
│   ├── admin/                   # Registrations, accounts
│   └── team/                    # Contractors
│
└── 07_Website/                  # Website files
    ├── index.html
    ├── styles.css
    └── script.js
```

---

## Naming & Terminology

**Company Name:**
- **Full name**: SuperImmersive 8 (one word + space + 8)
- **Short form**: SI8
- **Never**: "Super Immersive 8" or "SuperImmersive8"

**Key Terms:**
- **AI Film**: Films generated largely (90%+) through AI tools (Runway, Sora, Kling, Veo)
- **Layer 1 / Production**: B2B AI video production services for agencies
- **Layer 2 / Distribution**: Filmmaker representation, content licensing, events
- **Shopping Agreement**: Non-exclusive representation agreement with filmmakers
- **Roster**: Collection of represented filmmakers
- **Catalog**: Collection of licensable content
- **AI Video Rights Playbook**: Internal legal knowledge base (in development)

---

## Founder Background

- 10+ years B2B enterprise sales consulting
- Proven playbook: events → consulting conversions
- Former line producer (LA indie + studio work, 20 years ago)
- Currently at Calyx (AIoT Series B, Taipei) — day job until SI8 reaches $5K/mo
- Family in film/TV post-production (LA and Taipei)
- 2023: Distributed immersive exhibitions to Taiwan

---

## Competitive Landscape

| Competitor | Threat | Their Model | SI8 Differentiation |
|------------|--------|-------------|---------------------|
| **Escape.ai** | High | Platform (creators self-monetize) | Agency model (personal representation) |
| **Promise/Curious Refuge** | Medium-High | Education → production studio | Distribution-first, APAC focus |
| **Runway AIFF** | Medium | Festival (annual) | Year-round, commercial focus |

**SI8's Moat:**
- APAC + Europe focus (no regional competitor)
- Legal/rights expertise as core competency
- Agency model (deeper relationships vs platform scale)
- Founder's B2B sales background

---

## Website Technical Details

**Stack**: Static HTML/CSS/JS
**Fonts**: Space Grotesk (display), Inter (body)
**Color Scheme**: Dark theme with purple/pink gradient accents

**Languages:** English + Traditional Chinese (繁體中文) — bilingual required
- Language selector in nav (EN / 中文 toggle)
- Full content parity in both languages
- Mandarin version needed before Taipei B2B outreach begins
- Traditional Chinese (zh-TW), not Simplified (zh-CN)

**CSS Variables:**
```css
--color-accent: #818cf8;
--color-gradient-1: #818cf8;
--color-gradient-2: #c084fc;
--color-gradient-3: #f472b6;
```

### Git Repository

**Remote:** https://github.com/aip-jd36/superimmersive8.git
**Branch:** main
**Location:** All SuperImmersive 8 files are in this repo

**Important:** This repo contains the entire SuperImmersive 8 project, including business docs and website files. Only website files (07_Website/) are deployed.

### Deployment

**IMPORTANT: Site is deployed on VERCEL, not Bluehost!**

**Hosting:** Vercel (auto-deploy from GitHub)
**Domain:** www.superimmersive8.com
**Git:** https://github.com/aip-jd36/superimmersive8.git
**Vercel Project:** superimmersive8
**Root Directory:** `07_Website/`
**Git credentials:** Push with `jd@superimmersive8.com` / `aip-jd36` GitHub account via SSH (`git@github-aip-jd36`)

**Marketing site structure (v4, post-migration Mar 27, 2026):**
- `07_Website/index.html` — v4 homepage (CaaS positioning)
- `07_Website/how-it-works/`, `pricing/`, `rights-verified/`, `zh/` — v4 pages
- `07_Website/_archive/` — v3 files preserved with restore instructions
- `07_Website/api/` — Vercel serverless functions
- v3 site archived at `_archive/` — see `_archive/README.md` to restore

**To deploy:**
1. Make changes to files in `07_Website/`
2. Git commit locally
3. `git push origin main`
4. Vercel auto-deploys in ~2 minutes
5. Check deployment at https://vercel.com/dashboard

**Domain DNS:** Points to Vercel, NOT Bluehost
- Bluehost only manages domain registration
- Website files on Bluehost are NOT used
- Do NOT upload to Bluehost cPanel

---

## Notes for Claude

- **Business Plan** (`01_Business/plans/BUSINESS_PLAN.md`) is the source of truth for strategy
- **6-Month Plan** (`01_Business/plans/6_MONTH_EXECUTION_PLAN.md`) is the source of truth for execution
- **EXECUTION GAPS list** (in this file) tracks what needs to be finalized — update as items are completed
- When creating content, maintain professional but forward-thinking tone
- Two-layer model: Production (private) funds Distribution (public)
- Parallel strategy: MyVideo (credibility) + SEA agencies (revenue)
- Legal/rights expertise is a core competency, not just admin
- Prioritize simplicity — this is a lean, solo-founder operation

---

## Quick Commands

### `/ops` — Full Operational Summary

When the user types `/ops` or asks for an "operational summary", provide:

1. **Company Overview** (2-3 sentences)
2. **Current Goals** (Year 1 revenue target, 6-month milestone)
3. **Business Model** (Two-layer model, quick summary)
4. **Geographic Strategy** (Parallel tracks)
5. **Key Constraints** (Time, solo founder, runway)
6. **6-Month Execution Overview** (Month-by-month, 1-2 lines each)
7. **Current Priority** (What should be worked on NOW)
8. **Key Risks / What Will Break First**
9. **Important Numbers** (Revenue targets, outreach targets, time allocation)

Format: Concise, scannable, use tables where helpful. This is a "step back and review" report.

---

### `/ops brief` — Quick Status Check

Shorter version. Provide only:

1. **Current Month & Theme** (1 line)
2. **Top 3 Priorities Right Now**
3. **Key Metrics** (Outreach sent, calls booked, revenue to date)
4. **Biggest Risk This Week**
5. **Next Action**

Format: Bullet points, under 15 lines total.

---

### `/ops numbers` — Metrics & Targets Only

Provide only the numbers:

1. **Time Allocation** (weekly hours by activity)
2. **Outreach Targets** (daily/weekly/monthly)
3. **Revenue Targets** (by month, by stream)
4. **Pipeline Metrics** (response rate targets, calls needed, deals needed)
5. **Budget** (spent vs. remaining)

Format: Tables, no prose.

---

### `/ops gaps` — Execution Gaps Status

Provide:

1. **Gaps Completed** (checked off items)
2. **Gaps In Progress** (currently working on)
3. **Gaps Blocked** (waiting on something)
4. **Next 5 Gaps to Tackle** (prioritized)
5. **Gaps Count** (X of Y complete)

Format: Checklist style, organized by priority tier.
