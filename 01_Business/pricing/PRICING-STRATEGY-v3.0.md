# SI8 Pricing Strategy v3.0

**Date:** 2026-07-19
**Status:** Current — Institutional model (Agency + Enterprise), self-serve retired to unpublished fallback
**Supersedes:** PRICING-STRATEGY-v2.0.md (two-tier CaaS pricing, $29/$499 — now archive)
**Context:** The v5 site pivot (2026-07-12) removed all pricing from the primary marketing site and replaced the self-serve funnel with a single "Book a call" CTA. This doc captures the commercial model decided 2026-07-19 after a full lead sweep (`03_Sales/LEAD-SWEEP-V5-PIVOT-2026-07-18.md`) and a three-way strategy review (Opus/ChatGPT/Gemini).
**Every dollar figure below is a hypothesis, not a confirmed price.** No enterprise or agency deal has closed under v5 yet. All pricing/segmentation is theory until a real buyer reacts to a real number.

---

## Update — 2026-08-05: Legacy Self-Serve Narrative Retired (Superseded by CRC)

**Decision:** Motion 1 (Legacy Self-Serve, $29 Creator Record) is no longer part of SI8's forward-looking product narrative. Going forward the story is: **free AI-assisted Commercial Readiness Check (CRC) → paid, human-reviewed Assessment** (Agency/Enterprise motions, unchanged below).

**What changes:** the free-tier narrative. CRC (`08_Platform/prds/PRD_CRC_v1.0.md`, frozen 2026-08-05) replaces Motion 1 as the thing SI8 leads with ahead of a paid engagement. CRC is free with no payment step at all — this is not a repriced or repositioned version of the $29 product, it's a different mechanism entirely (AI-assisted interview, not self-attested submission).

**What does not change:** Motion 2 (Agency, $499 floor hypothesis) and Motion 3 (Enterprise, custom-scoped) are untouched by this decision — same pricing philosophy, same "identical methodology across every motion" principle stated in the Executive Summary below.

**Infrastructure disposition (decided 2026-08-05):** the existing $29 RecordForm infrastructure (Stripe product, `/record` route, auto-approval webhook, self-attested PDF generator) is **left dormant, not deprecated.** No code changes triggered by this decision — JD explicitly chose not to touch it. It simply stops being part of the narrative or funnel going forward: same "unmarketed, no sales effort" posture Motion 1 already had since 2026-07-19, now permanent rather than provisional.

**Effect on the Motion 1 open question below:** the "inbound-handling process for freelancers who reach out anyway" question (under Open Questions) is superseded, not resolved — there's no active narrative pointing anyone toward the $29 product anymore to trigger that inbound in the first place. Left in place rather than deleted, consistent with this document's practice of preserving prior reasoning rather than silently editing it out.

---

## Executive Summary

Three motions, not one product with tiers:

| Motion | Buyer | Status | Pricing |
|--------|-------|--------|---------|
| **Legacy self-serve** | Individual creators/freelancers | Kept alive, **unpublished, unmarketed** — fallback only | $29 Creator Record (unchanged mechanics, no active sales effort) |
| **Agency** | ICP 1 — CD/production lead needing a single assessment | Primary near-term motion | $499 floor hypothesis, ad hoc per call, untested ceiling |
| **Enterprise** | ICP 2 — Legal/governance buyer needing a standard imposed across an agency roster | Primary long-term leverage | Custom-scoped, vision-sold, v1 delivery = pilot |

**Core principle protecting independence:** The assessment methodology, rigor, and commercial opinion are **identical across every motion**. Only the *engagement* changes — never the standard. If asked "is the cheaper one less rigorous?": *"No. We don't issue different standards depending on what someone pays. The methodology is the same. Enterprise engagements include additional support around procurement, governance, and reporting — not a different opinion."*

---

## Motion 1: Legacy Self-Serve

**Decision (2026-07-19):** Kept alive but deliberately unpublished and unmarketed. Not a growth engine, not a target of outreach or sales-call time. Treated as optional upside if it generates unsolicited volume — that would be data worth noticing, not a result to chase.

- Mechanics unchanged from v2.0: $29 Creator Record, self-attested, automated, no human review, PDF stamped for non-commercial use only.
- No link from the v5 site nav. No campaign targets this segment. No CRM/pipeline tracking effort is spent qualifying these leads as active opportunities.
- **Open question (unresolved as of 2026-07-19):** the exact inbound-handling process for freelancers who reach out anyway isn't fully specified yet — specifically, whether routing/response is automated or requires a manual reply, and what the reply should say. Until this is decided, default to: don't name or price the $29 product in writing; if someone asks, reply informally that a limited self-serve option exists for independent creators and offer to send access on request, rather than actively pitching it.

---

## Motion 2: Agency

**Buyer:** ICP 1 (Agency) — see `03_Sales/ICP-DEFINITIONS.md`. Single finished asset → one Assessment Report → "unblock this campaign." Transactional, not a relationship.

**Pricing approach (decided 2026-07-19):** No formal A/B price test. JD makes ad hoc pricing choices per sales call, using **time-limited discount codes as the negotiation lever** rather than a fixed public number. $499 is the floor of the working hypothesis, not the answer — prior signal already suggests it may underprice campaigns with real media spend at stake. On acute, high-stakes situations (a blocked campaign backed by five or six figures of media spend), the instinct should be to probe upward, not anchor down.

**Website pricing (decided 2026-07-19 — Opus's "middle path," operationalized):**
- No pricing link in primary nav or anywhere in the cold-visitor path.
- A pricing page exists and is published, but **unlisted** — reachable only via direct link, shared manually the moment a prospect asks about cost before booking a call.
- This satisfies both halves of the "middle path" principle: doesn't erode the not-price-led institutional positioning for cold traffic, but doesn't gatekeep price behind a mandatory sales call either — if someone asks, they get an instant answer.
- **No trigger threshold is defined for moving to full publication.** This was explicitly left open (2026-07-19) — revisit only if/when call data makes a clear case either way, not on a schedule.

**What's included:** unchanged from the v4.1 assessment scope in substance — independent review of tools, rights, likeness exposure — but the deliverable is now framed as the **Assessment Report (PDF)**, matching v5 site terminology. Do not pitch the C2PA-signed file or on-chain registration as already delivered — the site marks the verifiable record as "Coming soon."

---

## Motion 3: Enterprise

**Buyer:** ICP 2 (Legal) — brand legal, agency GC, holdco AI governance. **Not "the Agency product plus features."** A different engagement built on the identical assessment methodology.

**What Enterprise is actually buying (per the 2026-07-19 synthesis — this is the most important reframe in this document):** Not a better opinion. **Policy, not just assessments** — Agency asks "can you assess this?"; Enterprise asks "what do we require every agency to do?" That's a governance relationship: Policy → Agencies → Assessments → Governance. Pricing is justified by the scope of that relationship (procurement, onboarding, standardization, rollout, executive coordination) — never by claiming a more rigorous assessment.

**Enterprise wrap menu — what can eventually justify premium/custom pricing:**
- MSA / DPA support, procurement-friendly invoicing (PO instead of credit card, vendor onboarding into systems like Coupa/Ariba)
- Negotiated SLA
- Executive briefings
- Named reviewer / escalation path
- Consolidated private dashboard across a brand's agency roster
- Potential annual retainer / assessment-volume allocation

**⚠️ Delivery guardrail — decided 2026-07-19: sell the vision only; scope v1 delivery as a pilot.** Do **not** promise SLA-bound turnaround (e.g., 24–48hr), a live multi-agency dashboard, or retainer-based bulk allocations as available *today*. A solo founder cannot currently honor these, and breaking that promise to the strongest cascade lead in the pipeline (Ivan Petruzzelli, Dan Lantry) is worse than not landing the deal at all. Sell Enterprise on the value of the relationship and price against it — but scope actual delivery as a defined pilot: *"we'll assess your next N agency submissions against a defined standard and give you a consolidated view."* Build the full SLA/dashboard/retainer program only once it can genuinely be staffed.

*(Note: an earlier version of this recommendation, from one of the three synthesis reviews, proposed selling the 24–48hr SLA and live dashboard now. That recommendation was explicitly rejected in favor of the guardrail above — flagging the disagreement here so it isn't silently lost if this doc is revisited.)*

**Pricing:** Custom-scoped, multiples above the Agency floor. No fixed number — negotiated per engagement based on the scope of the wrap, not a rate card.

---

## What Was Retired From v2.0

- **Two-tier CaaS pricing ($29/$499, visible on the homepage)** — retired. Self-serve $29 survives only as an unmarketed legacy fallback (Motion 1).
- **Volume discount table (5–9 videos at $399, 10+ at $349)** — retired as a fixed public rate card. Volume/scale pricing now lives inside the Enterprise motion's custom scoping, not a published table.
- **Licensing fees / Showcase marketplace commission structure** — not part of the current primary narrative (the v5 homepage doesn't mention Showcase at all). Not formally killed, but not active — treat as dormant until revisited.
- **"Why not 3 tiers" reasoning (rejecting a $199 middle tier)** — moot; there's no tiered public pricing at all anymore.

---

## Open Questions Carried Into This Version

- Legacy self-serve inbound handling — automated router or manual reply? Script not finalized. **Superseded 2026-08-05** — see Update section above; moot now that CRC is the active free-tier narrative.
- No price-publication trigger threshold defined — deliberately left open.
- No formal price-ceiling test protocol — ad hoc/discount-lever approach chosen instead; this means learning will be anecdotal (per-call judgment) rather than structured data. Worth revisiting if/when enough calls accumulate to look for a pattern.

---

*Version: v3.0 — 2026-07-19*
*See PRICING-STRATEGY-v2.0.md for the archived v4-era two-tier CaaS model (superseded).*
