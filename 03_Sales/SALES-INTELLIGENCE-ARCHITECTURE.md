# SI8 Sales Intelligence Architecture

**Purpose:** Single reference for how sales data flows through the system — from raw LinkedIn responses to ICP thesis to campaign decisions. For human review and future AI agents.

**Last updated:** April 9, 2026

---

## The Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 0 — RAW RESPONSE DATABASE                        │
│  Supabase CSV export (generated every 1-3 days)         │
│                                                         │
│  Contains: ALL 110+ responses — good, bad, generic.     │
│  Full conversation text, campaign name, alias,          │
│  message number, timestamp, lead details.               │
│  Source of truth for full response-pool analysis.       │
│                                                         │
│  ⚠️ CRM.md is NOT the full response log.               │
│  CRM.md contains warm/active leads only.                │
│  All campaign-level analysis comes from this CSV.       │
└────────────────────┬────────────────────────────────────┘
                     │ raw responses flow DOWN
                     ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 1 — RAW ANALYSIS                                 │
│  03_Sales/outreach/LINKEDIN-CAMPAIGN-ANALYSIS.md        │
│                                                         │
│  Contains: campaign stats per list, acceptance rates,   │
│  response rates, funnel conversion ratios, warm rate    │
│  by campaign/alias/geo/title/message number,            │
│  good ICP lead log, key learnings                       │
│                                                         │
│  Update cadence: on each CSV export analysis            │
└────────────────────┬────────────────────────────────────┘
                     │ patterns flow DOWN
                     ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2 — SYNTHESIZED THESIS                           │
│  03_Sales/CRM.md — Section 3: ICP Analysis              │
│                                                         │
│  Contains: ICP profile (primary + secondary),           │
│  conversion pathways, title ranking, geography verdict, │
│  company type analysis, pain awareness levels,          │
│  targeting changes for next batch                       │
│                                                         │
│  Also contains: active pipeline (warm/good leads only)  │
│  Stage, urgency, follow_up_by, next action.             │
│  Read by daily digest. NOT a log of all responses.      │
│                                                         │
│  Update cadence: after each meaningful new data signal  │
└────────────────────┬────────────────────────────────────┘
                     │ thesis informs DOWN
                     ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3 — OPERATIONAL CONSUMERS                        │
│                                                         │
│  03_Sales/outreach/LINKEDIN-CAMPAIGNS-CAAS-V1.md        │
│  → Campaign playbook, targeting filters, job title      │
│    include/exclude lists, geography priority order      │
│                                                         │
│  03_Sales/outreach/PERSONAS.md                          │
│  → Persona assignments, tone/verbiage rules             │
│                                                         │
│  tools/daily-digest/digest.py                           │
│  → Pulls CRM Section 3 for ICP signal check in email   │
└─────────────────────────────────────────────────────────┘
```

---

## The Rule

**Data flows DOWN only.** Never define the ICP in Layer 3 and push it up to Layer 1. Never update the campaign analysis to match what the CRM says. The raw data is authoritative — the thesis is derived from it.

| ✅ Correct | ❌ Wrong |
|-----------|---------|
| New responses show Founders convert better → update Layer 1 stats → update Layer 2 thesis → update Layer 3 filters | Update Layer 3 filters based on a hunch → backfill justification into Layer 2 → leave Layer 1 unchanged |
| Campaign response rate drops → flag in Layer 1 → revise thesis in Layer 2 | Revise targeting in Layer 3 without updating Layer 1 or 2 |

---

## Update Process (Step by Step)

### When new LinkedIn responses come in:
1. Log new leads in `CRM.md` pipeline table (status, stage, persona)
2. If response pattern is new (new title, new geo, new objection), note it in CRM Section 1 or 2
3. When enough new responses accumulate (10+), update `LINKEDIN-CAMPAIGN-ANALYSIS.md` Section 6 (Key Learnings) and Section 5 (ICP lead log)
4. If the pattern changes the ICP thesis, update `CRM.md` Section 3
5. If targeting filters need to change, update `LINKEDIN-CAMPAIGNS-CAAS-V1.md` LinkedIn Search Filters section

### When a campaign batch completes:
1. Pull final stats from outreach tool (accepted, responses per list)
2. Update `LINKEDIN-CAMPAIGN-ANALYSIS.md` Section 2 (raw data table) and Section 4 (funnel summary)
3. Update Section 6 (learnings) if any new campaign angles performed unexpectedly
4. Propagate ICP changes down to Layer 3 if warranted

### When launching a new campaign:
1. Check `CRM.md` Section 3 for current ICP thesis and targeting changes
2. Check `LINKEDIN-CAMPAIGN-ANALYSIS.md` Section 3 for which message angles perform best
3. Build new list in outreach tool using `LINKEDIN-CAMPAIGNS-CAAS-V1.md` filters
4. Add new list to `LINKEDIN-CAMPAIGN-ANALYSIS.md` Section 2 when launched (with 0 stats, to be filled in)

---

## File Map

| File | Layer | Role |
|------|-------|------|
| Supabase CSV export | 0 | Raw response database — ALL responses, full conversation, campaign, alias, message number. Export every 1-3 days. Source of truth for full-pool analysis. |
| `03_Sales/outreach/LINKEDIN-CAMPAIGN-ANALYSIS.md` | 1 | Campaign stats, warm rates by campaign/alias/geo/title/message number, ICP lead log, key learnings |
| `03_Sales/CRM.md` Section 3 | 2 | Synthesized ICP thesis (title ranking, geo verdict, company type, pain levels, conversion pathways) |
| `03_Sales/CRM.md` pipeline table | 2 | Active pipeline — warm/good leads only (stage, urgency, next action). Read by daily digest. |
| `03_Sales/outreach/LINKEDIN-CAMPAIGNS-CAAS-V1.md` | 3 | Campaign playbook + targeting filters (downstream of Layer 2) |
| `03_Sales/outreach/PERSONAS.md` | 3 | Persona SOP + tone rules (downstream consumer) |
| `tools/daily-digest/digest.py` | 3 | Reads CRM Section 3 for daily ICP signal check |
| `03_Sales/outreach/LINKEDIN-OUTREACH-RESULTS-MARCH-2026.md` | — | Historical record — March 2026 campaigns (archive, do not update) |

---

## Unit Economics (as of April 9, 2026)

| Metric | All campaigns | Optimized batch |
|--------|--------------|-----------------|
| Cost per contact sent | $0.18 | $0.18 |
| Contacts per good ICP lead | ~441 | ~200 |
| **Cost per good ICP lead** | **~$79** | **~$36** |

*Optimized batch = Legal Friction campaign + Founder/MD titles + London/Singapore.*
*Update cost per contact if outreach tool pricing changes.*

---

## ICP Title Ranking (as of April 9, 2026)

Derived from `LINKEDIN-CAMPAIGN-ANALYSIS.md` + `CRM.md` Section 3. Update here when Layer 1 data changes the ranking.

| Rank | Title | Performance | Notes |
|------|-------|-------------|-------|
| #1 | MD / Founder | Best — hot or warm | Directly responsible, decision-maker |
| #2 | AI Director / AI Practitioner | Warm — distinct pitch needed | Has informal process; pitch the IAB gap, not "do you have a problem" |
| #3 | Creative Director / Head of Production | Conditional or warm | Right role, slower to qualify |
| ✗ | Media Director / Planner | Wrong buyer type | Media buying, not production |
| ✗ | PR Director, Partnerships, HR | Not a fit | Wrong function |

---

## Geography Priority (as of April 9, 2026)

| Priority | Geography | Signal |
|----------|-----------|--------|
| Primary | London | Strongest response quality; regulatory awareness highest |
| Secondary | Singapore | Rising — first live client use case emerged Apr 2026 |
| Test batch | Paris / Amsterdam / Hamburg | EU AI Act August 2026 deadline = urgency hook |
| Paused | Sydney, Abu Dhabi, India, US | Off-strategy Year 1 |
