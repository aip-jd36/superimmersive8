# SI8 Product Discovery Log

**Purpose:** Running index of product insights — what we learned, when, from what source, and what it changed. One entry per insight. Each entry links to a deep-dive file in `insights/` when the finding is substantial enough to document.

**Entry format:**
- **Date** — when the insight was surfaced
- **Insight** — the finding in one sentence
- **Source** — where it came from (call, research, campaign reply, peer review)
- **Product implication** — what this changes or validates
- **Status** — `Hypothesis` / `Validated` / `Built` / `Abandoned`

---

## Log

### 2026-08-04 — The Enterprise Trigger (T4/T5) Is Almost Never Observed
**Insight:** Tested whether "Commercial Assurance is too early" (Possibility A) vs. "the trigger exists but is uninstrumented" (Possibility B) by searching every available source — CRM notes, call notes, discovery logs, not just the 642-reply LinkedIn set — for actual observed enterprise-approval events (T4) or post-delivery risk events (T5), classified on a T0–T5 taxonomy. T5 (dispute/claim/litigation/insurance denial/audit) is a clean zero across every source. T4 (an actual external review/approval event) was found exactly 6 times against several hundred contacts (~1% base rate) — but all 6 cluster inside large/institutional/regulated-adjacent buyers (State Street, government/health-board clients, Amazon, Sony Pictures, an enterprise-clients Dubai agency), none from small agencies or general consumer brands. The one campaign explicitly labeled/targeted for finserv (Legal Friction — FinServ) produced a clean null result — zero T3+ signal — while every real T4 example came from unfiltered outreach that happened to land on a large buyer.

**Source:** Full re-investigation across `CRM.md`, `DISCOVERY-PIPELINE.md`, `DISCOVERY-PERFORMANCE-LOG.md`, all 4 call-notes files, and the previously-analyzed LinkedIn dataset re-classified under the new taxonomy. August 4, 2026.

**Product implication:** Verdict is closer to Possibility B than A, but weakly — 6 data points can't rule out that the trigger is simply rare everywhere, including inside a deliberately-built HGE population. Don't build messaging or roadmap around "the trigger is common." Don't treat the E&O/insurance angle as validated — zero supporting evidence, not weak evidence. The FinServ-label null result is a real caution for Standing Encore's HGE/SCE design: institutional buyer scale may matter more than industry-sector labeling. Recommend tracking T4 mentions as an explicit Standing Encore metric, separate from reply rate.

**Status:** Hypothesis-testing complete, conclusion inconclusive by design — insufficient volume to fully resolve Possibility A vs. B. Feeds directly into the Standing Encore HGE/SCE experiment design.

**Deep-dive:** [`insights/2026-08-04-t4-t5-trigger-investigation.md`](insights/2026-08-04-t4-t5-trigger-investigation.md)

**Version impact:** None yet — informs GTM/Standing Encore design, not product architecture

---

### 2026-06-25 — Capture Integration Confirmed: MP4, Custom Assertions, Workflow Aligned

**Insight:** Sofia Yan (Co-founder & CGO, Numbers Protocol) replied to JD's outreach same day. Three critical unknowns resolved in one email: (1) MP4/MOV/WebM video signing confirmed; (2) custom C2PA assertions confirmed — she specifically named "mapping your review documentation into structured C2PA assertions"; (3) the "sign final delivered MP4 before client handoff" workflow is confirmed as something Capture supports. Meeting being arranged in Taipei.

**Source:** Direct inbound reply from Sofia Yan, Numbers Protocol, June 25, 2026. CRM: P001.

**Product implication:** Capture integration path is unblocked. The three-deliverable concept (Chain of Title PDF + C2PA-signed video + ERC-7053 on-chain record) is technically confirmed viable via Capture's infrastructure. Next step: schema alignment meeting — which fields in SI8's Chain of Title map to which C2PA assertion fields, and verification URL setup.

**Art. 50 framing note:** Sofia was careful on Art. 50(2) — aligned with peer review correction: "signing the final composited video supports Article 50-style transparency and auditability at delivery" is correct; "automatically satisfies the full legal obligation" is not. She recommended preserving source-generation disclosures where relevant. This is the right nuanced framing.

**Status:** Confirmed — integration path viable. Meeting pending in Taipei with Numbers Protocol co-founder.

**Deep-dive:** CRM P001; meeting notes to be filed at `03_Sales/call-notes/` after meeting

**Version impact:** v4.1 — Capture confirmed as Year 1 integration; schema meeting is the next build milestone

---

### 2026-06-25 — Peer Review Corrections: Gap Reframe, Regulatory Fix, Trust List Required

**Insight:** Three-model peer review (ChatGPT, Gemini, Claude Opus) validated the core clearance gap but corrected four material errors in the v4.1 hypothesis. The thesis survives; the technical wrapper and regulatory framing needed significant correction.

**Source:** ChatGPT, Gemini, Claude Opus — independent peer review of SI8 v4.1 findings (June 25, 2026).

**Four corrections:**

1. **The gap is narrower than stated.** Adobe Premiere Pro has native "Export with Content Credentials" — it re-signs at the delivery step for free. The gap is not "nobody re-signs at delivery." It is "nobody attaches *clearance assertions* at delivery." Premiere signs the file with account holder identity. It doesn't clear the content. Reframe: "Premiere signs the file. SI8 clears it."

2. **Regulatory framing is wrong on the law.** Art. 50(2) machine-readable marking = provider obligation (Runway/Kling/Veo, already compliant). Art. 50(4) visible disclosure = deployer obligation (agencies), addressed by platform toggles. Agencies are not statutorily required to buy machine-readable re-marking. SI8's hook is commercial risk: brand legal teams demanding documentation regardless of statute. Frame as commercial risk shield, not regulatory mandate.

3. **On-chain hash ≠ C2PA soft binding; doesn't survive platform re-encoding.** ERC-7053 registers a hash of specific bytes. Platform re-encoding changes the bytes → hash no longer matches the file viewers see. On-chain is an audit timestamp artifact, not a durable disclosure signal. C2PA "soft binding" = invisible watermark embedded in pixels (Resemble AI Videoseal, Digimarc) — survives transcoding. Build watermark layer only when a buyer asks for it by name.

4. **Trust List recognition is load-bearing, not cosmetic.** Market is already asking for C2PA. If a legal team drops SI8's signed file into Adobe's Content Authenticity viewer and sees "unrecognized signer," the product fails at the moment of truth. Capture (Numbers Protocol) is on the Trust List — route through Capture for Year 1. Apply to C2PA Conformance Program now in parallel; once approved, SI8 can self-sign as a recognized entity.

**Product implication:** Capture is back as the Year 1 signing infrastructure (not optional). Self-deploy path is the long-term goal after Conformance Program approval. The three-deliverable concept holds — Chain of Title PDF + C2PA-signed video (via Capture, Trust List) + audit timestamp — but pitch the audit layer as proof-of-clearance, not as durable disclosure.

**Status:** Hypothesis updated. Capture technical call is now Step 2 (after lead validation). C2PA Conformance Program application is a parallel action item to start immediately.

**Deep-dive:** [`insights/2026-06-24-disclosure-gap.md`](insights/2026-06-24-disclosure-gap.md) — fully updated with all corrections

**Version impact:** v4.1 — infrastructure path revised (Capture primary, self-deploy future); regulatory framing corrected; competitive map updated (Adobe Premiere + Truepic added)

---

### 2026-06-25 — SI8 Can Own the Full Disclosure Stack Independently

**Insight:** ERC-7053 is an open Ethereum standard (~30 lines of Solidity), not proprietary to Numbers Protocol or Capture. SI8 can deploy its own CommitRegister contract on Polygon or Base and do on-chain registration independently at ~$0.001/video in gas. Combined with c2pa-rs (open source, confirmed MP4 support) for C2PA signing, SI8 owns the complete two-layer disclosure stack with no per-call API dependency on any third party. Infrastructure cost under $0.01 per SI8 Certified submission.

**Source:** ERC-7053 specification (eips.ethereum.org/EIPS/eip-7053) — reference implementation is ~30 lines of Solidity, deploys on any EVM chain, permissionless standard with no canonical registry. c2pa-rs supported formats documentation confirms MP4.

**Product implication:** SI8 v4.1 three-deliverable stack is fully buildable independently:
- Chain of Title PDF (existing)
- C2PA-signed MP4 via c2pa-rs + SI8 signing cert (~$289/year)
- On-chain registration via SI8-deployed ERC-7053 on Polygon/Base (~$0.001/video gas)

Capture is downgraded to "optional future upgrade" — the only thing it adds is C2PA Trust List recognition (named trusted signer badge in Adobe/Microsoft viewers). That is a UX improvement, not a compliance requirement. Evaluate Capture only if a buyer specifically requests it.

Technical build estimate: one developer, ~1–2 days. One-time contract deployment + c2pa-rs signing integration + workflow to hash file → commit on-chain → add transaction hash to Chain of Title PDF.

**Status:** Hypothesis — infrastructure path confirmed viable and fully owned by SI8. Gate: validate three-deliverable concept with one warm lead (B130, B148, or B149) before building.

**Deep-dive:** [`insights/2026-06-24-disclosure-gap.md`](insights/2026-06-24-disclosure-gap.md) — Tool Landscape and Validation Plan sections updated

**Version impact:** v4.1 — changes infrastructure path from "Capture API dependency" to "SI8-owned stack"

---

### 2026-06-25 — C2PA Developer Ecosystem Friction (Corrected)

**Insight:** Initial research (Jun 25 morning) misidentified a video gap in the official c2pa-rs reference implementation. The Issue #33 requesting "Full Video Container support" was on `arkavo-org/arkavo-rs` (a third-party library) — not `contentauth/c2pa-rs`. Corrected after follow-up research. The official c2pa-rs and c2patool **do support MP4 and MOV** for standard file-based operations. Fragmented MP4 (DASH/HLS) has a known bug, but regular MP4 export files — what SI8 receives from agencies — work fine.

**Source:** Official c2patool supported formats documentation (opensource.contentauthenticity.org); GitHub issue #1338 (contentauth/c2pa-rs) — fmp4 fragmented bug, not a general MP4 gap.

**Remaining real friction in the ecosystem:**
- Perth (Resemble AI audio watermarking): 8 open issues, 0 closed — GPU required, ~16.8kHz cap, docs gaps; not an SI8 dependency
- Capture SDK (numbersprotocol): 0 stars, 0 forks — minimal community; REST API is the right path regardless
- Imatag: real enterprise product (dpa Picture Alliance client), image-focused, €299/month min — not an SI8 target
- Amber Video: stalled 7-year-old product, irrelevant
- <1% of published global content carries C2PA metadata — ecosystem is pre-traction
- Signing cert costs ~$289/year with no free alternative — adoption barrier for small agencies
- AI Omnibus (May 2026): machine-readable marking grace period for pre-existing AI *systems* extended to Dec 2, 2026; new campaign *content* deployed from Aug 2 onward still faces the Aug 2 obligation

**Product implication:** No blocker on v4.1 infrastructure path. Both the Capture API integration and the c2pa-rs fallback support standard MP4. Capture technical call is still worth doing for integration confirmation and POC access — not a hard blocker. Three-deliverable concept is viable on existing infrastructure.

**Status:** Hypothesis — infrastructure path confirmed viable. Open: Capture API call for integration confirmation and Art. 50(2) re-signing question. Validate concept with warm lead (B130, B148, or B149).

**Deep-dive:** [`insights/2026-06-24-disclosure-gap.md`](insights/2026-06-24-disclosure-gap.md) — "Developer & Ecosystem Friction" section (corrected); [`01_Business/research/COMPETITIVE_ANALYSIS_CAAS_2026.md`](../research/COMPETITIVE_ANALYSIS_CAAS_2026.md)

**Version impact:** v4.1 — no change to three-deliverable concept or infrastructure path

---

### 2026-06-24 — C2PA Ecosystem Competitive Landscape
**Insight:** No company addresses the agency delivery step — the gap where a final composited campaign video needs C2PA re-signing and IP clearance after post-production strips the original metadata. The ecosystem splits cleanly into four non-overlapping positions: (1) model providers sign at generation; (2) Capture signs AI company outputs at inference; (3) ProofSnap/TrueScreen read and certify existing signals; (4) RightsDocket does per-registration human review + C2PA embed for audio. SI8 v4.1's position — re-sign final agency output with combined IP clearance — is unoccupied by any player.

**Source:** Competitive research session — ProofSnap (getproofsnap.com), TrueScreen (truescreen.io), RightsDocket (rightsdocket.com), c2pa.ai, Pebblous (blog.pebblous.ai), InCyan (inaccessible).

**Product implication:** RightsDocket is the closest architectural analog — same model (human review → C2PA embed → per-registration pricing, $20/registration for audio). **But RightsDocket launched ~May 2026 (1 month old), has 16 LinkedIn followers, no third-party reviews, and C2PA conformance still pending ("currently entering the program").** This validates the architecture reasoning, not PMF. Smart people independently converging on the same model is signal; it does not prove the market exists. Nobody has built this for commercial video. C2PA 2.4 spec mandates "hard bindings + soft bindings" combination — companies selling C2PA-only signing are building to a superseded spec version.

**Status:** Validated — competitive gap at the agency delivery step confirmed. No direct competitor identified for SI8's specific use case.

**Deep-dive:** Added as "Competitive Landscape" section in [`insights/2026-06-24-disclosure-gap.md`](insights/2026-06-24-disclosure-gap.md) and new section in [`01_Business/research/COMPETITIVE_ANALYSIS_CAAS_2026.md`](../research/COMPETITIVE_ANALYSIS_CAAS_2026.md)

**Version impact:** Confirms v4.1 positioning; no product change required

---

### 2026-06-24 — The Disclosure Gap
**Insight:** No tool exists to re-attach AI disclosure (C2PA + ERC-7053 on-chain) to a final composited campaign video after post-production strips the original metadata. Agencies have no workflow for this. EU Code of Practice mandates multi-layer marking (C2PA in file + durable secondary signal) — C2PA alone is legally insufficient.

**Source:** Technical research session — Truepic Vision API (ruled out), Capture API + compliance page (captureapp.xyz/compliance/), EU Code of Practice research, platform-specific disclosure requirement mapping (Meta/YouTube/TikTok).

**Product implication:** SI8 Certified ($499) delivers three outputs: (1) Chain of Title PDF (clearance) + (2) C2PA-signed final video (disclosure, in-file layer) + (3) ERC-7053 on-chain registration (durable secondary layer — survives stripping). Capture is the integration candidate — their API provides both C2PA signing and on-chain registration in one call at $0.001/sign. Capture's own market is AI model providers; the agency delivery-step gap is unaddressed by them — SI8's opening. Capture's 10-question compliance checklist is a SI8 sales/lead-gen asset.

**Status:** Hypothesis — not yet validated with a paying client. Open: confirm MP4 video support via Capture technical call. Validate with B130, B148, or B149.

**Deep-dive:** [`insights/2026-06-24-disclosure-gap.md`](insights/2026-06-24-disclosure-gap.md)

**Version impact:** v4.1

---

### 2026-06-24 — SI8 as Judgment Microservice Above C2PA Stack
**Insight:** C2PA is the delivery mechanism, not a competitor. SI8's value is the judgment data that populates the C2PA manifest — IP status, tool licensing, likeness assessment, commercial use authorization. Without SI8, C2PA tells you the file came from Runway. With SI8, C2PA tells you it's cleared for your campaign. The legally required stack is C2PA (in-file) + ERC-7053 on-chain (durable) — Capture provides both in one API call.

**Source:** Tim Deussen call (B125, XRBB Berlin). Post-call analysis: Truepic (ruled out), Capture API, Capture compliance page (captureapp.xyz/compliance/).

**Product implication:** SI8 outputs a structured JSON clearance payload mapping to C2PA custom assertion fields → passes to Capture API → Capture returns C2PA-signed file + ERC-7053 on-chain registration. Trust mark: "Cleared by SI8 · Verified by Capture." Near-term: publish the JSON schema. Medium-term: Capture integration as part of $499 service (pending MP4 video support confirmation).

**Status:** Hypothesis — architecture confirmed; Capture is the integration candidate. Open: confirm MP4 support + post-production re-signing satisfies Capture's Art. 50(2) interpretation on technical call.

**Deep-dive:** `03_Sales/call-notes/CALL-2026-06-24-B125-TIM-DEUSSEN-XRBB.md` (Post-Call sections)

**Version impact:** v4.1

---

### 2026-06-22 — ICP 1 Splits Into 1a and 1b
**Insight:** "Agency finserv" is two different buyers with different framing requirements. ICP 1a = agency CD with external finserv clients (chain: brand legal → agency). ICP 1b = in-house finserv CD (chain: internal compliance → their own team). Same product, different hook.

**Source:** JD NY 299-lead campaign list analysis. Sales Navigator filter mismatch discovered — Financial Services filter pulls in-house finserv (1b), not agency-side (1a).

**Product implication:** No product change needed. Sequence framing must fork: 1a hook = "when your client's legal team asks," 1b hook = "when your compliance team reviews."

**Status:** Validated — 4 confirmed ICP 1a leads, ~70 ICP 1b in NY list. Running as split test (both hooks live in parallel campaigns).

**Deep-dive:** [`03_Sales/pipeline-analysis/PIPELINE-ICP-ANALYSIS-2026-06-22.md`](../../03_Sales/pipeline-analysis/PIPELINE-ICP-ANALYSIS-2026-06-22.md)

**Version impact:** None (sales framing, not product)

---

### 2026-06-14 — The Two-Layer Market: Disclosure vs. Clearance
**Insight:** The market conflates two separate requirements. Disclosure (Art. 50, NY Law) = label it as AI-generated. Clearance (Chain of Title) = prove it's legally safe to use commercially. Legal teams are asking about both but no one has built a product that addresses both in one workflow.

**Source:** NY Synthetic Performer Law research + ASA/IAB research + ICP 1 call analysis.

**Product implication:** SI8 messaging should distinguish the two explicitly. Clearance is SI8's core product. Disclosure is the adjacent requirement that SI8 can address via C2PA signing (see 2026-06-24 Disclosure Gap entry).

**Status:** Validated in pipeline — legal-side leads (B158 Dan Lantry, B160 William Finkel, B161 James T) consistently raise both topics in their first reply.

**Deep-dive:** [`01_Business/research/NY-SYNTHETIC-PERFORMER-LAW-2026.md`](../research/NY-SYNTHETIC-PERFORMER-LAW-2026.md), [`01_Business/research/ASA-IAB-2026-AI-CONTENT-RESEARCH.md`](../research/ASA-IAB-2026-AI-CONTENT-RESEARCH.md)

**Version impact:** Informed v4 messaging; contributes to v4.1 disclosure deliverable

---

### 2026-03-26 — Two Forms, Not One
**Insight:** RecordForm ($29) and CertForm ($499) are separate products with separate routes, not a shared form with a tier toggle. Conflating them creates the wrong UX for both buyers and reviewers.

**Source:** Internal product design session — PRD work for submit form.

**Product implication:** Split `/submit` into `/record` (RecordForm) and `/certify` (CertForm). Each has its own sections, validation, reviewer checklist, and PDF output. Built and shipped.

**Status:** Built — live at `app.superimmersive8.com/record` and `/certify`.

**Version impact:** v4.0 (part of platform build)

---

### 2026-03-01 — Opt-In Flywheel Solves Chicken-Egg
**Insight:** The v3 marketplace deadlock (need creators for buyers, need buyers for creators) is solved by making the verification customer the marketplace inventory source. After paying for Gear A ($499 review), creator sees: "List in Showcase?" If yes → they're in the catalog. No separate creator recruitment needed.

**Source:** Peer review (ChatGPT/Gemini) on v4 CaaS model. Both AIs independently named this mechanism.

**Product implication:** Catalog opt-in checkbox in submission form. Built into platform. Verified content automatically eligible for Showcase once approved.

**Status:** Built — opt-in live in platform.

**Version impact:** v4.0 (core flywheel mechanism)

---

*Next entry: add when a new insight surfaces that changes or validates product thinking. Not every campaign finding goes here — only insights that shift positioning, deliverables, or architecture.*
