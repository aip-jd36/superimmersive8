# Pending Questions

Open questions material enough that letting them go unresolved silently would hurt consistency. Kept visible until resolved with actual evidence — same discipline as Open Questions in the Decision Quality Standards, scoped here to reviewer/product/methodology questions.

**Scope note (added 2026-08-01, after external review):** this file is for questions that affect assessment methodology or repeatable commercial-assurance interpretation. Sales-campaign design, ICP targeting, pricing experiments, and general company execution questions have their own designated homes (`03_Sales/`, `01_Business/pricing/`, etc.) and do not belong here even when they're genuinely important — otherwise this file drifts from "commercial-assurance institutional judgment" into "anything JD doesn't want to forget," which defeats the point of keeping it narrow. A question about a Standing Encore test design, for example, was removed from this file on review for exactly this reason; it already had a home in `03_Sales/standing-encore/SIGNAL-TEST-LOG.md`.

Schema and promotion rules: `08_Platform/prds/PRD_LIVING_NOTEBOOK.md` § Pending Questions / § Promotion Rules.

---

### PQ-001 — Does specific, checkable circumstantial detail count as a weaker corroboration tier in Domain H?

**Status:** Open
**Raised:** 2026-07-30, during Anchor Film deck verification (see `03_Sales/call-notes/CALL-2026-07-30-B164-Alice-Feng-Anchor-Film.md`, "Important Evidentiary Distinction" section)
**Why it matters:** Alice Feng's claim that Anchor's creation-dossier platform is "a grant proposal, not yet built" isn't deck-verified, but it's backed by a specific, checkable origin story (a named trade show — NAB — and a named adjacent product — "Liquid Engine" — that prompted the idea), which is more than bare self-attestation but less than a contemporaneous artifact. Domain H's current binary (corroborating artifact = Verified, narrative alone = caps at Partially Verified per [[POS-001]]) doesn't have a place for this middle case. If it comes up again in an actual submission, reviewers need to know whether "specific, checkable detail short of an artifact" should ever move a case above Partially Verified, or whether the line stays hard.
**Promotion path:** Resolves when this pattern shows up in a real submission and gets a deliberate ruling — not from reasoning about it in the abstract. Until then, default to the existing hard line in Reviewer Manual v0.2.

---

### PQ-002 — How should Domain R handle historical content from a platform that no longer exists?

**Status:** Open
**Raised:** 2026-08-01, while seeding `PLATFORM-RIGHTS-MATRIX.md`
**Why it matters:** Sora's web/app was discontinued April 26, 2026, with the API following September 24, 2026 (OpenAI Help Center — see the Matrix entry for full sourcing). RecordForm/CertForm still accept Sora as a tool option for creators with pre-shutdown footage. Domain R evidence review normally rests on being able to check a platform's terms as of the generation date. Once a platform's own ToS pages stop being maintained or go offline, it's not yet decided how a reviewer should verify historical terms (Wayback Machine snapshot, archived documentation, something else), or what confidence ceiling applies when that verification can't be done cleanly.
**Promotion path:** Resolves the first time a real submission includes Sora-generated (or otherwise now-defunct-platform) content and a reviewer has to actually make this call.

---

### PQ-003 — Does the absence of E&O insurance create sales friction with large-brand buyers?

**Status:** Open
**Raised:** carried forward from `CLAUDE.md` §15, "E&O Insurance (Future Investigation)" — not yet started
**Why it matters:** Traditional clearance workflows typically culminate in E&O insurance, which SI8 does not currently offer or partner for. Unknown whether large-brand buyers specifically expect this as part of a "cleared for commercial use" package, or whether SI8's independent-assessment framing is sufficient without it. Matters for both Gear/tier pricing and for how aggressively SI8 should pursue Enterprise-tier buyers under Pricing Strategy v3.0.
**Promotion path:** `CLAUDE.md` §15 already specifies the research steps (check standard media liability insurer availability for AI-generated content, get quotes at small-agency scale) — this resolves once that research is actually done, explicitly flagged as "not a Year 1 blocker."

---

### PQ-004 — How should SI8 assess an AI-written script embedded in an otherwise-licensed commercial production?

**Status:** Open
**Raised:** 2026-07-30, AI Wave panel Q&A (`03_Sales/transcripts/numbers-gumgum-panel-073026-transcript.txt`, ~[52:38]–[54:20])
**Why it matters:** An audience member described a real-shaped scenario: a commercial uses a properly licensed real person's likeness and voice, but the script itself was AI-generated. The panel's answer (paraphrased, **not an SI8 ruling and not yet checked against Reviewer Manual v0.2 Domain I/L guidance**): the AI-generated video output carries no copyright by default; the commercial idea and its specific advertising execution can be protected separately via trademark; a purely AI-written script likewise carries no copyright unless a human makes a substantive edit. This is a plausible-sounding framework from an external panel, not verified legal research, and not yet reconciled with how SI8 actually scores Domain I (IP/Infringement) or Domain H in this kind of mixed case. Treat the panel answer as source context for research, not as an answer to apply directly.
**Promotion path:** Resolves after a deliberate research/reconciliation pass against Domain I/L guidance — ideally before the first real submission with this fact pattern arrives, not reactively during one.

---

### PQ-005 — What human-edit threshold causes copyright to attach to an otherwise AI-written script?

**Status:** Open
**Raised:** 2026-07-30, same source as [[PQ-004]]
**Why it matters:** The panel's answer asserted that a human "adjusting" an AI-generated script can cause copyright to attach, without specifying how much adjustment is enough. This is exactly the kind of vague threshold Domain H already has a rule for on the video-authorship side ([[POS-001]] — narrative detail isn't evidence, an artifact is). It's not yet decided whether an analogous evidentiary rule should apply here (e.g., a tracked-changes document or draft history as the "artifact" for a script-editing claim), or whether this is legally distinct enough from Domain H's video-authorship logic to need its own guidance.
**Promotion path:** Resolves together with [[PQ-004]], via the same research/reconciliation pass — logged separately because the eventual answer might genuinely differ from Domain H's existing rule.

---

### PQ-006 — Should SI8's existing conflict-of-interest disclosure practice extend explicitly to grant-funded or referral-partner engagements?

**Status:** Open
**Raised:** 2026-08-01, on review of the Anchor Film relationship
**Why it matters:** SI8 already has a stated conflict-of-interest disclosure practice (per `CLAUDE.md`: PMF Strategy Inc./SI8, JD acting as Producer for Gear C deals vs. SI8 acting as independent verifier for Gear A clients, role disclosed per transaction). Alice Feng indicated that Anchor Film's approved grant budgets could potentially pay SI8 directly as an external consultant or assessment provider (`03_Sales/call-notes/CALL-2026-07-30-B164-Alice-Feng-Anchor-Film.md`) — meaning SI8's revenue could originate from the same party whose production evidence SI8 would be independently judging, while Anchor is simultaneously a referral/partnership channel. It's not yet decided whether the existing disclosure practice covers this shape of engagement as-is, or whether it needs an explicit extension before the first grant-funded assessment is accepted.
**Promotion path:** Resolves when SI8 has a live engagement structured this way and has to decide concretely, or when JD makes a deliberate governance call ahead of that — whichever comes first.
