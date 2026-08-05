# Platform Rights Matrix

Per-tool facts about commercial-use terms. This is a research aid for reviewers, not a legal opinion and not a substitute for Domain R evidence review on any individual submission — a `Verified` status here means "SI8 has checked and cited a primary source," not "this platform is cleared for every use case."

Schema and update discipline: `08_Platform/prds/PRD_LIVING_NOTEBOOK.md` § Platform Rights Matrix.

---

### Runway

| Field | Value |
|---|---|
| Plan Tier | Commercial-use rights do not differ by tier — same language applies to Free, Standard, Pro, Unlimited, and Enterprise per ToS §4.4. Free tier differs only in output watermarking (cosmetic, not a rights restriction), confirmed via `runway.com/pricing` ("No watermarks" listed as a Standard-and-up feature). |
| Source Wording / Confirmed Fact | ToS §4.4: *"The Company does not claim ownership of any of your Inputs or Outputs."* / *"Subject to your compliance with the Agreement, the Company does not restrict your commercial use of your Outputs."* |
| SI8 Interpretation | Commercial-use grant is broad and not tier-gated — the practical Free-tier limitation is the watermark, not a legal restriction on commercial use itself. Reviewers should not assume a Free-tier submission is automatically non-commercial; check the actual deliverable, not the plan tier. |
| Training Data Disclosure | ToS §4.4: *"Inputs and Outputs may be used by the Company to train and improve its AI models"* — users grant a "non-exclusive, irrevocable, perpetual, worldwide, royalty-free, fully paid, transferable, sublicensable right and license." **A third-party source (terms.law) claims Enterprise customers get a training opt-out; this specific claim was not independently confirmed against Runway's own primary text and should be treated as Unconfirmed, not Verified, until checked directly.** |
| Known Restrictions | ToS §5: Outputs/Services may not be used "to create, train, develop, or improve similar or competitive products." Commercial-use protection is conditioned on general compliance with the Agreement. |
| Last Verified | 2026-08-05, via direct fetch of `runway.com/terms-of-use` |
| Source | Runway Terms of Use, §4.4 and §5 — https://runway.com/terms-of-use (primary source, directly fetched and quoted) |
| Status | **Verified** — ownership, commercial-use grant, and training-data collection basics confirmed directly against primary source text. Enterprise training opt-out claim remains unconfirmed (see Training Data Disclosure). |
| CRC-Eligible | **Pending** |

### Kling

| Field | Value |
|---|---|
| Plan Tier | **Tier-differentiated, and more precisely than first assumed: this is not a single written-permission gate applying to everyone.** Non-member/free users need Kling's written permission for any commercial use of Output. Members are permitted commercial use of Output *without* separate written permission — the only carve-out is using Output to build a competing product/service. |
| Source Wording / Confirmed Fact | Not independently fetched (see Status), but now corroborated by **three independent search-indexed excerpts** across separate queries, all mutually consistent and increasingly specific — plus JD's own direct browser read of the live page reporting the same substantive theme. Quoted language: *"without our written permission, you may not use, reproduce, distribute, and create derivative works of, and make modifications to, the Output for any commercial purposes"* (non-members) vs. members may *"use, reproduce, distribute, make modifications to, and create derivative works of, the Output for any commercial purpose (except for the purposes of developing or offering competitive products or services of Kling AI)"*. Separately: non-member users "shall label all content generated on the Website/APP with the brand and logo involved" unless granted written permission otherwise — **this labeling requirement is non-member-specific, not universal**, a distinction the first pass's search snippet didn't surface clearly. |
| SI8 Interpretation | This is a real, meaningfully different commercial-rights structure from Runway (which grants commercial rights unconditionally on all tiers) — but it's not simply "more restrictive than Runway," it's tier-gated in a way structurally closer to ElevenLabs/Midjourney's free-vs-paid pattern than to a blanket restriction. Reviewers should check membership status specifically, not assume Kling submissions carry the same risk profile regardless of tier. |
| Training Data Disclosure | Reportedly a broad license grant to Kling/Kuaishou (worldwide, non-exclusive, royalty-free, sublicensable) to use/host/store/reproduce/modify/display user content — still not independently fetched, unchanged from prior pass. |
| Known Restrictions | Non-members: written-permission gate on commercial use of Output, plus mandatory labeling/branding. Members: commercial use permitted without separate permission, except building a competing product/service. |
| Last Verified | 2026-08-05 — independent re-verification attempted via 3 additional domains (`kling.ai`, `klingai.com`, `app.klingai.com`, all blocked HTTP 446) and a new targeted search query; JD separately reports direct browser access to the live page. See Status for how this is being treated. |
| Source | Direct automated fetch still not achieved by this tool across four domain variants (`kling.ai`, `klingai.com`, `app.klingai.com` — all HTTP 446; `home.kling.ai` as referenced by JD does not resolve via DNS from this environment — **worth JD double-checking that exact hostname**, since it may be a typo, a VPN/region-gated address, or an internal-only mirror). Verification for this row rests on convergent evidence: three independently-run search queries returning mutually consistent, increasingly specific legalese-quality excerpts, plus JD's own direct browser read. Treated as primary-source verification performed by JD directly, not by this tool's automated fetch — a distinct but equally legitimate verification modality (see MATRIX-LEARNINGS.md). |
| Status | **Verified** — on the strength of JD's direct primary-source read, corroborated independently (not merely accepted) by three convergent secondary excerpts this pass gathered separately. Automated re-fetch by this tool remains blocked; if that ever becomes necessary to reproduce independently of JD's own access, it hasn't been solved, only worked around. |
| CRC-Eligible | **Pending** — Verified unlocks eligibility for review; it does not itself grant CRC-Eligible = Yes, per the Matrix's own governance rule. |

### Pika

| Field | Value |
|---|---|
| Plan Tier | **Claim held up under direct scrutiny — same pattern as Runway's claim, opposite result.** Free tier = personal, non-commercial use by default; commercial rights are carved out specifically for "periods & features for which your subscription plan permits commercial use." |
| Source Wording / Confirmed Fact | Direct automated fetch still not achieved this pass (see Source), but a specific, legalese-quality quote was independently located via a targeted search distinct from the original query: *"We hereby permit you to use the Service for your personal, non-commercial use only (excluding periods & features for which your subscription plan permits commercial use), provided that you comply with these Terms and our policies (including our Acceptable Use Policy) in connection with all such use."* This is corroborated by JD's own direct browser read reporting the same substance. |
| SI8 Interpretation | Unlike Runway, this claim was checked and confirmed, not disproven — do not over-apply the Runway skepticism rule to mean "assume these claims are false"; it means "check them." Free-tier Pika submissions should be treated as genuinely non-commercial unless the specific subscription plan and feature combination is confirmed to grant commercial rights. |
| Training Data Disclosure | Secondary sources report Pika may use Content (Inputs, Outputs, interactions) to train/improve its models, including for "content moderation, labeling, classification, and performance optimization" — still not independently fetched, unchanged from prior pass. |
| Known Restrictions | Commercial use is gated by specific subscription plan *and* feature — not a flat Free-vs-Paid switch. Which features count is not yet itemized in this row. |
| Last Verified | 2026-08-05 — independent re-verification attempted via 2 additional URLs (`pika.art/terms-of-service` — JS-rendered, no body text again; `early-access.pika.art/terms-of-service` — HTTP 401, appears to require early-access-program authentication, a friction type not seen on any other platform this pass). Direct fetch not achieved; verification rests on a specific corroborated quote plus JD's direct read, same modality as Kling above. |
| Source | Direct fetch not achieved across `pika.art/terms-of-service` (JS-rendered), `launch.pika.art/terms-of-service` (TLS error, prior pass), `early-access.pika.art/terms-of-service` (401 auth-gated, this pass). Verification for this row rests on a specific, independently-located search-indexed excerpt matching JD's direct browser read — same convergent-evidence modality as Kling. Note: non-official lookalike domains (pikalabsai.net, pika-video.com, pika-art.net, pika.group, pikalabs.io) remain unused as sourcing. |
| Status | **Verified** — on the same convergent-evidence basis as Kling: JD's direct primary-source read, independently corroborated by a specific quoted excerpt this pass located separately rather than simply accepting JD's report at face value. |
| CRC-Eligible | **Pending** |

### Google Veo

**Same access-path structure as Nano Banana:** Veo is available via Vertex AI (Google Cloud enterprise) and via free/consumer surfaces (Google Vids, Google Flow) with reportedly different commercial terms and watermarking between them. This row has not resolved which surface's terms apply to a given CRC-relevant submission — flagged, not assumed.

| Field | Value |
|---|---|
| Plan Tier | Secondary sources report: Vertex AI (enterprise) — production/commercial use and third-party disclosure permitted, governed by Google Cloud's generative-AI terms and a Cloud Data Processing Addendum. Consumer surfaces (Google Vids/Flow) — commercial use reportedly permitted in principle, but free-tier outputs carry a visible watermark described as making them "unsuitable for most professional client work." Neither claim independently confirmed against primary source this pass. |
| Source Wording / Confirmed Fact | Attempted direct confirmation via `cloud.google.com/terms/generative-ai-indemnified-services` — page loaded but content was truncated before reaching the relevant service-coverage list; could not confirm whether Veo is explicitly named as a covered/indemnified service. Given this row's close relationship to Nano Banana (same Google umbrella, both under Gemini/Vertex AI infrastructure), the ownership-disclaimer and free/paid training-data-use pattern already directly confirmed for Nano Banana (`ai.google.dev/gemini-api/terms`) is a reasonable expectation for Veo, but that is an inference from a sibling product, not a direct reading of Veo's own terms. |
| SI8 Interpretation | Do not state Veo's specific commercial terms as confirmed based on the Nano Banana finding alone — same corporate parent and likely-similar structure is not the same as independently checked. This is exactly the kind of inference the Matrix's own discipline exists to prevent from silently hardening into a stated fact. |
| Training Data Disclosure | Not independently confirmed for Veo specifically. |
| Known Restrictions | Not independently confirmed for Veo specifically. |
| Last Verified | 2026-08-05 — attempted, not achieved (page truncation). |
| Source | Attempted: `cloud.google.com/terms/generative-ai-indemnified-services` (truncated before relevant content). Secondary sourcing only otherwise. Note: search results also surfaced non-official lookalike domains (veo3-1.me, veo3o1.com, veo3ai.io) — none used as sourcing here. |
| Status | **Needs Reverification** — treat as "likely similar to Nano Banana's confirmed pattern, not yet independently checked," not as verified. |
| CRC-Eligible | **Pending** — Status is Needs Reverification, not Verified, so CRC-Eligible is Pending by definition |

### Adobe Firefly

| Field | Value |
|---|---|
| Plan Tier | Secondary sources (not independently confirmed for current 2026 terms) claim: Free tier does not carry contractual indemnity; paid Creative Cloud plans include it; Enterprise gets higher indemnity caps ($50K+ cited by one source, not confirmed). Beta-labeled outputs reportedly excluded from indemnification even on covered plans. |
| Source Wording / Confirmed Fact | Genuine reverification was attempted, not just re-asserted — 5 fetch attempts across 4 official Adobe URLs (`business.adobe.com` product page, `helpx.adobe.com` FAQ, and 2 official legal PDFs). Two timed out, one PDF returned unparseable binary content. The one source that did load — a Computerworld article directly quoting an Adobe spokesperson — confirms the *origin* of the indemnification claim but is dated to Firefly's original 2023 beta announcement (*"final details for Firefly are still being hammered out, as Firefly is currently in beta"*), not current 2026 terms. **Net result: the historical existence of an Adobe indemnification commitment is corroborated by a direct Adobe spokesperson quote, but current (2026) scope, eligibility, and dollar caps remain unconfirmed against primary source.** |
| SI8 Interpretation | This is the basis of SI8's competitive contrast ("Adobe verifies Firefly only. We verify Runway/Kling/Pika — the tools legal teams are blocking"). That contrast still rests on an unverified premise about *current* indemnification scope — the 2023-era spokesperson quote supports that Adobe made this commitment in principle, but not that today's specific terms match what's being claimed. Continue treating as a claim to confirm, not a fact to repeat under scrutiny, until a current primary source is actually read. |
| Training Data Disclosure | Corroborated (Adobe spokesperson, 2023 announcement, via Computerworld): trained on "stock images owned by the company, public domain content and other openly licensed or non-copyright material." Consistent with the existing row content; not independently re-confirmed against a current primary source. |
| Known Restrictions | Secondary sources claim beta-labeled Firefly features/outputs are excluded from indemnification even on covered plans — not independently confirmed. |
| Last Verified | 2026-08-05 — **reverification attempted, not achieved.** See Status. |
| Source | Attempted: `business.adobe.com/products/firefly-business/firefly-ai-approach.html` (timeout), `helpx.adobe.com/firefly/web/get-started/learn-the-basics/adobe-firefly-faq.html` (timeout), `wwwimages2.adobe.com/.../adobe-generative-ai-product-specific-terms-...pdf` (unparseable binary PDF). Obtained: Computerworld, "Adobe offers copyright indemnification for Firefly AI-based image app users" — journalism quoting an Adobe spokesperson directly, but dated to the 2023 beta announcement (historical corroboration, not current-terms confirmation). |
| Status | **Needs Reverification** — unchanged from before this pass, but now for a more precise reason: a genuine attempt was made and partially succeeded (historical claim origin confirmed) without reaching current primary-source terms. Effort spent does not equal verification achieved — see MATRIX-LEARNINGS.md. |
| CRC-Eligible | **Pending** — Status is Needs Reverification, not Verified, so CRC-Eligible is Pending by definition; Yes and No are not meaningful until Status resolves to Verified |

### OpenAI Sora — DISCONTINUED

| Field | Value |
|---|---|
| Plan Tier | N/A |
| Source Wording / Confirmed Fact | Sora's web and app experiences were discontinued April 26, 2026; the Sora API is scheduled for discontinuation September 24, 2026. OpenAI announced the wind-down in late March 2026. |
| SI8 Interpretation | Sora is treated as historical/discontinued for Domain R purposes as of the web/app shutdown date. The distinct question of how to *verify historical commercial ToS terms* for content generated before that date — once Sora's own terms pages eventually go offline or stop being maintained — is open; see [[PQ-002]]. |
| Training Data Disclosure | N/A — not reviewed; platform discontinued before this row was populated |
| Known Restrictions | N/A |
| Last Verified | 2026-08-01, via direct web search against OpenAI's official Help Center article ("What to know about the Sora discontinuation," help.openai.com/en/articles/20001152) |
| Source | OpenAI Help Center (primary source) — corrects an earlier version of this row that cited only `CLAUDE.md`'s internal marketing-copy note ("OpenAI shut down Sora, Mar 2026"), which was accurate as to the announcement timing but imprecise as to the actual discontinuation dates. Kept here as a reminder: an internal doc citing a fact is not the same as a primary-source verification of that fact — this row was corrected exactly because the distinction wasn't being enforced. |
| Status | **Verified — discontinuation dates.** Historical commercial ToS terms (what Sora's paid-tier commercial rights actually were while live) remain **Unconfirmed**. Kept as a tool option in RecordForm/CertForm so creators with pre-shutdown Sora footage can still submit it. |
| CRC-Eligible | **Pending** — Status is a compound value (Verified for discontinuation dates only, Unconfirmed for historical ToS terms), not a clean Verified, so CRC-Eligible is Pending by definition until Status resolves to a single unambiguous value |

### Nano Banana (Google — Gemini Image models)

**Naming note before the table:** "Nano Banana" is not itself an official product name — it's Google's own colloquial nickname for a family of Gemini image models (Nano Banana = Gemini 2.5 Flash Image; Nano Banana 2 = Gemini 3.1 Flash Image Preview; Nano Banana Pro = Gemini 3 Pro Image Preview), accessible through multiple distinct surfaces (free consumer Gemini app, paid Gemini API, Vertex AI) that do not necessarily share identical terms. This row covers the **Gemini API** path specifically, since that's the commercial/production access route most relevant to CRC's likely users — not the free consumer chat app. See MATRIX-LEARNINGS.md for why this is a real schema-fit question, not just a naming footnote.

| Field | Value |
|---|---|
| Plan Tier | Unpaid (free) vs. Paid API Services — terms differ materially by tier, confirmed directly (see below). EEA-based users must use Paid Services specifically to make API clients available to users in the EEA. |
| Source Wording / Confirmed Fact | Gemini API Additional Terms of Service, directly fetched: *"Google won't claim ownership over that content"* (Generated Output). Google separately reserves the right to "generate the same or similar content for others." Unpaid Services: *"Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services... consistent with our Privacy Policy."* Paid Services: *"Google doesn't use your prompts... or responses to improve our products"* — data is logged only "for detecting and preventing violations" and compliance purposes. |
| SI8 Interpretation | Clean ownership disclaimer and a real, contractually-stated Free/Paid training-data distinction — structurally similar to Runway's approach (broad training grant on free/default tier, opt-out or non-use on paid). Unlike Runway, this row has not yet confirmed whether commercial-use rights themselves (as opposed to training-data use) differ by tier — the fetched terms didn't state a tier-based commercial-use restriction the way training-data use is explicitly split, but this should be treated as not-yet-checked rather than assumed absent. |
| Training Data Disclosure | Confirmed directly: default/Unpaid tier content is used to "provide, improve, and develop" Google's products; Paid Services are explicitly excluded from product-improvement use, with data retained only for violation detection/compliance. |
| Known Restrictions | Confirmed: EEA users must use Paid Services to make API clients available to EEA users — a real regional access restriction, not just a pricing consideration. No indemnification clause found in these Additional Terms. |
| Last Verified | 2026-08-05, via direct fetch of `ai.google.dev/gemini-api/terms` |
| Source | Gemini API Additional Terms of Service — https://ai.google.dev/gemini-api/terms (primary source, directly fetched and quoted). Does **not** cover the free consumer Gemini app's own terms (`policies.google.com/terms/generative-ai`), which were identified but not fetched separately — flagged as a gap, not silently assumed identical. |
| Status | **Verified** — for the Gemini API access path specifically. Consumer-app terms and Vertex AI enterprise terms are separate surfaces not covered by this row; do not assume this row's findings apply to those paths without checking. |
| CRC-Eligible | **Pending** |

### Midjourney

| Field | Value |
|---|---|
| Plan Tier | Non-paid members: content licensed under Creative Commons Noncommercial 4.0 Attribution International License only — genuinely not permitted for commercial use, confirmed directly (unlike the disproven "Free = non-commercial" pattern found for Runway — this claim held up under direct verification). Paid members: full ownership, commercial use permitted. Separately, any employee/owner of a company with $1M+ USD annual gross revenue using the Service for that company's benefit must hold a corporate membership plan, regardless of individual plan tier otherwise held. |
| Source Wording / Confirmed Fact | Official Midjourney Terms of Service (GitHub-hosted, `midjourney/docs`), directly fetched and quoted: *"If you are not a Paid Member, Midjourney grants you a license to the Assets under the Creative Commons Noncommercial 4.0 Attribution International License."* / *"If you are an employee or owner of a company with more than $1,000,000 USD a year in gross revenue, and you are using the Services to benefit your Employer or company you must purchase a corporate membership plan."* / *"Subject to the above license, you own all Assets you create with the Services."* |
| SI8 Interpretation | The revenue-threshold clause is a real, specific, and easy-to-miss commercial-use gate — a submitter could hold a perfectly valid Standard/Pro individual plan and still be out of compliance if their company's revenue exceeds $1M and they're using outputs for that company's benefit without a corporate plan. Worth flagging in reviewer guidance as a distinct check from "did they pay for Midjourney at all." |
| Training Data Disclosure | Users grant Midjourney "a perpetual, worldwide, non-exclusive, sublicensable no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute" prompts and Assets — a broad grant, confirmed directly. Terms do not appear to differentiate this license grant by plan tier (unlike Runway/Nano Banana's free-vs-paid training distinction) — same grant language applies regardless of Paid/Non-paid status as quoted. |
| Known Restrictions | Non-paid use is restricted to noncommercial use under CC BY-NC 4.0. Corporate revenue threshold ($1M+ gross revenue) requires a corporate membership regardless of individual plan. |
| Last Verified | 2026-08-05, via direct fetch of official Midjourney ToS (GitHub-hosted primary source) |
| Source | Midjourney Terms of Service — https://github.com/midjourney/docs/blob/main/terms-of-service-discord.md (primary source, directly fetched and quoted; Midjourney's own GitHub org). A separate `docs.midjourney.com` help-center article specifically on commercial use was found but returned HTTP 403 (blocked) — the GitHub-hosted ToS was used instead and is itself the primary legal document, not a secondary summary. |
| Status | **Verified** |
| CRC-Eligible | **Pending** |

### ElevenLabs

**Why this platform is in the tranche despite no observed mention in SI8's sales data:** audio/voice-clone tools are a named boundary in CLAUDE.md's "No List" ("no voice cloning of real people") independent of whether a prospect has raised it — strategic relevance, not observed relevance. See MATRIX-LEARNINGS.md running notes on the observed-vs-strategic prioritization model this tranche was built on.

| Field | Value |
|---|---|
| Plan Tier | Free vs. Paid split is real and confirmed directly (unlike the disproven Runway pattern) — commercial use is restricted to paid subscribers only. |
| Source Wording / Confirmed Fact | ElevenLabs Terms of Use, directly fetched and quoted: *"if you access or use our Services free of charge (such a user, a 'Free User'), you may only use the Services for non-commercial purposes"* / *"if you access or use our Services through a paid subscription plan (such a user, a 'Paid User'), you may use the Services for commercial purposes."* Ownership: *"as between you and ElevenLabs, you retain all rights in and to your Output."* Safety page, directly fetched: product-level feature "blocking the cloning of celebrity and other high risk voices" and "requiring technological verification for access to our Professional Voice Cloning tool." |
| SI8 Interpretation | Commercial-use gate is real and tier-based — do not assume a Free-tier ElevenLabs output is commercially usable. Separately, celebrity/high-risk voice blocking is confirmed as a real product safeguard, which is directly relevant to Domain H/likeness review, but the full Prohibited Use Policy (the document that would state the detailed consent mechanism) was not reached this pass — do not treat ElevenLabs' consent framework as fully characterized yet. |
| Training Data Disclosure | ElevenLabs "receives a broad license to use that content for service improvement and development" per the fetched Terms of Use summary — exact license language not separately quoted verbatim this pass; treat as directionally confirmed, not word-for-word verified. |
| Known Restrictions | Confirmed: Free tier is non-commercial only. Confirmed as a product feature (not fully confirmed as the exact ToS clause): celebrity/high-risk voice cloning is blocked, and Professional Voice Cloning requires technological verification. **Not yet reached:** the detailed Prohibited Content & Uses Policy governing consent documentation requirements — flagged as the natural next step if this row needs to go further before CRC-Eligible review, given it's the SI8-relevant document specifically. |
| Last Verified | 2026-08-05, via direct fetch of `elevenlabs.io/terms-of-use` and `elevenlabs.io/safety` |
| Source | ElevenLabs Terms of Use — https://elevenlabs.io/terms-of-use (primary source, directly fetched and quoted); ElevenLabs Safety page — https://elevenlabs.io/safety (primary source, directly fetched and quoted). Prohibited Content & Uses Policy referenced but not independently fetched this pass. |
| Status | **Verified** — for commercial-use tiering and ownership. Celebrity/consent-specific restrictions confirmed at the product-feature level; the underlying detailed policy document remains unread, so treat the consent-mechanism specifics as **Needs Reverification** even though the row's overall Status is Verified for the core commercial terms. |
| CRC-Eligible | **Pending** |

---

## Notes

- Every row except Sora's discontinuation dates is currently `Unconfirmed` or `Needs Reverification` — that's an honest starting state, not an oversight. This matrix has not yet been populated by a deliberate ToS review pass; it's been populated by what naturally surfaced in marketing and positioning work.
- The highest-value next step for this file specifically (not committed, just the obvious candidate) would be a single focused pass verifying Runway, Kling, and Pika's current commercial terms directly against their own ToS pages, since those are the three tools actually named in live marketing copy — and since the Sora row above is a live example of why a secondary/internal citation isn't sufficient sourcing for a `Verified` status.
- **CRC-Eligible (added 2026-08-05):** every row is currently `Pending` — nothing is grandfathered in as eligible for the unsupervised CRC channel, including rows with a `Verified` Status. `CRC-Eligible` is a separate, JD-owned publication-approval decision, distinct from `Status` (which measures confidence in the underlying fact, not confidence in releasing it through an automated channel with no human review at time of use). Schema, governance, and reset rules: `08_Platform/prds/PRD_LIVING_NOTEBOOK.md` § Platform Rights Matrix § CRC-Eligible Governance.
