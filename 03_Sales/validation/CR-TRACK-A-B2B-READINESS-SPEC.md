# CR-Track A — B2B Readiness STEC Experiment Spec

**Status:** Spec drafted, NOT launched. Requires Strategic OS sign-off before any list build or send.
**Parent:** `01_Business/product-discovery/COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md`
**Relationship to existing ICP system:** Independent of `03_Sales/ICP-DEFINITIONS.md`'s live ICP 1/2/3 numbering. "CR-Track A" is a validation-track label only, not a replacement for or addition to the authoritative ICP definitions. `ICP-DEFINITIONS.md` is not modified by this spec.

---

## Hypothesis

B2B AI-production organizations that already capture or think seriously about production state/evidence still experience a distinct downstream commercial-readiness decision problem.

## Targeting — maturity-qualified, not title-qualified

**PMM correction (2026-08-30): Track A does not mean "people with AI-production titles."** A title (AI production innovation, creative/AI production leadership, etc.) is a *candidate signal*, not a qualification. Track A specifically tests organizations/people for whom production-state/evidence capture is **already reasonably mature or actively being implemented** — because the hypothesis under test is what happens *after* that documentation exists, not whether the person is generally interested in AI.

**Required list-construction field: `track_a_maturity_basis`.** Every Track A candidate must carry a source-grounded reason they qualify. If maturity cannot be supported from existing evidence, the candidate is classified as **insufficiently qualified for Track A** — do not assume maturity from title alone.

Qualifying evidence can include, but is not limited to:
- repeated commercial AI production
- structured AI production workflow
- enterprise/regulated AI production
- documented AI governance/compliance process
- rights/clearance process
- production audit process
- provenance/lineage tooling
- structured prompt/tool/source-asset documentation
- formal client AI requirements
- internal AI-production SOP
- platform/workflow product handling production state
- other credible evidence that RECORD/documentation is not a novel concept to this person

**Do not require:** C2PA, blockchain, a specific provenance vendor, or perfect production records — SI8 remains provenance-technology agnostic. Generic interest in AI, or an AI-related job title alone, is **not sufficient**.

## Message principle

Probe the workflow. Do **not** sell provenance, prompt logging, C2PA, blockchain, a Decision Engine, or Commercial Assurance product architecture.

Core concept (exact copy to be developed as a separate experiment-copy pass, not finalized here):

> "Once you've documented the AI tools, source assets, licenses and other production details, how do you determine whether everything is actually okay for the client's intended commercial use?"

## Response classification

Multiple codes may apply per reply. Do not collapse distinct observations (e.g. "legal reviews it" is class C; it is not automatically evidence of pain — pain requires an explicit class G signal too).

| Code | Meaning |
|---|---|
| A | No distinct downstream problem |
| B | Producer/internal review |
| C | Legal / Business Affairs review |
| D | Client/gatekeeper review |
| E | Existing software/system handles it |
| F | Contractual risk transfer |
| G | Unresolved / manual / painful process |
| H | Interested in solution/demo/call |

## Primary signals (not reply rate)

1. Commercial-readiness job incidence
2. Current owner of the decision
3. Pain/friction incidence
4. Existing substitute
5. Willingness to discuss/demo
6. Potential buyer/payment structure

Reply rate remains operationally tracked (cost efficiency) but is **not** the strategic metric.

## List construction

Reuse existing Standing Encore infrastructure rather than rebuilding:
- `03_Sales/standing-encore/AGENCY-INTELLIGENCE-DATABASE.md` — vetted agency/company universe
- `03_Sales/standing-encore/SAMPLING-METHODOLOGY-v1.1.md` — per-agency cap, dedup, sampling method
- `03_Sales/standing-encore/SALES-NAVIGATOR-EXTRACTION-SOP.md` — extraction process, ensures LinkedIn URL is captured at source (target-list exports have 100% URL coverage by construction — see `VALIDATION-LEDGER-SCHEMA.md` §"Identity-key coverage")

## Alias rules (required execution control — see `VALIDATION-LEDGER-SCHEMA.md` for full identity-key findings)

- A lead **must not** be assigned to the same LinkedIn alias that previously contacted them.
- **Lilly is inactive/dead** (confirmed inaccessible — `SALES-PIPELINE.md`, `TODO-PRODUCT-VALIDATION.md`, and a VOID entry in `CRM.md`). Prior Lilly contact still counts as previous-contact history; it does not free the lead for reuse against a live alias without dedup review — it simply means Lilly herself can't be the assigning alias again.
- A previously contacted lead may be assigned to a **different** live alias (Ivy, Vanessa, Angel, or JD), subject to deduplication and general campaign rules.
- Identity matching for contamination checks uses **LinkedIn profile URL**, not name alone. Name-only matching has a confirmed live failure case (the "Florent Delavous" duplicate found independently in the same alias's own Germany warm-lead list during this research pass). Any lead whose identity cannot be uniquely resolved by URL is excluded pending manual review, never guessed.
- Lists are deduplicated, preserve original alias/contact history, and do not overwrite authoritative raw campaign exports (`data/supabase-exports/*.csv`, `data/dripify-campaigns.csv`).

## Staging discipline

Do not consume all available STEC inventory in one irreversible batch. **PMM correction (2026-08-30):** build a larger qualified candidate *pool* if useful, but the proposed initial *send* cohort (Wave 1) is **~60–80 qualified leads** — smaller than the earlier ~100–200 draft — sized to preserve STEC inventory and message/targeting iteration capacity after early qualitative responses.

## Interpretation boundaries

Mechanical counts (sends, accepts, replies, classification-code tallies) are calculated automatically and reported in the Validation Review Template. Whether a given pattern of classification codes constitutes validation, falsification, or remains inconclusive is a Strategic OS interpretation, not an execution output — per the plan's evidence standards (§4 of the Validation Plan).

## Competitor escalation trigger

Per the Validation Plan §8: escalate ZebraTruth/Creation Rights research priority only if a Track A prospect names one as their current solution, compares SI8 directly to one, or independent adoption evidence emerges. Do not benchmark preemptively.

---

## Status as of 2026-08-30

- **Message copy:** drafted in full — `CR-STEC-MESSAGE-SEQUENCES-2026-08-30.md` §A.
- **Candidate pool:** built from the existing accepted/responded-lead corpus (`data/supabase-exports/*.csv`, 597 unique leads by LinkedIn URL) — 244 qualified with a real `track_a_maturity_basis` (332 excluded for insufficient evidence, 6 flagged manual-review for a negation false-positive, 15 excluded as already-handled warm leads). Full pool: `03_Sales/validation/scripts/_track-a-pool.csv`.
- **Wave 1 (70 leads, within the approved 60–80 range):** `03_Sales/validation/CR-TRACK-A-WAVE1-CANDIDATES.csv` — company-capped (max 3/company), alias-reassigned (never the same alias that contacted them before, Lilly treated as dead).
- **Not done:** no campaign created in Dripify, no send performed. Requires Strategic OS review of the actual Wave 1 list and message copy before launch.
