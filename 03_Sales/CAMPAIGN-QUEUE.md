# SI8 Campaign Queue
**Purpose:** Single source of truth for campaign status across all aliases — what's running, what to build next, what's waiting.
**Updated:** 2026-06-01

---

## Currently Running

| Alias | Campaign | Geo | Sequence | Leads sent |
|-------|----------|-----|----------|-----------|
| Ivy | `CreaDir_AI Video_England_0426A_IL` | England | Legal Friction | 300 |
| Ivy | `CreaDir_AI Video_England_0426B_IL` | England | Legal Friction | 678 |
| Ivy | `CreaDir_AI Video_SPG_0526A_IL` | Singapore | Legal Friction | 232 |
| Ivy | `CreaDir_AI_Posted_LI_Eng_0626A_IL` | England | EU AI Act | 171 |
| Vanessa | `CreaDir_AI Video_AmsDm_0426A_VP` | Amsterdam | Legal Friction | 300 |
| Vanessa | `CreaDir_AI Video_STHM_0526A_VP` | Stockholm | Legal Friction | 341 |
| Angel | `CreaDir_AI Video_Berlin_0626A_AL` | Berlin | Legal Friction | 364 |
| Angel | `CreaDir_AI Video_Paris_0526A_AL` | France | Legal Friction | 61 |
| JD | `CreaDir_AI Video_Paris_0526A_JC` | France | EU AI Act | 240 |
| Lilly | `CreaDir_AI Video_Dubai_0426A_LH` | Dubai | Legal Friction | 388 |

---

## Launch Next — Ready to Build in Dripify

Build in this order:

| Priority | Alias | Proposed campaign name | Geo | Sequence | Est. leads | Notes |
|----------|-------|----------------------|-----|----------|-----------|-------|
| 1 | Angel | `CreaDir_AI Video_Berlin_0626B_AL` | Berlin Metro | EU AI Act | ~50–80 net new | 229 raw; deduped vs 364 existing Berlin. Phase 1 of 2-phase Germany test. |
| 2 | Ivy | ~~`CreaDir_AI Video_England_0626A_IL`~~ | England | EU AI Act | — | Launched as `CreaDir_AI_Posted_LI_Eng_0626A_IL` Jun 1 — only 25 leads imported (check if Dripify still importing from Sales Nav search) |
| 3 | Ivy | `CreaDir_AI Video_SPG_0626A_IL` | Singapore | Legal Friction | 181 | Batch 2; deduped vs 232 already sent |
| 4 | Vanessa | `CreaDir_AI Video_STHM_0626A_VP` | Stockholm | EU AI Act | ~200–250 net new | 336 raw; deduped vs 341 existing. EU Act fits Stockholm organic awareness. |
| 5 | JD | `CreaDir_AI Video_FinServ_London_0626A_JC` | London / FinServ | EU AI Act | ~150–180 | 298 England finserv raw; apply Posted on LI filter to trim to active leads. Ivan Petruzzelli (State Street) is proof point for this segment. |

---

## Launch After — Waiting on Results or Timing

| Alias | Proposed campaign name | Geo | Sequence | Est. leads | Launch trigger |
|-------|----------------------|-----|----------|-----------|----------------|
| Angel | `CreaDir_AI Video_Germany_0626A_AL` | Germany (broad) | EU AI Act | ~543 net new | Wait 7–10 days after Berlin Metro — need acceptance rate + at least 1 substantive reply before expanding |
| JD | `CreaDir_AI Video_EMEA_0626A_JC` | EMEA | EU AI Act | 2,500+ (dripped over weeks) | Launch after London FinServ is live. EMEA dedup covers all other territories already running. |

---

## Blocked

| Alias | Reason |
|-------|--------|
| Lilly | Alias inaccessible — no new campaigns until resolved |

---

## Lists Still Needed

These campaigns are planned but don't have a confirmed Sales Nav search yet:

| Alias | Territory / Segment | What's needed |
|-------|-------------------|---------------|
| Ivy | England — holdco production layer | Sales Nav search for "Senior Video Production Specialist" / "Head of Production" at holdco/large agency — no count yet |
| Vanessa | Netherlands — finserv or brand-side pivot | NL market low warm conversion on creative titles; need a search scoped to brand-side or finserv NL titles |

---

## Territory Rules (reference)

| Alias | Owns |
|-------|------|
| JD (JC) | France, London/FinServ, EMEA |
| Ivy (IL) | UK/England, Singapore |
| Vanessa (VP) | Netherlands/Amsterdam, Sweden/Stockholm |
| Angel (AL) | Germany/Berlin, France (deduped, secondary) |
| Lilly (LH) | Dubai/UAE — blocked until alias restored |

**Dedup rule:** All campaigns use "don't send if lead is in any previous campaign" in Dripify. Overlap between territories is handled automatically.

---

## Sequence Guide (reference)

| Sequence | Best fit | August 2 urgency? |
|----------|---------|-------------------|
| EU AI Act | EMEA, Germany, Nordic, FinServ, JD alias | Yes — leads directly with deadline |
| Legal Friction | UK, Singapore, Dubai, UAE | No — leads with client legal pressure |

---

## Berlin Metro → Germany Test Plan

**Hypothesis:** EU AI Act sequence lands better in Germany than Legal Friction because German leads show organic regulatory awareness (EU Act deadline volunteered unprompted in prior campaigns).

**Phase 1:** Berlin Metro (229 raw, ~50–80 net new) — `0626B_AL`
**Phase 2:** Germany broad (907 raw, ~543 net new) — `0626A_AL`

**Go/no-go criteria for Phase 2:**
- Berlin Metro acceptance rate ≥ 20% (Legal Friction Berlin ran 32%)
- At least 1 substantive reply engaging with the August 2 frame
- Check at day 7–10 before launching Germany broad

---

*Update this file each report cycle. Move rows from "Launch Next" to "Currently Running" when campaigns go live in Dripify.*
