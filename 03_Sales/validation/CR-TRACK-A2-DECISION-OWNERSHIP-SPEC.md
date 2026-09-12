# CR-Track A2 — Decision Ownership STEC Experiment Spec

**Status:** Candidate cohort built and QA'd (`SI8_CR-TrackA2-B2_Wave1_FINAL-QA.md`, 2026-09-05), **NOT launched** as of this sync (2026-09-11) — no independent repository evidence of a send has been found (see the Open Question in `COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md` §6).
**Parent:** `01_Business/product-discovery/COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md` §2 — this is a **sub-experiment of CR-Track A (B2B Readiness)**, not an independent top-level track.
**Sender (alias):** Angel
**Relationship to existing ICP system:** Independent of `03_Sales/ICP-DEFINITIONS.md`'s live ICP numbering, exactly as CR-Track A itself. `ICP-DEFINITIONS.md` is not modified by this spec.
**Source of this spec's content:** Strategic OS synchronization memo, "SI8 Commercial Readiness Validation — Strategic Thesis & Product-Surface Mapping" (2026-09-11), §4/§6, item D. This file did not previously exist — see the audit finding it responds to in `COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md`'s prior version (contradiction #2, "A2/B2 have no standalone hypothesis/spec document").

---

## Hypothesis

If a distinct readiness determination exists after production information/evidence exists (A1's question), **who actually owns it** — producer, production organization, client, agency, legal, or another internal or external function? A2 also probes what happens when the available information does not yield a clear answer. Its purpose is to locate the hypothesized DECIDE job organizationally rather than assume SI8 already knows who the buyer/user is.

## Core research question

> "If a separate readiness determination exists, who actually owns it?"

## Targeting

Same population construction as CR-Track A (B2B org context) — see `CR-TRACK-A-B2B-READINESS-SPEC.md` §"Targeting" and §"List construction." A2's own qualification bar (mature commercial AI-production organizational context, Tier B/Tier A) and its 65-candidate universe → 60-person Wave 1 cohort are documented in `CR-A2-B2_POPULATION-QA.md` §4 and `SI8_CR-TrackA2-B2_Wave1_FINAL-QA.md` §5.

## Message principle

Probe ownership, not sell architecture. Do **not** sell provenance, prompt logging, C2PA, blockchain, a Decision Engine, or Commercial Assurance product architecture — same discipline as A1.

**Message copy status — RESOLVED 2026-09-12:** `SI8_CR-TrackA2-B2_Wave1_FINAL-QA.md` §4 states "Experiment concepts: APPROVED by Strategic OS, unchanged. Messaging not touched (Part 8)." As of 2026-09-11 no A2 message text was committed anywhere in this repository (`CR-STEC-MESSAGE-SEQUENCES-2026-08-30.md`, the file holding all other approved Track A/B copy, had zero A2/B2 references). Strategic OS has since supplied the approved 4-message A2 sequence verbatim; it is now committed at `CR-STEC-MESSAGE-SEQUENCES-2026-08-30.md` §A2, unedited.

## Response classification

Reuses CR-Track A's A–H response codes (`CR-TRACK-A-B2B-READINESS-SPEC.md` §"Response classification") as the base classification, with the decision-owner code (class B/C/D/E/F) as A2's primary signal rather than a secondary one.

## Falsification logic

**Positive:** a clear, consistently-named decision owner emerges (even if it varies by org type); the owner is reachable/identifiable; the owner describes real inputs to their decision; ambiguous-evidence cases surface a defined escalation path.

**Negative:** no one can name who decides; "it depends" with no resolvable pattern; the documentation itself is treated as the decision (collapsing DECIDE into RECORD); respondents describe the question as not applicable to their workflow.

## Interpretation boundaries

Per the Validation Plan §4: a tally of "N respondents named legal" is a FACT; "legal is the buyer" is not an automatic DECISION — that promotion is Strategic OS's, not Execution's, per the Review Template.

## Status as of 2026-09-11 (this sync)

- **Candidate universe:** 65 qualified (`CR-TrackA2_Angel_Candidate-Universe.csv`), Wave 1 cohort: 60 (`SI8_CR-TrackA2_Angel_Wave1_FINAL.csv`), reserve: 12 (`CR-TrackA2_Angel_RESERVE.csv`). Full construction/QA trail: `CR-A2-B2_POPULATION-QA.md`, `SI8_CR-TrackA2-B2_Wave1_FINAL-QA.md`.
- **Message copy:** approved 4-message A2 sequence now committed verbatim at `CR-STEC-MESSAGE-SEQUENCES-2026-08-30.md` §A2 (2026-09-12) — see resolved flag above.
- **Launch status:** **not independently confirmed launched** as of this sync — see the Open Question in the parent Validation Plan §6. Do not treat as sent without a source (Dripify campaign record, Supabase export, or explicit Strategic OS confirmation with the underlying artifact).
