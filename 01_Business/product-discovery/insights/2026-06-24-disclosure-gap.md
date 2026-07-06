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

Final campaign video: C2PA from source clips gone.
New C2PA credential: Premiere can re-sign at export, but only attaches
account holder identity — no tool licensing, no clearance data, no IP assessment.
```

**Correction from peer review (June 25, 2026):** Adobe Premiere Pro has native "Export with Content Credentials." The gap is not that *nobody re-signs at the delivery step* — it's that nobody attaches *clearance assertions* at the delivery step. Premiere signs the file. It does not clear what's in it. The credential it produces says "exported by [Adobe account]." It says nothing about what AI tools were used, whether they were licensed, or whether the output is safe for commercial use.

**SI8's defensible gap:** Human-reviewed clearance assertions (tool licensing, IP risk, likeness assessment, training data exposure) embedded in the C2PA credential at the agency delivery step. This is what Premiere cannot do. This is what no tool in the ecosystem does.

**Compliance readiness estimate (2026):**
- Model provider layer: ~85%
- Creator/agency layer (signing): ~25% — but thin credentials only
- Creator/agency layer (clearance assertions): ~0%
- Advertiser/brand layer: ~15%

**The current agency workflow without SI8:**
1. Export from Premiere (may attach thin C2PA identity credential)
2. Check a toggle in Meta/YouTube/TikTok Ads Manager ("Yes, this has AI content")
3. Maybe add on-screen text disclaimer manually

That satisfies the platform upload and the agency's statutory disclosure obligation. It does not satisfy a legal team asking for documentation of *what* AI was used, *how* it was licensed, and *whether* the output is safe to use commercially.

---

## Regulatory Hook — Correct Framing (Updated June 25, 2026)

**Peer review correction:** The Art. 50 obligations are split between two parties and do not both land on the agency.

- **Art. 50(2) — machine-readable marking:** Provider obligation. Falls on whoever develops/places the generative AI system on the market — Runway, Kling, Veo. They sign at generation. This is not the agency's statutory responsibility.
- **Art. 50(4) — visible disclosure:** Deployer obligation. Falls on agencies using AI in professional activities. Requires human-recognisable labelling of deepfakes and public-interest content. Platform toggles (Meta/YouTube/TikTok Ads Manager) substantially address this.

**What this means for SI8's pitch:** The statute does not mandate that agencies buy machine-readable re-marking. Pitching Art. 50 as the direct compliance driver for the agency is technically incorrect and will fail in front of anyone who has read the Act.

**The correct hook is commercial risk:** Brand legal teams are demanding documentation regardless of what the statute technically requires of the agency. The market is asking for C2PA — not because Art. 50 forces the agency to provide it, but because the brand's legal team wants a verifiable record before approving spend. That is a legitimate and durable market pull. Frame SI8's value as the commercial risk shield, not the statutory mandate.

---

## The Tool Landscape

### Year 1 Stack: Capture as Primary (Trust List Required)

> **⚠️ CORRECTION — July 6, 2026 (Sofia Yan email reply)**
> The Trust List assumption below is incorrect for the SI8 use case. Sofia Yan (Co-founder, Numbers Protocol) confirmed: "please think of the output primarily as embedded C2PA metadata plus an ERC-7053 / Numbers provenance record, **not yet as an Adobe Trust List-recognized signer claim**." The original reasoning is preserved below as context. The Trust List claim is **unconfirmed for the edited MP4 upload workflow** — must be verified with a real signed sample before use in product copy or sales materials.

**Why Capture, not self-deploy:** The market is already asking for C2PA by name. When a brand legal team drops a C2PA-signed video into Adobe's Content Authenticity viewer, a signature from an unrecognized signer shows as a yellow warning. For a product whose entire value is credibility to skeptical legal teams, that warning is a direct product failure at the moment of truth. Numbers Protocol (Capture's parent) is on the C2PA Trust List — their signatures show as a named, trusted signer. That credibility is the reason to use Capture in Year 1.

| Component | Tool | Cost |
|-----------|------|------|
| **C2PA signing + clearance assertions** | Capture API (Numbers Protocol, Trust List member) | $0.001/sign |
| **Signing engine** | c2pa-rs (underlies Capture; also available standalone) | Included |
| **Audit timestamp** | ERC-7053 via Capture (included) or RFC 3161 (alternative) | Included in Capture |
| **Chain of Title PDF** | Existing SI8 system | Already built |

---

### Capture / Numbers Protocol — Primary Path (Year 1)

- C2PA signing + ERC-7053 on-chain registration via REST API
- **C2PA Trust List status for SI8 workflow: UNCONFIRMED** — Sofia Yan (July 6, 2026) confirmed output is C2PA metadata + ERC-7053 provenance record, "not yet as an Adobe Trust List-recognized signer claim." Must verify display behavior with a real signed sample. ProofSnap (camera capture) is on the Trust List; edited MP4 upload path status is unverified.
- $0.001/sign (pay-as-you-go) — CONFIRMED by Sofia July 6, 2026; enterprise pricing by volume/SLA
- MP4/video support: CONFIRMED by Sofia July 6, 2026 — "MP4 / MOV, that is the right starting point"
- SI8 embeds clearance JSON as C2PA custom assertions via Capture's API

**Why this is the right Year 1 path:** The workflow architecture is confirmed. The Trust List recognition for the edited MP4 case must be tested before making any Trust List claims to buyers.

---

### C2PA Signing — c2pa-rs (Infrastructure Layer)

- Open-source reference implementation (Adobe/CAI)
- **Confirmed MP4 and MOV support** for standard file-based operations
- Limitation: fragmented MP4 (DASH/HLS) has a known bug — not relevant for standard MP4 exports
- c2pa-js (JavaScript/Node) wraps c2pa-rs via WASM for server-side use
- Capture uses c2pa-rs under the hood — same underlying engine

---

### On-Chain Registration — Correct Framing (Updated June 25, 2026)

**Peer review correction:** The earlier claim that ERC-7053 on-chain registration "survives C2PA stripping on re-upload" is wrong. ERC-7053 registers a hash of specific bytes. When YouTube or Meta re-encode the file on upload, the bytes change, the hash no longer matches the file viewers see. The on-chain record does not track the re-encoded version.

**What on-chain registration actually is:** A timestamped audit artifact — immutable proof that a specific file version existed and was cleared at a specific moment. Useful for corporate governance and legal indemnification ("we can prove we cleared the file before deployment"), not for tracking the file through platform re-processing.

**ERC-7053 is an open standard (~30 lines of Solidity).** Anyone can deploy their own CommitRegister contract on any EVM chain. SI8 can self-deploy this once we have Trust List membership. Not needed in Year 1 — Capture includes on-chain registration in their signing workflow.

**RFC 3161 timestamping — simpler alternative:** A trusted timestamp from a recognized timestamp authority (TSA) provides "proof this file existed at this time" in a format any lawyer can verify with a public key. RightsDocket uses C2PA + RFC 3161 rather than blockchain. May be easier to explain to a conservative GC than a Polygon transaction. Evaluate both options.

---

### The Actual C2PA "Soft Binding" — Invisible Watermarking (Future Layer)

**Peer review correction:** The EU Code of Practice's mandated "durable secondary signal" is defined as invisible watermarking/fingerprinting — not on-chain hashing. In C2PA terminology, "soft binding" means a watermark embedded in the pixels that survives transcoding and cropping, enabling the credential to be rediscovered even if the file's container metadata is stripped.

On-chain hashing is not soft binding in the C2PA spec. An invisible watermark (e.g., Resemble AI Videoseal, Digimarc) embedded in the pixels IS soft binding. This is the layer the Code of Practice technically requires as the second durable signal.

**Year 1 position:** The market is asking for C2PA. It is not yet asking for invisible watermarks. Build this layer when a buyer specifically requires full EU Code of Practice two-layer compliance and can verify what "soft binding" means. Do not build it yet.

---

### C2PA Conformance Program — Apply Now (Parallel Action)

The C2PA Conformance Program (launched mid-2025) is how organizations get on the Trust List as recognized Claim Generators. It requires product evaluation, a legal agreement, and formal acceptance — not just buying a cert.

**SI8 should apply now**, even while using Capture as the Year 1 signing infrastructure. Reasons:
- Timeline is months — start the clock immediately
- Being a recognized signer in SI8's own name is the long-term independence goal
- Once approved, SI8 can self-deploy c2pa-rs + ERC-7053 without routing through Capture

Apply at: contentauthenticity.org/join

---

### Capture's Article 50 Compliance Checklist (SI8 sales asset)

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

**Truepic — COMPETITOR, NOT RULED OUT**
- Enterprise C2PA signing-as-a-service; on the C2PA Trust List alongside Google, Meta, OpenAI
- Does NOT do clearance (IP risk, licensing, likeness assessment)
- Sits at the signing layer, not the clearance layer — same delivery-step position as Capture
- Does not threaten SI8's core value (human judgment), but does occupy the re-signing mechanic
- Monitor for any clearance product additions

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
| **C2PA-signed video file** | Final campaign video re-signed via Capture (Trust List member) with SI8 clearance assertions embedded — shows as verified signer in Adobe Content Authenticity viewer | Uploaded directly to YouTube/Meta/TikTok → platform reads C2PA → auto-labels; legal team can verify signer identity |
| **Timestamped audit record** | On-chain registration (ERC-7053 via Capture) or RFC 3161 timestamp — immutable proof of which file version was cleared and when | Corporate governance, legal indemnification, audit trail; proves clearance happened before deployment |

**Note on the audit record:** This proves the cleared file existed at a specific time. It does not track the file through platform re-encoding — platforms change the bytes on upload, which breaks the hash. Its value is as an audit artifact, not as a durable disclosure signal.

**The combined pitch to a creative director:**

> "You send us your final cut. We run the clearance review (90 min), attach a legally recognized C2PA disclosure credential to the file with our clearance data embedded, and deliver three things: a Chain of Title PDF for your legal team, a disclosure-ready video your platform will recognize as C2PA-signed, and a timestamped audit record proving you cleared it before deployment. One submission. Your legal team, your platform upload, and your compliance audit — all covered."

**Trust mark framing (pending verification):** "Cleared by SI8 · Documented via Capture" — SI8 provides the human judgment (clearance data); Capture provides C2PA + ERC-7053 on-chain registration. Whether this appears as a named trusted signer in Adobe's Content Authenticity viewer is unconfirmed for the uploaded MP4 workflow — verify with a real signed sample before using Trust List language in product copy. *(Updated July 6, 2026 per Sofia Yan email.)*

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

**Step 0 — Qualify what buyers mean by "C2PA" (immediate)**

Before building, ask the next lead who mentions C2PA:
> "When you say you need C2PA — is that for the machine-readable metadata in the file itself, or does it need to show as a verified, named signer when someone checks it in Adobe's Content Authenticity viewer?"

Most buyers don't know the difference yet. But some will — and those are the ones who'll reject an unrecognized signer. The answer determines whether Trust List recognition is a Year 1 requirement or a later upgrade.

**Step 1 — Validate three-deliverable concept with one warm lead**
- **B130 Ivan Petruzzelli** (State Street) — asked for "machine-readable payload (spreadsheet or JSON)" in campaign briefs. Highest conceptual alignment.
- **B149 Spencer Stander** (STANDER PRODUCTIONS) — BA/clearance language, "less about creative process, more about clearance." Closest to the buyer who'd pay for this.
- **B148 Myron Stapleton** (R&M Geoscience) — "worth its weight in gold," delivers to governments and health boards, highest urgency.

**Gate question:**
> "If we delivered your final video with a verified C2PA disclosure credential embedded — showing your clearance data, the AI tools used, and the licensing status, signed by a recognized authority — alongside the Chain of Title PDF, would that complete your compliance requirement?"

If yes: build. If no: understand what's missing.

**Step 2 — Get a Capture POC account and test the integration**
- Contact Capture (captureapp.xyz) for trial access
- Test MP4 signing with custom SI8 clearance assertions
- Verify output shows as trusted signer in Adobe Content Authenticity viewer (contentcredentials.org/verify)
- Confirm ERC-7053 on-chain registration is included per sign
- Estimate 1–2 week integration time

**Step 3 — Apply to C2PA Conformance Program (parallel, start now)**
- Apply at contentauthenticity.org/join
- Goal: SI8 recognized as its own Claim Generator on the Trust List
- Timeline: months — start the clock immediately regardless of Capture decision
- Once approved: SI8 can self-deploy c2pa-rs + ERC-7053 with its own trusted certificate

**Step 4 — Invisible watermark layer (future, not Year 1)**
Once a buyer specifically requires full EU Code of Practice two-layer compliance (C2PA hard binding + invisible watermark soft binding), evaluate Resemble AI Videoseal or Digimarc. Do not build this until a buyer asks for it by name.

---

## Competitive Landscape — Who Else Is In This Space

Competitive research (June 24, 2026) confirms no direct competitor at the agency delivery step.

### The Five Positions — How the Market Has Sorted (Updated June 25, 2026)

```
[Position 1] Model providers (Runway, Kling, Veo)
  → C2PA signed at generation time, inside the inference pipeline
  → Metadata breaks when clips are composited and re-exported in post-production

[Position 2] Adobe Premiere Pro
  → "Export with Content Credentials" — native C2PA re-signing at the delivery step
  → FREE — included in Creative Cloud
  → THIN credential: attaches account holder identity only
  → No tool licensing, no IP clearance, no likeness assessment, no clearance assertions
  → Occupies the re-signing mechanic. Does not occupy the clearance position.

[Position 3] Capture / Numbers Protocol + Truepic
  → C2PA signing APIs; both on the C2PA Trust List
  → Capture: $0.001/sign + ERC-7053 on-chain; targets model providers + media companies
  → Truepic: enterprise signing-as-a-service; alongside Google/Meta/OpenAI on Trust List
  → Neither does clearance — no human IP review, no licensing assessment

[Position 4] ProofSnap / TrueScreen (audit tools)
  → Read and certify EXISTING C2PA signals for audit evidence
  → Do not sign content; do not add new assertions
  → Useful after SI8 delivers the signed file — not competitive

[Position 5] RightsDocket
  → Human review + C2PA embed + USCO registration for audio only
  → $20/registration; closest model analog to SI8
  → Audio only — no video product exists; C2PA conformance still pending

[SI8's position] Agency delivery step — clearance assertions
  → Same delivery step as Adobe Premiere, but with human-reviewed clearance data
  → "Premiere signs the file. We clear it."
  → C2PA signed via Capture (Trust List) with SI8 clearance assertions embedded
  → Chain of Title PDF + C2PA-signed video + audit timestamp
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
