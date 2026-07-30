# SI8 × Standing Encore — Signal Test Log

**Purpose:** Track every Signal Test run through Standing Encore's managed ICP/Product Discovery product — audience definition, hypothesis, message arms, launch/report dates, and results. Method reference: `SE-SIGNAL-TEST-HOWTO.md` in this folder (filed verbatim, do not edit).
**Started:** 2026-07-30

---

## How this relates to SI8's other outreach tracking

This is a **separate system from `03_Sales/outreach/SPLIT-TEST-LOG.md`**, not a replacement for it. Deliberately kept apart:

| | `outreach/SPLIT-TEST-LOG.md` | This log (`standing-encore/SIGNAL-TEST-LOG.md`) |
|---|---|---|
| **What it tracks** | SI8's own LinkedIn outreach (Dripify-backed), ad-hoc pain-discovery split tests (Tests A–E, 4–13) | Formal, fixed-methodology Signal Tests run through Standing Encore as a managed product |
| **Volume/structure** | Variable per test, informal arms | Fixed: 500 sends per test, defined arms, ~3-week turnaround |
| **Scoring** | T1/T2/T3 trigger classification, informal | FIT / RESONANCE / ACTION rubric, pre-committed read criteria |
| **Deliverable** | Internal analysis (JD + Claude) | Standing Encore's own Intelligence Report, external to SI8 |
| **Relationship to Standing Encore** | Standing Encore is the sending tool underneath it (per `03_Sales/PRESENTATION-JUN4.md` — "Standing Encore sends, Claude Code thinks") | Standing Encore is a customer-facing product SI8 is buying/using directly, with its own managed process |

If a Signal Test result changes SI8's messaging, that change should get reflected in `ICP-DEFINITIONS.md` and the live Dripify sequences the normal way — this log is the evidence trail for *why*, not a duplicate of the live campaign tracking.

---

## Test Status

| Test ID | Audience | Hypothesis (short) | Status | Launched | Report Due | Result |
|---------|----------|---------------------|--------|-----------|-------------|--------|
| SE-001 | Creative Directors, mid-size ad/production agencies | TBD — see below | **Designing** | — | — | — |

---

## SE-001 — Creative Directors (design in progress)

**Status:** Not yet launched. Steps 1–2 (audience, hypothesis) drafted below from existing SI8 pipeline data as a starting point — needs your sign-off before drafting message arms and launching.

### Step 1 — Audience definition (draft)

Pulled from `ICP-DEFINITIONS.md` ICP 1a, which is close to the How-To's own worked example:

> Creative Directors and Executive Creative Directors at independent creative/production agencies, 10–200 employees, English-speaking markets.

Open question: should this match ICP 1a exactly (agencies with *finserv-exposed clients specifically*), or run broader first (all CDs at qualifying agency sizes) and let the Signal Test itself tell us whether the finserv-exposure filter is actually the discriminant — which the current Dripify data hasn't fully separated out yet. Worth deciding before the list is built, since it changes what SE-001 can and can't conclude.

### Step 2 — Hypothesis (draft, needs your read)

Candidate hypothesis, drawn from the confirmed pattern across ~650 existing Dripify replies (Legal Friction sequence, `SPLIT-TEST-LOG.md` Test A/C):

> CDs producing AI-generated video feel exposed on rights/chain-of-title when a client's legal team is involved, and will engage with a message about defensible, independent documentation more than with a generic "AI compliance" framing.

This overlaps with ground SI8 has already covered via Dripify (Legal Friction is the current best-performing sequence) — worth deciding what SE-001 should test that Dripify data *can't* already answer, so the 500 sends aren't spent re-confirming something already known. Candidates:
- Test the v5 institutional framing ("independent commercial assurance") head-to-head against the older "get your AI video cleared" framing, at controlled volume — something the Dripify data can't cleanly separate since the site copy changed mid-stream.
- Test whether the "brand carries liability" finding (`01_Business/research/COMMERCIAL-RISKS-AI-ADVERTISING-EXTERNAL-EVIDENCE-2026.md`) as an opening hook outperforms the current Legal Friction opener.

### Step 3 — Message arms

Not yet drafted — depends on which question above we're actually pointing SE-001 at.

### Steps 4–6 — List, launch, scoring

Not started.

---

## Template for future tests

Copy this block for each new test:

```
## SE-NNN — [Audience short name]

**Status:** Designing / List built / Launched / Report received / Closed
**Launched:** YYYY-MM-DD
**Report due:** ~3 weeks from launch

### Audience definition
[title(s), company type, size band, region/language]

### Hypothesis
[testable question — what we believe this audience feels, what framing surfaces it]

### Message arms
| Arm | Framing | Sends |
|-----|---------|-------|
| A | | |
| B | | |

### Pre-committed read criteria
[decided BEFORE replies land — what counts as a win, which arm we expect to lose, and why]

### Results
| Arm | Sends | Accepts | Replies | FIT % | RESONANCE % | ACTION % |
|-----|-------|---------|---------|-------|--------------|----------|
| A | | | | | | |
| B | | | | | | |

**Recommendation (from Standing Encore's Intelligence Report):**

**What this changes in SI8's messaging (if anything):**
```
