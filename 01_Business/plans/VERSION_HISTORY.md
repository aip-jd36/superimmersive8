# Business Plan — Version History

---

## Website — February 17, 2026
**Status:** Live at superimmersive8.com

**What shipped:**
- Full website launch: dark → warm light theme (white base, golden amber accents)
- Catalog grid section (immediately below hero): 6 placeholder productions, filter buttons, hover overlays with License + Place Brand CTAs, Rights Verified ✓ + Placement Available badges
- Traditional Chinese version: superimmersive8.com/index-zh.html — full content parity, lang="zh-TW", all film titles localized
- Language toggle in nav (EN / 繁體中文) — functional, links between files
- All three files in GitHub: index.html, index-zh.html, styles.css, script.js

**Design decisions:**
- Light theme over dark: warmer, more premium for brand buyer audience; differentiates from generic "AI company" aesthetic
- Warm white (#FFFFFF) base, cream elevated surfaces (#FAFAF7), golden amber (#C8900A) as primary accent
- Catalog grid follows Getty/Shutterstock visual pattern — makes content feel tangible before real catalog exists
- Space Grotesk handles zh-TW characters well at this weight — no separate font needed
- Catalog section has its own anchor (#catalog); "What We Offer" services section renamed #how-it-works

**Deployment:** Bluehost cPanel → public_html/ (index.html, index-zh.html, styles.css, script.js)
**Git commit:** db71ab7

---

## v5.0 — March 29, 2026
**File:** `BUSINESS_PLAN_v5.md`
**Status:** FUTURE ROADMAP — Not active. Return when v4 reaches consistent revenue.

**What it documents:**
- Expansion from AI-only into traditional live-action and hybrid production clearance
- "Rights Clearance Infrastructure for ALL media" as the long-term positioning
- The Wedge Strategy: AI video → hybrid → live-action (Phases 1–4)
- What can and cannot be automated in clearance workflows
- 4-layer product architecture (Documentation → AI-assisted → Reviewer → Platform)
- Financial opportunity and competitive landscape in v5 era
- Prerequisites before v5 activation (20+ verifications/month, trained reviewers, E&O insurer relationship)

**Why documented now:**
Validated independently by Claude, ChatGPT, and Gemini — all three converged on the same wedge strategy conclusion. Captured to inform product roadmap decisions without distracting from v4 execution.

**Prerequisite:** v4 CaaS must prove consistent verifications + agency trust before v5 activates.

---

## v4.0 — March 2026
**File:** `BUSINESS_PLAN_v4.md`
**Status:** Current direction (major pivot from v3)

**What changed from v3.2:**
- **Primary offering shifted: From Rights Agency (product placement) to Compliance as a Service (B2B verification service)**
- **Three-gear model introduced:** CaaS foundation (Gear A) + Showcase marketplace (Gear B) + Producer track (Gear C)
- **CarFax two-sided model:** Verification service (Side A pays for business) + discovery marketplace (Side B is long-term value multiplier)
- **Opt-in flywheel mechanism:** Verification customers become marketplace inventory via checkbox after approval — solves chicken-egg problem
- **Platform architecture from day one:** Supabase (auth + database + file storage), creator login/dashboard, admin review panel, public catalog
- **Revenue model updated:** $499/video verification (primary) + 20% licensing commission (secondary) + producer curation (tertiary)
- **Pricing shift:** From 80/20 filmmaker split (v3) to 20% SI8 commission (v4) — more defensible for unproven platform

**Why the pivot:**
- **v3 deadlock:** Filmmakers won't submit without proof of buyers (Essa, Leon call notes); buyers won't commit without catalog (Isaac, The Media Shop). Chicken-egg problem blocked execution.
- **Peer review validation:** Both ChatGPT (Claude Opus) and Gemini validated two-sided CarFax model as solving chicken-egg problem. Verification customers paying upfront removes need to recruit creators separately.
- **Immediate revenue:** CaaS generates transaction fees ($499) immediately vs. waiting for licensing deals to close
- **Platform scalability:** Verification service can scale via self-serve platform (Year 3 vision); product placement is time-intensive and doesn't scale
- **Market gap:** No B2B verification service exists for Sora/Runway/Kling outputs (Adobe only covers Firefly)

**The three gears explained:**

**Gear A (CaaS Foundation) — PRIMARY:**
- B2B verification service: $499 per video Chain of Title verification
- Customers: Production agencies, brands, filmmakers
- Process: 70-field submission → manual review (90 min) → 9-field Rights Package PDF
- Revenue: Transaction fee (immediate cash)
- Year 1 target: 60-70 verifications ($30-35K)

**Gear B (Showcase Marketplace) — SECONDARY:**
- After Gear A verification, creator sees checkbox: "List in catalog for licensing?"
- If yes → film appears on superimmersive8.com with Rights Verified badge
- Buyers browse → license → SI8 takes 20% commission
- Revenue: Commission (recurring, passive)
- Year 1 target: 20-30 films in catalog, 10 licensing deals ($6-10K SI8 commission)

**Gear C (Producer Track) — TERTIARY:**
- JD curates custom slates for whale buyers (MyVideo)
- Uses Gear A (verification) + Gear B (catalog discovery) as infrastructure
- Revenue: Project fee ($10K-$20K per slate)
- Year 1 target: MyVideo $10K + 1-2 additional deals ($17.5-25K total)

**Conflict of interest handling:**
- PMF Strategy Inc. (legal entity) / SI8 (DBA) — one entity, two operational "hats"
- JD acts as Producer for Gear C deals (using SI8 tools)
- SI8 acts as independent verifier for Gear A clients
- Transparency: Role disclosed in each transaction

**Supporting documents (new):**
- `PEER_REVIEW_SUMMARY_CAAS.md` — ChatGPT (Opus) + Gemini feedback synthesis
- `REVENUE_MODEL_v4.md` — Three-gear unit economics, projections, sensitivity analysis
- `COMPETITIVE_ANALYSIS_CAAS_2026.md` — Updated competitive landscape for CaaS model

**Evidence base:**
- Filmmaker feedback: Essa (Hong Kong) and Leon (LKDN_OFFICIAL) both failed to convert under v3 model (20% royalty + unproven platform not compelling)
- Buyer feedback: Isaac (Minted Creative) and The Media Shop both asked for "examples" before committing — catalog doesn't exist under v3 model without recruiting filmmakers first
- Peer review: Both AI advisors validated CaaS model independently, converged on two-sided CarFax architecture

**What stayed the same:**
- Rights Verified process (legal vetting, Chain of Title documentation)
- No List (likeness, voice cloning, IP imitation remain prohibited)
- Geographic strategy (Singapore/SEA for CaaS, Taiwan for Producer track)
- Bilingual website (EN + ZH-TW)
- Year 1 revenue target ($80-120K)
- Platform vision (Year 3 self-serve, judgment layer as moat)

**Execution plan (next 30 days):**
- Week 1-4: Build Supabase platform (creator auth, submission portal, admin review panel, opt-in system, public catalog)
- Week 1: Email Jamie Lin (MyVideo) with slate pitch, book discovery call
- Month 2: Launch CaaS outreach (Singapore agencies), close MyVideo deal
- Month 3: First verifications, first opt-ins, catalog goes live
- Month 6: Validation checkpoint (10 verifications/month, 20 films in catalog, 5 licensing deals)

**See:** `PEER_REVIEW_PROMPT_CHATGPT.md` and Gemini feedback (conversation history) for full peer review analysis

---

## v3.2 — March 12, 2026
**File:** `BUSINESS_PLAN_v3.md` (updated in place)
**Status:** Current direction

**What changed from v3.1:**
- **London agencies added as alternate Track 2** based on real-world outreach results
- Singapore outreach documented: ~200 contacts, <5% response rate → deprioritized
- London outreach documented: Strong response rate, multiple calls booked (3/17-18/2026)
- New section: "Market Discovery: London Alternate Track" with decision framework
- Geographic flexibility established as strategic advantage: "Real-world traction determines strategy, not theoretical market sizing"
- Decision checkpoint set: March 18, 2026 (after first London calls)

**Why:** After 200 Singapore agency contacts yielded minimal response, London agencies showed strong interest and booked multiple discovery calls. Market validation trumps theoretical planning. The business plan now reflects this real-world feedback and sets clear validation criteria for the London track.

**Market hypothesis:** London agencies may be more receptive to AI rights positioning due to:
- Stronger AI adoption in UK creative industry
- European regulatory awareness (AI Act)
- Major global ad hub with international clients
- English as primary language (no translation friction)

**Next milestone:** First London calls (3/17-18) will validate or invalidate London as primary Track 2. See decision framework in updated business plan.

---

## v3.1 — February 2026
**File:** `BUSINESS_PLAN_v3.md` (updated in place)
**Status:** Current direction

**What changed from v3.0:**
- "The Bad Boy Indemnifier" competitive differentiation added: SI8 gives brands access to the best creative AI tools (Sora/Kling/Runway) that corporate legal teams are afraid of — the gap Adobe structurally cannot fill
- Competitive differentiation table added: Adobe vs SI8 Standard Tier vs SI8 Certified Tier
- C2PA / Content Credentials flagged as a monitoring item — provenance documentation will be commoditized; SI8's value is the *judgment layer* (subjective legal review), not documentation
- Passive Reuse added as platform validation signal: same asset earns revenue from two different buyers proves platform logic
- Platform Horizon refined: VC path is upside not requirement; three long-term outcome options (services agency / self-serve platform / VC-backed platform), all acceptable
- Process standardization named explicitly as Year 1 priority alongside revenue
- One-sentence summary updated to reflect "Bad Boy Indemnifier" framing

---

## v3.0 — February 2026
**File:** `BUSINESS_PLAN_v3.md`
**Status:** Superseded by v3.1 (same file, updated in place)

**What changed from v2.1:**
- Primary offering reframed: Custom AI Product Placement in vetted productions is now the hero offer
- Secondary offering: Standard catalog licensing as-is (for platforms, airlines, content libraries)
- Tertiary (inbound only): Advisory + Referral + Commission — not advertised, comes from relationships
- Model named: Rights Agency (catalog) + Rights Management (advisory) firm for AI film
- "Getty for AI video" positioning established — explains catalog value instantly
- "Why not YouTube" competitive argument formalized
- Modification clause requirement added: all filmmaker shopping agreements must authorize SI8 to commission brand-integrated versions of catalog works
- Exclusivity framework defined for product placement deals (category-exclusive default)
- Four-tier services ladder documented: Tier 2 (placement) → Tier 1 (as-is) → Tier 3 (advisory) → Tier 4 (commission)

**Why:** The product placement layer (brand elements regenerated into existing AI productions) is uniquely possible with AI content and has no competitor. It justifies a premium price point, differentiates SI8 from stock libraries, and makes the catalog more compelling than a simple licensing play. Standard catalog licensing (Tier 1) still serves platforms and content buyers. Production/advisory stays available inbound.

**See:** BUILD_IN_PUBLIC_LOG.md (insights #41–#42 cover the reasoning)

---

## v2.1 — February 2026
**File:** `BUSINESS_PLAN_v2.md` (updated in place)
**Status:** Current direction

**What changed from v2.0:**
- Replaced "rights-cleared" language throughout → "safe lane vetted" / "safe lane AI content" (defensive legal framing)
- Added Risk Tiers section: Certified Tier (Adobe Firefly only) + Standard Tier (Runway/Pika/Sora) — offered from day one
- Added Advisory Board as Year 1 action item — credibility asset before first deals close
- Geographic strategy updated: Taipei + Singapore in parallel (Mandarin + English test markets); bilingual website required
- Catalog building elevated to Month 1-2 priority with minimum 3-5 safe lane vetted works required before licensing path is offered
- Single message discipline confirmed: "won't get you sued" is the Year 1 message; no layering until tested
- Process branding vs. piece certification: brand the Rights Verified process, not individual outputs
- E&O insurance flagged as future investigation (not Year 1 blocker)

**Why:** External peer review (ChatGPT + Gemini) surfaced legal liability in "rights-cleared" language, geographic strategy gaps, and missing credibility assets. See BUILD_IN_PUBLIC_LOG.md insight #41.

---

## v2.0 — February 2026
**File:** `BUSINESS_PLAN_v2.md`
**Status:** Superseded by v2.1 (same file, updated in place)

**What changed:**
- Primary Year 1 pitch reframed: demand-side first ("rights-cleared AI content for brands/agencies") rather than filmmaker representation agency
- Core value proposition updated: buyer pain point ("won't get you sued") as the opener
- Website and outreach lead with buyer-facing framing, not filmmaker-facing
- AI Creator Fest event structure updated: demand-side content leads (brand/agency audience), filmmaker showcase as the proof of claim
- Supply-side (filmmaker representation, distribution) explicitly positioned as the Year 2-3 moat, not the Year 1 pitch

**What stayed the same:**
- Two-layer business model structure (Layer 1 production, Layer 2 distribution)
- Revenue targets and 60/40 → 20/80 transition plan
- APAC + Europe regional strategy (Singapore first)
- MyVideo parallel track
- Legal infrastructure as core competency
- Rights Playbook
- The No List / Rights Verified
- All financial projections

**Why the change:**
- Demand side has the budget in Year 1 — brands and agencies pay; filmmakers don't
- Legal fear around AI content is at peak in 2025-2026 — "won't get you sued" opens doors
- Rights Playbook (now built) is more powerful as a marketing asset to buyers than as internal infrastructure
- Filmmaker representation still builds the long-term moat — just not the Year 1 pitch
- See BUILD_IN_PUBLIC_LOG.md insight #40 for full strategic reasoning

---

## v1.0 — January 2026
**File:** `BUSINESS_PLAN_v1.md`
**Status:** Archived (reference)

**Core approach:** Supply-side first — filmmaker representation agency, creator-facing public brand, distribution commissions as primary Layer 2 revenue model. Production (Layer 1) as private/B2B revenue engine.

**Reason archived:** Year 1 revenue path was too slow via distribution commissions alone. Demand-side-first approach generates faster revenue while still building toward the same long-term distribution platform.

---
