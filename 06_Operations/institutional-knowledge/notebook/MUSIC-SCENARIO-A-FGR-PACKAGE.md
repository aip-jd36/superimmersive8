# Music / Audio Licensing & Rights — Scenario A — Formal Governance Review Preparation Package

**Status:** ACTIVE — candidate-preparation record. **None of the propositions below are governed knowledge.** All remain `Lifecycle: Candidate`, `CRC eligible: Pending`. This document exists so the candidate set survives session handoffs (a real gap this milestone found: the Envato and Epidemic Sound candidates below previously existed only in conversational reports, never in a repo file — see `EVIDENCE-CAPTURE-SOP.md` §12).
**Domain:** Music / Audio Licensing & Rights, Scenario A only (pre-existing licensed music-library tracks). Client-supplied music, commissioned/original music, AI-generated audio, voice/likeness are explicitly out of scope (unchanged from the original portability diagnostic).
**Target topic/category:** `third_party_source_rights` (Claims A1-A6, E1-E2, EP1) / `null`-generic under the same category (G1).
**Provenance note on Envato/Epidemic Sound sections:** reconstructed from this session's own prior conversational Final Reports (no earlier repo file existed to recover them from — flagged per Task 6's own instruction not to silently recreate from memory; this is a faithful transcription of already-reasoned conclusions, not new research). Evidence tier/URLs unchanged from when originally established.
**Pre-Adoption wording correction (2026-08-27, following the FGR_006 integration review):** two propositions below (A2, A-1) were corrected for wording precision before human Adoption — A2's "remains valid permanently" narrowed to track its cited Envato evidence exactly (the source states indefinite continuation but never uses "permanently"); A-1's stale, never-valid "(subject to §D2 below...)" internal cross-reference (no "D2" heading exists anywhere in this document — Enterprise-threshold content lives under section C as A-7a, not under section D, which is the Generic-candidates section) replaced with a stable claim-ID cross-reference. Neither correction changes evidence, provider_scope, applicability, dependencies, Lifecycle, or FGR disposition — see `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`'s post-verbatim addendum for the full correction record.

---

## A. Envato provider-specific candidates

### A1 — `CLAIM-MUSIC-ENVATO-SYNC-001-v1`
- **Proposition:** Under Envato Elements' standard subscription, music items are licensed for use synchronized with other media (e.g. as part of a video), and may not be resold or redistributed as standalone audio files; the standard license excludes "Broadcast" use specifically.
- **provider_scope:** `['envato-elements']` (provider id not yet registered in `ASSET_PROVIDER_IDS`)
- **Evidence:** Direct fetch, `elements.envato.com/learn/how-envato-licensing-works` (Envato's own primary domain). Verbatim: *"you can't...use music items in broadcast presentations"*; *"you can't...resell them as standalone audio files."*
- **Evidence tier:** Class A (independently retrieved primary evidence), Official platform authority.
- **Effective/verified date:** Retrieved 2026-08-27; no on-page effective date captured.
- **Evidence limitations:** None material — direct primary fetch succeeded.
- **unresolved_project_dependencies:** `['which_music_provider']`
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** MEDIUM (structural license term, less volatile than pricing/tier specifics).
- **CRC could safely say:** Envato's standard license ties music use to synchronization with other media and excludes standalone resale and broadcast use, as a general framing.
- **CRC must not conclude:** Whether the user's specific project/use qualifies as "Broadcast," or whether their specific use is otherwise compliant.

### A2 — `CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1`
- **Proposition:** Per Envato Elements' own stated policy, a music license for a project completed and published while the subscription was active remains licensed even if the subscription later ends; new projects/uses after cancellation are not covered. *(Corrected 2026-08-27 — was: "remains valid permanently, even if the subscription is later cancelled." The cited evidence states indefinite continuation ("remain licensed even if your subscription ends") but never uses "permanently"; narrowed to track the source exactly. No change to evidence, provider_scope, dependencies, Lifecycle, or FGR disposition.)*
- **provider_scope:** `['envato-elements']`
- **Evidence:** Same source as A1. Verbatim: *"Assets you've used in completed projects during your active subscription remain licensed even if your subscription ends"*; *"You won't be able to download new items or use assets in new or incomplete projects after unsubscribing, but existing work stays covered."*
- **Evidence tier:** Class A, Official platform authority.
- **unresolved_project_dependencies:** `['music_subscription_active_at_publication_confirmed']`
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** HIGH (commercial/subscription policy — the kind of term providers revise).
- **CRC could safely say:** Envato's stated policy is that already-completed, already-published work stays licensed after cancellation, while new use does not.
- **CRC must not conclude:** Whether the user's specific project was actually completed/published while their subscription was active — that is a documentary, project-specific fact.

## B. Epidemic Sound provider-specific candidates

### EP1 — `CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1`
- **Proposition:** Epidemic Sound's Single-Track Private Tier license excludes use in advertisements and other paid-media productions (including online pre/mid/post-roll placements); the separate Commercial Tier license does not carry this same exclusion (it excludes only "TV ads"/broadcast-type content specifically), and separately grants a right to monetize via third-party ads displayed on the subscriber's own published Productions.
- **provider_scope:** `['epidemic-sound']` (not yet registered)
- **Evidence:** Direct fetch + local text extraction, `epidemicsound.com/staticfiles/legacy/20/documents/SingleTrackLicensesV8.pdf` (Epidemic Sound's own domain; the PDF's summarization initially failed and required direct `pypdf` text extraction from the saved binary — noted as a distinct capture-method nuance, not a lower evidence tier). Verbatim, Private Tier: *"No boosted or branded content, ads or third party exploitation. You may not use the Licensed Work(s) in advertisements or other commercial productions (including productions that are boosted or that are published within paid media space, such as, but not limited to, online pre/mid/post-rolls)..."* Commercial Tier section of the same document contains no equivalent clause; instead: *"No broadcast type content... feature films and TV shows or TV ads..."* and, under Monetization: *"you may allow, and receive remuneration from, the display of third-party ads in connection with making available your Productions on social media or other platforms."*
- **Evidence tier:** Class A (independently retrieved and directly extracted primary evidence), Official platform authority.
- **unresolved_project_dependencies:** `['which_music_provider', 'epidemic_license_tier_confirmed']`
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** HIGH (tier/plan terms).
- **CRC could safely say:** Epidemic Sound's own license documents distinguish tiers by advertising/paid-media permission, with materially different rules between Private and Commercial tiers.
- **CRC must not conclude:** Which tier the user actually holds, or whether their specific placement is a covered use under that tier.

## C. Artlist provider-specific candidates

*Evidence upgraded this milestone from human-captured structured-summary (Class B, summary-fidelity) to human-captured full-document visual inspection (Class B, direct-text-equivalent fidelity) — see `evidence-captures/artlist/MANIFEST.md` for full provenance, checksums, and exactly which pages were inspected.*

### A-1 — `CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1`
- **Proposition:** Artlist's Social license is exclusively for personal content creators (hobbyists, vloggers, independent creators) and does not cover projects made for clients or brands, paid/promoted videos, or broadcast use; the Pro/Business license is for professional creators, covers client and brand work, paid/promoted videos, and commercials/advertisements, and permits broadcasting, subject to Artlist's separate Enterprise/Max Business plan requirement for agencies, broadcasters, and larger companies (see `CLAIM-MUSIC-ARTLIST-ENTERPRISE-THRESHOLD-001-v1`). *(Corrected 2026-08-27 — was: "(subject to §D2 below for agency/broadcaster/large-company cases)." No "§D2" heading exists anywhere in this document — the Enterprise-threshold content is section C's own A-7a, not section D (the Generic-candidates section); replaced the broken positional pointer with a stable claim-ID cross-reference expressing the same qualification. Does not merge this claim with A-7a — both remain separately governed. No change to evidence, provider_scope, dependencies, Lifecycle, or FGR disposition.)*
- **provider_scope:** `['artlist']` (not yet registered)
- **Evidence sources:** Both Source 1 (formal License, comparison table + narrative) and Source 2 (Help Center, "What does the Social license cover?"/"What does the Pro license cover?") — **corroborated**.
- **Evidence tier:** Official platform authority, Class B (human-captured, full-document visual read).
- **Effective date:** 2026-02-15 (stated on Source 1).
- **unresolved_project_dependencies:** `['which_music_provider', 'artlist_license_type_confirmed']`
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** MEDIUM-HIGH.
- **CRC could safely say:** Artlist distinguishes a personal-only Social license from a Pro/Business license covering client, brand, and advertising use.
- **CRC must not conclude:** Which license the user actually holds.

### A-2 — `CLAIM-MUSIC-ARTLIST-CLIENT-LICENSE-RETENTION-001-v1`
- **Proposition:** Under Artlist's Pro/Business license, a Project incorporating a licensed Asset may be transferred to a client (or any other party) for their use, but the underlying Asset license is held by the subscriber only, not transferred to the client — the subscriber must ensure any client/collaborator complies with the license.
- **provider_scope:** `['artlist']`
- **Evidence:** Source 1 only. Verbatim: *"If you create a Project incorporating an Asset, you can transfer this Project to your clients and to anyone else, so they can use the Project (but the License is only yours)... if you collaborate with any third party in a Project or if you create a Project for your clients, you must make sure your collaborator and/or client complies with this License."*
- **Evidence tier:** Class B, Official platform authority, formal-License-only (no Source 2 coverage of this specific point).
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** MEDIUM.

### A-3 — `CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1`
- **Proposition:** A Project created and published while an Artlist subscription is active remains licensed (including for continued monetization) indefinitely, even after the subscription is cancelled; downloaded Assets may not be used in new projects once the subscription has expired.
- **provider_scope:** `['artlist']`
- **Evidence:** **Corroborated by both sources.** Source 1: *"You're covered to create and publish your Projects while your account is active. When your subscription expires, those Projects can remain published in any media, but any new projects will not be covered"*; also §2's own heading, "Your Projects are yours to use Forever... For now and for all future time. Eternally." Source 2: *"If a project is completed and published while your subscription is active, you maintain the right to use the assets in that published project even if you later cancel your subscription. Once your subscription expires, these assets cannot be used in new projects."*
- **Evidence tier:** Class B, Official platform authority, two-source corroborated — the strongest-evidenced Artlist claim in this set.
- **unresolved_project_dependencies:** `['artlist_subscription_active_at_publication_confirmed']`
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** HIGH.

### A-4 — `CLAIM-MUSIC-ARTLIST-STANDALONE-EXPLOITATION-001-v1`
- **Proposition:** Artlist Assets may only be used as integrated elements within a broader Project, and may not be copied, distributed, sold, shared, or otherwise exploited as standalone content (e.g. the music track on its own).
- **provider_scope:** `['artlist']`
- **Evidence:** Source 1 only. Verbatim: *"Artlist Assets may only be used as integrated elements within broader Projects and may not be used, copied, distributed, performed, presented, sold, licensed, shared, or otherwise exploited as standalone content (such as music, footage, or images on their own)..."*
- **Evidence tier:** Class B, Official platform authority.
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** MEDIUM.

### A-5 — `CLAIM-MUSIC-ARTLIST-AI-TRAINING-EXCLUSION-001-v1` (new this pass — split out from A-4, not merged, per distinct dependency/evidence shape)
- **Proposition:** Artlist Assets may not be used to create derivative works such as remixes or covers, or be included in datasets for machine learning, AI training, or the development/improvement of AI technologies.
- **provider_scope:** `['artlist']`
- **Evidence:** Source 1 only, same paragraph as A-4 but a distinct restriction category (derivative-work/AI-training vs. standalone-exploitation) — kept separate per the task's own "do not collapse if evidence boundaries differ" instruction, since this restriction is about a categorically different use (AI/ML input) than A-4's (standalone distribution).
- **Evidence tier:** Class B, Official platform authority.
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** MEDIUM (AI-related terms are an active area providers are actively revising).
- **Note:** Adjacent to, but distinct from, Scenario D (AI-generated audio) — this claim is about using a *licensed pre-existing* Artlist track as AI training/input material, not about Artlist's own AI generation tools.

### A-6 — `CLAIM-MUSIC-ARTLIST-PRO-ROYALTIES-001-v1`
- **Proposition:** Artlist's public-performance/broadcast permission does not itself cover payment of royalties to Performance Rights Organizations (PROs) or other collecting societies; if a Project is reproduced or used for broadcast/public performance, the subscriber (or their client) may receive requests for mechanical-reproduction and/or public-performance royalty payments, and is responsible for paying them (or ensuring the relevant broadcaster/platform does).
- **provider_scope:** `['artlist']`
- **Evidence:** Source 1 only. Verbatim: *"However, it does not cover payment of royalties to performance rights organizations (PROs) and other collecting societies. Accordingly, if you or your client reproduces a Project, or uses a Project for broadcast or other public performance, you may receive requests for payment of mechanical reproduction and/or public performance royalties... In such cases, you are responsible for paying those amounts (or ensuring the relevant broadcaster or platform pays them) to the applicable organization."*
- **Evidence tier:** Class B, Official platform authority.
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** LOW-MEDIUM.

### A-7 — `CLAIM-MUSIC-ARTLIST-ENTERPRISE-THRESHOLD-001-v1` (previously deferred as "H"; now evidence-ready)
- **Proposition:** Artlist requires a Max Business plan or a customized Enterprise Agreement if the licensee works for an agency, a broadcaster, or a company/legal entity (including an aggregated group of companies) with more than 50 employees; this requirement does not apply to subscription plans consisting solely of AI Services. Individual plans license one person; Team/Max Business plans extend coverage to up to 7 members total, for the benefit of the named license owner only (not members' own independent commercial use).
- **provider_scope:** `['artlist']`
- **Evidence:** Source 1 §11 and §10. Verbatim §11: *"if you work for an agency, broadcaster, or for a company (or any other legal entity) that has more than 50 employees, you must have a Max Business plan to be covered by this License (or a customized Enterprise license). This also applies if your company is part of a group of companies that has more than 50 employees in total. This requirement does not apply to subscription plans consisting solely of AI Services."* Verbatim §10: *"The individual plans give you a license for one person, but with Team plan, or the Max Business plan you can extend your license up to 6 more members (7 members in total)... all the members covered by the license can only use the Assets for the benefit of the license owner (not for their own personal or commercial purposes)."*
- **Evidence tier:** Class B, Official platform authority — specific, quantified thresholds, a materially stronger basis than the previously deferred vague characterization.
- **unresolved_project_dependencies:** `['artlist_licensee_employer_type_confirmed', 'artlist_licensee_employer_size_confirmed']` — note: employer size/type is realistically **self-attestable** (the user knows their own employer), unlike documentary license-tier facts elsewhere in this set — flagged for explicit review at FGR, not pre-decided here.
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** MEDIUM (a specific numeric threshold — moderately likely to be revised, more stable than general pricing).
- **CRC could safely say:** Artlist's standard Pro/Business plans may not be sufficient for agencies, broadcasters, or larger companies, who may need a Max Business or Enterprise agreement instead.
- **CRC must not conclude:** Whether the user's specific employer meets this threshold, or what Enterprise terms would actually apply to them.

## D. Generic cross-provider candidates

### G-1 — `CLAIM-MUSIC-ACCESS-NOT-LICENSE-001-v1`
- **Proposition:** Being able to download or access a music-library track does not, by itself, establish that a specific intended use (e.g. client work, paid advertising) is licensed under the account's actual plan/subscription — the applicable license type/tier is a separate, project-specific fact.
- **provider_scope:** `null` (generic)
- **Evidence:** Cross-provider synthesis — survives all three sampled providers' now-confirmed evidence (Envato: broad grant by default, but specific uses like Broadcast/standalone-resale still excluded regardless of tier; Epidemic Sound: any tier can download, permitted *use* differs by tier; Artlist: Social and Pro/Business can both download, permitted *use* differs by license type). **Explicitly rejected as generic**: "commercial use is generally tier-gated" — false for Envato specifically (broad grant by default, restricted by use-type rather than tier).
- **Evidence tier:** Class A+B synthesis across 3 independently-confirmed provider-specific findings.
- **unresolved_project_dependencies:** `['which_music_provider', 'music_license_tier_confirmed']`
- **Lifecycle:** Candidate. **CRC eligible:** Pending.
- **Refresh class:** LOW (structural/conceptual, provider-independent).

## E. Deferred / rejected candidates

- **"Commercial use is generally tier-gated" (generic framing)** — REJECTED as a generic claim; survives only as provider-specific context within A-1/EP1's own wording, not as a `provider_scope: null` proposition.
- **Artlist "seats" mechanics as a standalone claim** — folded into A-7 as supporting context rather than drafted separately; revisit at FGR if reviewers want it split out.
- **Artlist Trial/watermarked-account terms** — observed in Source 1 (p.5) but not drafted into any claim; out of Scenario A's core "already licensed a commercial track" framing.
- **Artlist AI-Generated Content / AI Explore terms** (Source 1 p.2, Source 2 p.1) — explicitly out of Scenario A scope (Scenario D territory); noted, not drafted.

---

## Provenance index

- Envato evidence: direct fetch, `elements.envato.com/learn/how-envato-licensing-works`, 2026-08-27.
- Epidemic Sound evidence: direct fetch + local extraction, `epidemicsound.com/staticfiles/legacy/20/documents/SingleTrackLicensesV8.pdf`, 2026-08-27.
- Artlist evidence: `06_Operations/institutional-knowledge/notebook/evidence-captures/artlist/MANIFEST.md` (this folder) — full provenance, checksums, page-by-page inspection record.
