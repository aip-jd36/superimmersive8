# Standing Encore — Agency Intelligence Methodology

**Purpose:** Define how agencies are sourced, evidenced, and classified for the Standing Encore HGE/institutional-exposure research pool — so the rules are fixed before classification starts, not argued about after the data comes in (per JD's own stated methodology principle).

**Status:** Active — governs `AGENCY-INTELLIGENCE-DATABASE.md`
**Started:** 2026-08-04
**Related:** `03_Sales/outreach/SPLIT-TEST-LOG.md` (Test A origin — regulated-sector hypothesis); `03_Sales/ICP-DEFINITIONS.md` (documented Sales Navigator filter failure for finserv industry search); `01_Business/product-discovery/insights/2026-08-04-t4-t5-trigger-investigation.md` (the evidence base this methodology is built to test)

---

## Why two dimensions, not one

The original hypothesis (Test A, `SPLIT-TEST-LOG.md`) was single-dimensional: regulated-sector client exposure predicts conversion. The T4/T5 trigger investigation found that only 2 of 6 real T4 examples were classically regulated-sector (Ramez Tabshi's Dubai agency clients, Myron Stapleton's government/health-board clients) — the other 4 (Amazon, Sony Pictures, Nexus Studios, a VFX studio with "more NDAs involved") had no regulatory driver at all, just large-scale institutional buyers with real legal/procurement functions. Collapsing these into one "HGE" bucket would hide which dimension is actually doing the predictive work. They're tracked separately so that can be tested directly once Standing Encore data comes in.

## Dimension 1 — Regulated-Sector Exposure (RSE)

Does the agency have documented work for clients in: banking, insurance, healthcare, pharma, government, or public sector.

## Dimension 2 — Institutional Approval Exposure (IAE)

Does the agency have documented work for clients that are large/publicly-recognizable enterprises with a formal legal/compliance/procurement function, regardless of sector — Fortune 500, FTSE 100, major public companies, large multinationals, large procurement organizations. A client can qualify here without being in a regulated industry (Amazon, Sony, a major tech company).

An agency can score on neither, one, or both dimensions. Both are tracked independently in the database.

---

## Scoring scale (applies to each dimension separately)

| Score | Label | Bar |
|---|---|---|
| **0** | None | No evidence found in this dimension |
| **1** | Weak | Agency's own marketing copy claims sector experience generally (e.g. "we work across finance and healthcare") with no specific named client or case study |
| **2** | Confirmed | At least one specific named client + a specific case study, work sample, or award entry evidencing real delivered work in this dimension |
| **3** | Strong | Multiple named case studies in this dimension, OR a specifically prominent client (major bank, global pharma co, Fortune 500 name), OR Cannes/WARC/Campaign award recognition for work in this dimension |

**Directory tags (Clutch "Financial Services" category, Agency Spotter industry filter) count as evidence of a Weak (1) signal only, never Confirmed or Strong on their own** — per JD's explicit standard, directory tags alone are not sufficient evidence. A Clutch listing is a lead to go verify against the agency's own site, not a citation in itself.

---

## HGE / SCE classification, derived from the two scores

- **HGE (High Governance Exposure):** RSE ≥ 2 **or** IAE ≥ 2 — at least one dimension has a real, named, Confirmed-or-better case study.
- **SCE (Standard Commercial Exposure):** RSE ≤ 1 **and** IAE ≤ 1 — no confirmed named evidence in either dimension; agency's documented work is general-consumer/brand-facing.
- **Insufficient evidence:** agency has no meaningful public case-study presence at all (common for very small shops). These are excluded from both buckets rather than defaulted into SCE — absence of evidence is not evidence of SCE status, and defaulting them in would quietly bias the SCE arm toward agencies that simply don't publish case studies, which may correlate with other confounds (agency size, maturity).

---

## Inclusion rules

- Agency must be a **creative/production agency** — an entity that actually makes campaign content (video, imagery, brand work), not a media-buying, media-planning, or pure-strategy shop. (This is the exact lesson from the March 2026 discovery calls — media buyers route content requests to production partners and are not the buyer.)
- Agency must have a **documented presence** in one of the five target geos (UK, Germany, Netherlands, Singapore, UAE) — either headquartered there or a real local office, not just serving the region remotely.
- Agency must plausibly have **Creative Director / Senior Production Specialist / Executive Producer / Head of Production**-level roles worth targeting — i.e., large enough to have a real creative leadership structure, not a one-person freelance operation.

## Exclusion rules

- **Media buying / media planning agencies** — wrong buyer type, confirmed dead end in March 2026 discovery calls.
- **AI-native tool vendors or AI platform companies** (e.g. an agency that IS an AI video tool, not a user of one) — wrong side of the market, per existing exclusion criteria in `SPLIT-TEST-LOG.md`.
- **Freelance / solo operator / no-company profiles** — no organizational pressure above them to generate T3/T4 signal, same exclusion already established for individual-lead targeting.
- **Agencies where the only evidence source is a directory tag with zero corroborating case study** — held at Weak(1)/Weak(1) = excluded from both HGE and SCE, logged as "insufficient evidence," not force-classified.

---

## Confidence field (per agency, in addition to the two dimension scores)

- **Verified** — evidence is a direct citation to the agency's own published case study/client page, or a named-client citation from Cannes/WARC/Campaign/The Drum.
- **Network-inferred** — evidence comes from the parent network's global roster (e.g. "MullenLowe serves Unilever globally") applied to a specific local office without confirming that office's own specific client list. Real signal, but flagged explicitly as an assumption that should be spot-checked before the office's leads go into a final send list, since a network's global roster doesn't guarantee a specific local office's actual account roster.
- **Directory-only** — Weak(1) evidence from a directory tag alone, not yet upgraded to Confirmed. Not eligible for HGE classification until upgraded.

---

## Governance note: HGE/SCE is the sampling proxy, not the hypothesis (added 2026-08-04, refined 2026-08-04)

**Standing Encore is not testing whether HGE is "the" ICP. It is testing whether HGE is a useful operational proxy for organizations that experience higher rates of T4 institutional approval events.** HGE/SCE (and the RSE/IAE scoring underneath it) is the current *operational proxy* for that latent variable — not the hypothesis itself. This distinction matters for anyone (human or AI) picking this file up later: if a better proxy surfaces (procurement maturity, contractual complexity, enterprise-client mix, something not yet imagined), the sampling method can be swapped without changing the underlying question the experiment is actually testing. The proxy may change in future experiments. The underlying scientific question should not. Do not let "HGE vs. SCE" harden into the thing being tested — it's the current best guess at how to find the thing being tested.

## Sampling objective: person-balanced, not agency-balanced (added 2026-08-04)

The experiment randomizes at the person level. The agency database is the sampling frame, not the unit of analysis. **The target is approximately equal numbers of eligible people per arm, not equal numbers of agencies per arm.** If one HGE agency yields 12 suitable creative leaders and one SCE boutique yields 4, the correct response is more SCE agencies — not forcing 1:1 agency counts. Agency counts are still preserved and reported (they matter for research-effort tracking and for understanding sourcing yield), but they are no longer the optimization target.

**Creative Leadership Density** — estimated per agency, not exact, to forecast person yield before Sales Navigator extraction:
- **High** — 10+ likely eligible contacts (Creative Director / Executive Producer / Head of Production-type roles)
- **Medium** — 5–10
- **Low** — under 5

This is a judgment estimate based on agency scale/staff signals found during sourcing (network size, multi-office presence, described scope), not a verified count — Sales Navigator extraction is the actual verification step, owned by JD.

## Methodology update after UK pass (2026-08-04)

**Clutch/Agency Spotter-style directories are a weaker sourcing channel than expected — deprioritize for remaining regions.** Of 6 UK agencies sourced via Clutch industry tags in the first pass, at least 2 individually re-checked (ROAST, Ninja Promo) turned out to be performance/SEO/digital-marketing shops that fail the inclusion rule (not primarily creative/production agencies), despite having genuinely strong RSE client evidence. The directory's "Financial Services"/"Healthcare" industry categories select for agencies serving those sectors in any capacity — including PPC and SEO — not specifically for creative/production agencies making campaign content. Named holdco-network agencies (sourced by searching each network's own case studies directly) had a 100% hit rate on both inclusion and evidence quality in this pass, at similar per-agency search cost. **For Germany/Netherlands/Singapore/UAE: lead with the named-network method; treat directory listings as a supplementary source only, and verify inclusion (agency type) before verifying evidence (client exposure), not after.**

**HGE and SCE arms are not symmetric in expected people-per-agency.** Large institutional client rosters and large staff counts correlate — the same thing that makes an agency HGE-eligible tends to make it a bigger Sales Navigator target. Genuine SCE agencies (by definition, boutique/consumer-focused) skew smaller. Don't assume a 1:1 agency-count balance produces a 1:1 person-count balance — see the feasibility note in the database file.

## Standing rule: agency self-positioning never overrides client evidence (promoted 2026-08-04)

An agency's own brand identity — "independent," "boutique," "unconventional," "challenger" — carries **no information** about client-institutional-exposure and must never be used as a substitute for checking the actual client roster. This is not a hypothesis; it's now a confirmed pattern across three independent countries: **Lucky Generals** (UK — read as a challenger-brand SCE candidate, actual clients TSB + Amazon), **HY.AM STUDIOS** (Germany — read as an independent fashion-boutique SCE candidate, actual clients Hugo Boss + Adidas), **KesselsKramer** (Netherlands — read as an unconventional-independent SCE candidate, actual clients Diesel/Nike/Heineken/MTV). Three for three. **Every agency, regardless of how it describes itself, must have its actual named client roster checked before SCE classification is accepted** — this is not optional or a spot-check; skipping it is how all three misses above happened before being caught.

## Fields added under Sampling Methodology v1.1 (2026-08-04)

**Agency Scale** — S (under ~50 staff) / M (~50–250) / L (~250–1,000) / XL (1,000+), banded from whatever staff-count signal surfaces during sourcing. Recorded for every agency in both arms. Purpose: lets later analysis separate whether T4 frequency tracks *client* institutional exposure (RSE/IAE) or just *agency* organizational complexity (raw size) — see `SAMPLING-METHODOLOGY-v1.1.md` Confound 1.

**Primary Client Type** — optional, analytical only, not a sampling variable (does not affect HGE/SCE classification or agency selection). Examples: Enterprise B2B, Enterprise Consumer, Government, Healthcare, Financial Services, Startup, SME, Luxury, Entertainment. Captures the dominant character of an agency's documented client base for later cross-referencing against T4 results — e.g., once real T4 data comes in, this field could reveal whether the effect concentrates in a specific client-type category rather than RSE/IAE broadly. Record per agency where it's reasonably inferable from the same evidence already gathered for RSE/IAE scoring — no separate research pass required.

## What this methodology does NOT do (yet)

It does not attempt to verify agency size in a rigorous way (headcount estimates are approximate, sourced from LinkedIn company page "employees" band where available, otherwise left blank) and it does not verify current point-in-time accuracy of case studies (a case study from a prior campaign doesn't guarantee an ongoing client relationship). Both are acceptable gaps for a targeting-list use case — the goal is "plausible enough to warrant an outreach attempt and a Sales Navigator company search," not "audit-grade proof of an active account."
