# CR-Track B — Creator Readiness STEC / CRC Experiment Spec

**Status:** Spec drafted, NOT launched. Requires Strategic OS sign-off before any list build or send.
**Parent:** `01_Business/product-discovery/COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md`
**Relationship to existing ICP system:** Independent of `03_Sales/ICP-DEFINITIONS.md`. "CR-Track B" is a validation-track label only.

---

## Hypothesis

Creative Producers / individual AI creators want direct commercial-readiness guidance for an AI media project before, during, or after production, without adopting an enterprise production/compliance platform.

## Targeting

- Creative Producers
- AI filmmakers
- AI commercial creators
- Hands-on AI creative leadership

**Do not require provenance maturity.** Unlike Track A, prior documentation discipline is not a prerequisite or a filter here.

## Message principle

Probe the commercial decision, not the documentation habit — and **discovery outreach is not the CRC invitation.**

**PMM correction (2026-08-30) — discovery outreach ≠ CRC invitation, two separate messages:**

1. **Discovery message** (initial Dripify send) — asks how the creator currently determines commercial readiness. Contains **no CRC link**. Goal: learn current behavior/problem, exactly like Track A's discovery message.
2. **CRC invitation** (separate follow-up, sent only after a substantive response) — offered as a free tool, with a tagged attribution link. See `CR-STEC-MESSAGE-SEQUENCES-2026-08-30.md` for both, drafted in full.

Example discovery concept (copy finalized in the message-sequences doc):

> "When you're using AI on a commercial project, how do you check whether the tools, reference assets, likenesses, music, etc. are actually okay for the intended commercial use?"

CRC is offered, once invited, as the current product interface for this track — not as evidence that a Decision Engine exists or is planned. Never claim certification or a legal opinion in the invitation copy.

## Behavioral funnel — with denominators tracked separately

```
contacted
  → connected
    → substantive response
      → CRC offered            <- gate: only respondents who reach here can be scored on what follows
        → CRC started
          → CRC completed
            → useful result reported
              → decision impact / repeat-use intent
                → willingness to pay / Commercial Assurance escalation
```

Each stage is a distinct ledger field (see `VALIDATION-LEDGER-SCHEMA.md`) — do not collapse funnel stages into a single "engaged" flag. **`crc_offered` is the critical denominator gate** — every downstream stage's percentage is calculated against "of those actually offered CRC," not against total contacted or total responded.

## What counts as evidence (and what doesn't)

**Do not interpret** "interesting" or "copyright is important" as product validation — these are topic-level engagement, not usage.

**Actual CRC usage is materially stronger evidence** than conversational interest. Prioritize instrumented funnel data (CRC started/completed/useful) over reply sentiment.

## Interpretation boundaries — corrected 2026-08-30 (PMM)

**Failure to start CRC is negative behavioral evidence ONLY when a qualified respondent was actually offered a usable CRC invitation.** Track the denominators separately. Do **not** classify someone as product-demand-negative merely because:
- they discussed copyright/rights but were never offered CRC;
- they never received a working, attributable CRC link;
- the conversation ended before the offer stage;
- attribution is unavailable for their session (so their usage, if any, can't be confirmed).

Corrected reading:
- "N creators completed CRC" is a FACT. "Track B validated" is not an automatic conclusion from that fact — repeat-use, whether outputs affected a real decision, and willingness-to-pay signal all matter and are separate ledger fields, reviewed together by Strategic OS.
- "N respondents discussed the topic but were never offered CRC" is **not scoreable either way** — it's a missing data point, not negative evidence. Log it as `crc_offered = N` with a reason, not as a falsification signal.
- Generic AI/copyright interest that never converts to a CRC session **is** negative evidence only within the `crc_offered = Y` denominator — i.e. only for people who had a real chance to use it and didn't.

## Relationship to CR-Track A

Where a Track A (B2B) prospect is engaged, CRC may also be offered — explicitly framed per the Validation Plan §7 as a **demonstrator/reference interface**, not necessarily the eventual enterprise product. A Track A lead who engages with CRC generates evidence relevant to both tracks; log it against both in the ledger rather than forcing a single track assignment.

## List construction / alias rules

Same infrastructure and rules as Track A (see `CR-TRACK-A-B2B-READINESS-SPEC.md` §"List construction" and §"Alias rules") — reused here rather than duplicated. Key points: LinkedIn-URL-based identity matching, Lilly is dead, no same-alias reassignment, staged (not full-inventory) sends.

## Competitor / substitute signal

If a creator reports already using a specific tool or workflow to answer this question themselves, log it under the ledger's `current_substitute` field — this is direct evidence for the Validation Plan's competitor-escalation trigger, independent of ZebraTruth/Creation Rights.

---

## Status as of 2026-08-30

- **Message copy:** discovery sequence + separate CRC invitation drafted in full — `CR-STEC-MESSAGE-SEQUENCES-2026-08-30.md` §B/§C.
- **CRC funnel instrumentation:** audited (read-only) — session start, check completion, and a usefulness signal are already reliably measurable; the one real gap (inbound attribution — no way to tie a CRC session back to its validation-outreach source) has been closed with a minimal, additive implementation. Full findings: `VALIDATION-LEDGER-SCHEMA.md` §"CRC attribution".
- **Candidate pool:** built from the same corpus as Track A, filtered on hands-on-creator title signal (Creative Producer / filmmaker / AI video-creative roles), no maturity requirement — 20 qualified. Full pool: `03_Sales/validation/scripts/_track-b-pool.csv`.
- **Wave 1 (all 20 qualified — the pool itself is small; see the return package for sizing rationale):** `03_Sales/validation/CR-TRACK-B-WAVE1-CANDIDATES.csv`.
- **Not done:** no campaign created in Dripify, no send performed, no CRC invitation sent. Requires Strategic OS review before launch.
