# Product Insight: The Disclosure Gap
**Date:** 2026-06-24
**Version impact:** v4.1 (hypothesis)
**Status:** Hypothesis — not yet validated with a paying client

---

## The Discovery

Creative directors at agencies delivering AI-generated commercial campaigns face two adjacent compliance requirements in 2026:

1. **Clearance** — prove the content is legally safe (IP, licensing, likeness). SI8's core product.
2. **Disclosure** — attach a legally valid AI-generated label to the final video file (EU AI Act Art. 50, NY Synthetic Performer Law). **No tool exists for this at the agency delivery step.**

---

## The Legally Required Marking Stack (EU Code of Practice, 2026)

The EU Code of Practice states: **"no single active marking technique suffices."** The mandated architecture is two durable layers:

| Layer | What | Who does it today | Survives stripping? |
|-------|------|------------------|-------------------|
| **C2PA manifest** | Cryptographically signed metadata embedded in file container | Model providers at generation; Capture API post-hoc | No — stripped by export/re-upload |
| **ERC-7053 on-chain** | Content hash registered on blockchain — links file to provenance record | Capture (included with every sign) | **Yes** — hash lives on-chain regardless of what happens to the file |

A third layer (human-visible) is also required but handled at the platform level:

| Layer | What | Who does it |
|-------|------|-------------|
| **Human-visible label** | On-screen text or platform disclosure label | Platform reads C2PA → auto-labels (YouTube, Meta, TikTok) |

**SynthID is separate and cannot be added post-hoc.** SynthID is an imperceptible perceptual watermark embedded by Google's models at generation (Veo 3, Imagen). It is not a C2PA mechanism, cannot be added to content you didn't generate with a Google model, and is not part of the compliance path for agency-assembled content. It's complementary when present; irrelevant to SI8's workflow.

---

## Platform-Specific Requirements (as of June 2026)

| Platform | Commercial AI video | Tool | Who acts |
|----------|--------------------|----|---------|
| **YouTube** | No blanket mandate; misrepresentation policy applies | Optional checkbox | Advertiser |
| **Meta** | Auto-label when using Meta AI tools; toggle required for political/social | Ad setup toggle | Advertiser |
| **TikTok** | AIGC toggle mandatory for significant AI modification | Ads Manager AIGC toggle | Advertiser |

**EU AI Act Art. 50:** Machine-readable marking (C2PA or equivalent) + human-visible disclosure required. Enforcement: **August 2, 2026.** Penalties: up to €15M or 3% of global annual turnover.

**NY Synthetic Performer Law (S.8420-A):** Conspicuous disclosure required for AI-generated human likenesses in ads. Effective: **June 9, 2026.** Penalties: $1,000 first violation, $5,000 subsequent.

---

## The Critical Gap: The Middle Layer Is Missing

Model providers (Runway, Kling, Veo) embed C2PA at generation. Platforms (YouTube, Meta, TikTok) read C2PA and surface labels to viewers.

**What happens in between:**

```
Runway clip (C2PA: Runway Gen-3, timestamped) →
+ Kling clip (C2PA: Kling 1.6, timestamped) →
Assemble in Premiere Pro →
Color grade →
Export to MP4 →
Re-compress for delivery →

Final campaign video: ZERO C2PA assertions remaining.
```

> "C2PA metadata is stripped when a video file is processed, compressed, or re-uploaded through tools that do not preserve Content Credentials."
> "Production teams cannot reliably track whether a final render still carries its original Content Credentials."

**Compliance readiness estimate (2026):**
- Model provider layer: ~85%
- Creator/agency layer: ~25%
- Advertiser/brand layer: ~15%

**No tool exists to re-attach AI disclosure to a final composited campaign video.** The current agency workflow:
1. Check a toggle in Meta/YouTube/TikTok Ads Manager ("Yes, this has AI content")
2. Maybe add on-screen text disclaimer manually
3. Hope SynthID survived the export

That's a self-declaration checkbox — satisfies the platform upload, but does not satisfy a legal team asking for documentation of *what* AI was used, *how* it was licensed, and *when* the disclosure was made.

---

## The Tool Landscape

### SI8's Independent Stack (Primary Path — June 2026)

SI8 does not need Capture or any third-party signing service. The full two-layer disclosure stack can be built and owned independently using open-source tools and a self-deployed smart contract.

| Component | Tool | Cost |
|-----------|------|------|
| **C2PA signing + custom assertions** | c2pa-rs (open source, Adobe/CAI) | ~$289/year signing cert |
| **On-chain registration (ERC-7053)** | SI8-deployed CommitRegister contract on Polygon or Base | ~$0.001/video in gas |
| **Chain of Title PDF** | Existing SI8 system | Already built |

**Total infrastructure cost per SI8 Certified submission: under $0.01. No per-call API dependency on any third party.**

---

### C2PA Signing — c2pa-rs (Primary)

- Open-source reference implementation, maintained by Adobe and the Content Authenticity Initiative
- **Confirmed MP4 and MOV support** for file-based operations (`video/mp4`, `application/mp4`, `video/quicktime`)
- Limitation: fragmented MP4 (DASH/HLS) has a known bug — does not affect standard MP4 export files
- SI8 embeds its clearance JSON as C2PA custom assertions — the spec supports arbitrary structured data
- One signing certificate from DigiCert or SSL.com (~$289/year) is all that's required
- c2pa-js (JavaScript/Node) wraps c2pa-rs via WASM for server-side use

---

### On-Chain Registration — SI8-Deployed ERC-7053 (Primary)

ERC-7053 is an open Ethereum standard (~30 lines of Solidity). It is not proprietary to Numbers Protocol. Anyone can deploy their own instance on any EVM-compatible chain.

**How it works:**
1. Hash the signed MP4 file to generate a content identifier (CID)
2. Call `commit(CID, SI8_clearance_data)` on-chain — emits a permanent event with block timestamp
3. Store the transaction hash in the Chain of Title PDF as independently verifiable proof

**Chain choice:** Polygon or Base (Coinbase L2). Both are EVM-compatible, widely supported, and have transaction costs of fractions of a cent. No Ethereum mainnet gas volatility.

**Setup:** One-time contract deployment (~$5–20 in gas). Then one transaction per video. A developer can build and deploy this in roughly a day.

**Ownership advantage:** SI8 owning its own contract is more credible than routing through a third party. The value is the public blockchain record — not which company deployed the contract. Any deployment on a public chain is equally valid and independently verifiable.

---

### Capture / Numbers Protocol — Optional Future Upgrade

**Not required. Consider only if:**
- A buyer specifically asks for Trust List recognition (signatures verified in Adobe Content Authenticity viewer with a named trusted signer badge)
- SI8 reaches volume (1,000+ videos/month) where a managed signing service reduces operational overhead

**What Capture adds over SI8's independent stack:**
- Numbers Protocol is on the C2PA Trust List — signatures show as a named trusted signer in Adobe/Microsoft viewers rather than "unrecognized signer"
- Managed infrastructure (no cert renewal, no chain wallet maintenance)
- $0.001/sign (comparable to SI8's gas costs but with no setup)

**What Capture does NOT add:** Any legal validity that SI8's independent stack doesn't already provide. Trust List recognition is a UX improvement, not a compliance requirement.

---

### Capture's Article 50 Compliance Checklist (SI8 sales asset — keep regardless of integration decision)

Most agencies will answer "no" to 5+ of these:
1. Do all AI outputs carry a machine-readable marker?
2. Does that marker survive a screenshot or social-media re-upload?
3. Is marking implemented as multi-layer (in-file + durable secondary signal)?
4. Can a third-party auditor verify your marking without contacting your team?
5. Do you log every generation event with timestamp and consent receipt?
6. Do you publish a TDM policy at `/.well-known/tdm-policy.json`?
7. Do your ToS explicitly cover AI-generated content disclosure?
8. Have you tested compliance with the official C2PA validator?
9. Do you have a documented response plan for Art. 50 incident reports?
10. Have you scheduled a third-party audit before 2 Aug 2026?

*Adapt as SI8 lead gen: "Five questions to know if your AI campaign is Article 50 compliant before August 2."*

---

**Truepic Vision — RULED OUT**
- Enterprise inspection platform — NOT a file signing API
- C2PA signing only at point of capture on certified mobile app; JPEG only, no video
- Not relevant for SI8's use case

### C2PA Custom Assertions

The spec allows custom data beyond standard fields. SI8's clearance output maps cleanly:

```json
{
  "SI8:clearance_status": "CLEARED",
  "SI8:chain_of_title_id": "SI8-2026-004921",
  "SI8:tools_verified": ["Runway Gen-3", "Kling 1.6"],
  "SI8:licensing_confirmed": true,
  "SI8:likeness_assessment": "no synthetic performers identified",
  "SI8:commercial_use_authorized": true,
  "SI8:disclosure_required": ["EU AI Act Art. 50"],
  "SI8:review_date": "2026-06-24",
  "SI8:reviewer": "SI8 certified human reviewer"
}
```

The video file carries SI8's clearance data cryptographically — tamper-evident, platform-verifiable.

---

## What SI8 Can Deliver (v4.1 Hypothesis)

**SI8 Certified ($499) — Three deliverables:**

| Deliverable | What it is | Who uses it |
|-------------|-----------|-------------|
| **Chain of Title PDF** | Human-readable clearance document — tools, licensing, likeness, IP risk | Agency legal team, brand legal, E&O insurer |
| **C2PA-signed video file** | Final campaign video re-signed with SI8 clearance + disclosure assertions embedded | Uploaded directly to YouTube/Meta/TikTok → platform reads C2PA → auto-labels |
| **ERC-7053 on-chain registration** | Content hash registered on blockchain — survives C2PA stripping on re-upload | Third-party auditor verification; durable proof even if file metadata is lost |

**The combined pitch to a creative director:**

> "You send us your final cut. We run the clearance review (90 min), re-attach a legally valid multi-layer disclosure to the file, and deliver three things: a Chain of Title PDF for your legal team, a disclosure-ready video for direct upload to Meta, YouTube, or TikTok, and an on-chain registration that proves provenance even after platform re-processing. One submission. Fully compliant on every layer."

**Trust mark framing:** "SI8 Certified — Cleared + Disclosed" — SI8 owns the full stack. C2PA signing via c2pa-rs with SI8's own certificate. On-chain registration via SI8-deployed ERC-7053 contract on Polygon/Base. No third-party signing service required.

---

## What This Changes vs. v4.0

| | v4.0 | v4.1 (hypothesis) |
|--|------|------------------|
| **SI8 Certified delivers** | Chain of Title PDF | Chain of Title PDF + C2PA-signed video file |
| **Positioning** | "Clearance documentation for AI video" | "Clearance + disclosure compliance for AI video" |
| **Pitch** | "Satisfy your legal team" | "Satisfy your legal team AND upload-ready for Meta/YouTube/TikTok" |
| **Competitive gap** | "No B2B clearance service" | "No B2B clearance service AND no disclosure tool at the delivery step" |

---

## Validation Plan

**Step 1 — Validate concept with one warm lead (before building)**
Introduce the three-deliverable concept to:
- **B130 Ivan Petruzzelli** (State Street) — already asked for "machine-readable payload (spreadsheet or JSON)" in campaign briefs. Highest conceptual alignment.
- **B149 Spencer Stander** (STANDER PRODUCTIONS) — BA/clearance language, "less about creative process, more about clearance." Closest to the buyer who'd pay for this.
- **B148 Myron Stapleton** (R&M Geoscience) — "worth its weight in gold," delivers to governments and health boards, highest urgency.

**Gate question:**
> "If we delivered your final video file with a legally valid multi-layer AI disclosure embedded — C2PA in the file plus on-chain registration — alongside the Chain of Title PDF, would that complete your compliance requirement end-to-end?"

If yes: build. If no: understand what's missing before building.

**Step 2 — Technical build (one developer, ~1–2 days)**
- Deploy ERC-7053 CommitRegister contract on Polygon or Base
- Set up c2pa-rs signing instance with SI8 signing certificate
- Write the workflow: receive MP4 → sign with c2pa-rs → hash → commit on-chain → deliver signed MP4 + transaction hash
- Add transaction hash field to Chain of Title PDF template

**Step 3 — Capture (optional, later)**
If a buyer asks specifically for C2PA Trust List recognition (named trusted signer badge in Adobe viewer), evaluate Capture at that point. Not a Year 1 requirement.

---

## Competitive Landscape — Who Else Is In This Space

Competitive research (June 24, 2026) confirms no direct competitor at the agency delivery step.

### The Four Positions — How the Market Has Sorted

```
[Position 1] Model providers (Runway, Kling, Veo)
  → C2PA signed at generation time, inside the inference pipeline
  → Cannot cover composited outputs; metadata stripped in post-production

[Position 2] Capture / Numbers Protocol
  → C2PA signing + ERC-7053 on-chain via API
  → Targets AI model providers and media companies (Reuters, AP)
  → The agency delivery step is explicitly NOT their market

[Position 3] ProofSnap / TrueScreen
  → Read and certify EXISTING C2PA signals for audit evidence
  → Do not sign content; do not add new C2PA assertions
  → Useful after SI8 delivers the signed file — not competitive

[Position 4] RightsDocket
  → Human review + C2PA embed + USCO registration for audio only
  → $20/registration; closest model analog to SI8 v4.1
  → Audio only — no video product exists

[EMPTY] Agency delivery step
  → Final composited campaign video with zero C2PA remaining
  → Re-signing with human-reviewed clearance data embedded
  → SI8 v4.1
```

### Company-by-Company Breakdown

| Company | What they actually do | C2PA signing? | Video? | EU AI Act angle | SI8 relationship |
|---------|----------------------|---------------|--------|-----------------|------------------|
| **Capture (Numbers Protocol)** | C2PA signing + ERC-7053 on-chain via API | ✅ | Unknown — confirm on call | Explicit — compliance page maps all Art. 50 sub-articles | Integration candidate, not competitor |
| **ProofSnap** | Browser extension that packages existing C2PA signals into court-ready forensic ZIPs | ❌ reader only | ❌ | Explicit EU AI Act compliance page, $4.99–$49.99 | Audit-evidence tool for SI8 clients AFTER delivery |
| **TrueScreen** | Digital evidence certification at moment of capture (ISO forensic methodology) | ❌ | ✅ (video meetings, screen recordings only) | Limited mention | Insurance/legal/financial — different use case |
| **RightsDocket** | Provenance + copyright docs for AI-assisted audio; C2PA embedding; USCO registration | ✅ (audio only) | ❌ audio only | EU AI Act Article 50 compliance guide published | Closest analog — same model, different medium |
| **c2pa.ai** | Educational/consulting site | ❌ | ❌ | Content present | Irrelevant |
| **Pebblous** | Research/educational blog | ❌ | ❌ | Content present | Irrelevant |

### Key Insight: RightsDocket as Architectural Analog — Not Market Validation

RightsDocket is the closest structural analog to SI8 v4.1:
- Human-reviewed authorship documentation → C2PA embedded in final audio file → $20 per registration
- Builds authorship evidence record + C2PA-signed file in one service
- Offers USCO copyright registration as an add-on

**However:** RightsDocket launched ~May 2026 (approximately 1 month old as of this writing). Signal Fidelity Group has 16 LinkedIn followers. No Reddit presence. No Product Hunt listing. No third-party reviews. Their C2PA integration is still pending — they are "currently entering the C2PA Conformance Program," not yet recognized as a conforming Claim Generator/Validator.

Their SEO content blitz (many insight articles on DistroKid, Spotify AI Credits, EU AI Act, USCO registration) is pre-launch marketing, not post-traction amplification.

**Correct framing:** RightsDocket shows smart people independently converging on the same model — that validates the architecture reasoning. It does not prove PMF. The market for "human-reviewed provenance + C2PA embed + per-registration fee" is unproven in audio and completely unbuilt in commercial video.

### C2PA 2.4 Spec Note

C2PA 2.4 (released 2026) introduced "Durable Content Credentials" — now mandates **hard bindings** (cryptographic hashing) + **soft bindings** (invisible watermarking + passive content fingerprinting). Companies building "C2PA signing only" are building to the superseded spec. Capture's two-layer approach (C2PA + ERC-7053 on-chain) aligns with the current mandate.

---

## Developer & Ecosystem Friction Findings (June 25, 2026)

*GitHub issues, Product Hunt, Capterra, G2, and industry press research. Assessing real-world developer experience to stress-test the SI8 v4.1 integration path.*

### CORRECTION: c2pa-rs MP4/Video Gap Was a Research Error

**Original finding (June 25) was incorrect.** The "MP4 video gap" was based on Issue #33 from `arkavo-org/arkavo-rs` — a third-party Rust library, not the official reference implementation. The two repos were conflated.

**Correct status of `contentauth/c2pa-rs`:** MP4 and MOV are confirmed supported file formats. The official c2patool documentation explicitly lists `video/mp4`, `application/mp4`, and `video/quicktime`. The only real video limitation is fragmented MP4 (DASH/HLS streaming), which has a known "moov atom not found" bug in fmp4 workflows. Standard MP4 export files — which is what SI8 would receive from an agency — work fine.

**SI8 implication:** The c2pa-rs fallback path is not blocked. Capture almost certainly supports standard MP4 signing. The Capture technical call remains useful for integration confirmation (API behavior, POC account, Art. 50(2) post-production re-signing question) but is no longer a hard blocker for scoping v4.1.

### Capture SDK Developer Signal

Capture SDK (numbersprotocol/capture-sdk): 0 stars, 0 forks, v0.2.1 (January 30, 2026), 15 open issues. Minimal community. Named Capture clients (Reuters, Rolling Stone Ukraine) are likely using the REST API directly, not the SDK. The REST API integration path ($0.001/sign) is the right route for SI8 — the SDK community signal is irrelevant to API reliability.

### Resemble AI PerTH/Videoseal

Perth (audio watermarking, MIT) has 8 open issues and 0 closed — not production-ready for all environments. Key friction: GPU required (no CPU/ONNX path), ~16.8kHz frequency cap, documentation gaps. Videoseal (video invisible watermarking, MIT) exists but no production reviews found. Not an SI8 integration target currently.

### Ecosystem-Level Signal

- C2PA adoption: <1% of news images/videos published globally include C2PA metadata (early 2026)
- Signing certificate cost: ~$289/year (no free Let's Encrypt equivalent) — adoption barrier for small agencies
- Entire C2PA disclosure infrastructure space has zero consumer-accessible reviews — confirms this is a developer/enterprise-only market with no self-serve accessibility yet
- AI Omnibus (May 2026) extended machine-readable marking grace period for pre-existing AI systems to December 2, 2026 — but new campaigns starting August 2 onward still face the August 2 obligation as new deployments (deployer vs. provider distinction)

### Action Required

**Capture technical call — critical questions elevated:**
1. Does Capture support MP4/video file signing via REST API? (c2pa-rs video gap makes this uncertain)
2. If yes, does it use c2pa-rs under the hood, or a separate implementation?
3. Does post-production re-signing satisfy their Art. 50(2) "at generation time" interpretation?

If Capture confirms no video support → c2pa-rs fallback may also be blocked → requires separate implementation path assessment before v4.1 can be scoped.

---

## Sources

- EU Code of Practice on marking and labelling of AI-generated content: https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content
- AI Video Disclosure Laws 2026 (ngram.com): https://www.ngram.com/blog/ai-video-disclosure-law-2026
- Platform disclosure requirements (virvid.ai): https://virvid.ai/blog/ai-video-ad-disclosure-requirements-2026-meta-youtube-tiktok
- Google SynthID expansion (May 2026): https://blog.google/innovation-and-ai/products/google-synthid-ai-content-detector/
- C2PA and watermarking mandates 2026: https://magiclight.ai/news/c2pa-and-global-watermarking-mandates-for-ai-video-in-2026/
- **Capture EU AI Act compliance page: https://captureapp.xyz/compliance/** ← primary source for multi-layer requirement + Art. 50 sub-article mapping
- Capture C2PA signing API: https://captureapp.xyz/products/c2pa-signing/
- Capture pricing: https://captureapp.xyz/pricing/
- Tim Deussen call (XRBB Berlin): `03_Sales/call-notes/CALL-2026-06-24-B125-TIM-DEUSSEN-XRBB.md`
