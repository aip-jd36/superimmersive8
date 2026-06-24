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

### 2026-06-24 — C2PA Ecosystem Competitive Landscape
**Insight:** No company addresses the agency delivery step — the gap where a final composited campaign video needs C2PA re-signing and IP clearance after post-production strips the original metadata. The ecosystem splits cleanly into four non-overlapping positions: (1) model providers sign at generation; (2) Capture signs AI company outputs at inference; (3) ProofSnap/TrueScreen read and certify existing signals; (4) RightsDocket does per-registration human review + C2PA embed for audio. SI8 v4.1's position — re-sign final agency output with combined IP clearance — is unoccupied by any player.

**Source:** Competitive research session — ProofSnap (getproofsnap.com), TrueScreen (truescreen.io), RightsDocket (rightsdocket.com), c2pa.ai, Pebblous (blog.pebblous.ai), InCyan (inaccessible).

**Product implication:** RightsDocket is the closest analog in an adjacent market — same model (human review → C2PA embed → per-registration pricing, $20/registration for audio). Validates that the "pay-per-clearance with embedded disclosure" model is proven. Nobody has replicated it for commercial video. C2PA 2.4 spec now mandates "hard bindings + soft bindings" combination — companies selling C2PA-only signing are building to a superseded spec version.

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
