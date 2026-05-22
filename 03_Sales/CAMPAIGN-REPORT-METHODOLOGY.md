# Campaign Performance Report — Methodology & Runbook

**Purpose:** Reproducible instructions for generating `CAMPAIGN-PERFORMANCE-LOG.md`.
Any future agent or collaborator can follow this doc without re-deriving the approach.

**Report script:** `tools/campaign-report/report.py`
**Output file:** `03_Sales/CAMPAIGN-PERFORMANCE-LOG.md`
**Cadence:** Monthly, or after any major campaign batch completes

---

## What This Report Is

A combined view of:
1. **Campaign volume data** — how many leads sent, accepted, responded (sourced from Dripify UI)
2. **Response quality data** — how many of those responses were warm buying-intent signals (sourced from Supabase CSV export)
3. **Cost efficiency** — dollars per warm reply and dollars per verified call request, by geo

This is the operational lever for budget allocation decisions: which geos to scale, which to pause, which campaigns to retire.

---

## Data Inputs Required Before Running

| Input | Source | Format | How to Get It |
|-------|--------|--------|---------------|
| **Dripify campaign data** | Dripify dashboard | CSV (manually updated) | Open each alias dashboard in Dripify → copy leads/accepted/responded for each campaign → update `data/dripify-campaigns.csv` |
| **Supabase response export** | Supabase Table Editor | CSV (auto-named) | Supabase → Table Editor → `linkedin_responses` table → Export → Save to `data/supabase-exports/supabase-export-YYYY-MM-DD.csv` |
| **Verified call counts** | Manual review | CSV (manually updated) | See Step 4 below — review warm lead list, count actual call requests |

---

## Step-by-Step Runbook

### Step 1: Update Dripify numbers (10 min)

Open each alias dashboard in Dripify (Vanessa / Ivy / Lilly / Angel). For each campaign:
- **All Leads** = total contacts loaded into the campaign (shown as "All leads" in Dripify)
- **Accepted** = connection requests accepted
- **Responded** = any reply received (any message in the sequence)

Update `data/dripify-campaigns.csv` with current numbers. Columns:

| Column | What to enter |
|--------|--------------|
| `campaign_name` | Full Dripify campaign name |
| `alias` | Vanessa / Ivy / Lilly / Angel |
| `geo` | One of: Dubai, England, London, Amsterdam, Singapore, Los Angeles, Berlin, Sydney, Global |
| `target_segment` | Target title tier (e.g. "Creative Dir — AI Video") |
| `sequence` | Message sequence name: Legal Friction / Hitting a Wall / Blocks AI Campaign / Trusted AI Supplier / Vetting Takes Weeks / Documented Provenance / Early Days |
| `launch_date` | Approximate launch date (e.g. "Apr 26 2026") |
| `leads_sent` | All Leads count from Dripify |
| `accepted` | Accepted count |
| `responded` | Responded count |
| `in_cost_analysis` | `true` or `false` — see note below |

**`in_cost_analysis = true` criteria:**
- Sequence = Legal Friction, AND
- Target = Creative Dir / AI Video targeting (not Mgr+ / VP+ / CMO)

This matches the cost methodology from May 2026: "Legal Friction campaign only. UK/England = CreaDir AI Video targeting only."

**When adding a new campaign:** add a new row and set `in_cost_analysis` based on the criteria above.

---

### Step 2: Export Supabase CSV

1. Go to Supabase → Table Editor → `linkedin_responses` table
2. Click Export → CSV
3. Save as `data/supabase-exports/supabase-export-YYYY-MM-DD.csv` (use today's date)
4. The script auto-picks the most recent file in that folder

**Important:** The script filters to `is_latest_version = true` to deduplicate multi-turn conversations. Do not pre-filter the export — export the full table.

---

### Step 3: Run the script

From the repo root:

```bash
python tools/campaign-report/report.py
```

The script will:
- Load `data/dripify-campaigns.csv`
- Load the latest Supabase CSV from `data/supabase-exports/`
- Load `data/geo-cost-inputs.csv` (verified call counts)
- Classify all Supabase responses as warm / pass / naf / minimal
- Compute all tables
- Overwrite `03_Sales/CAMPAIGN-PERFORMANCE-LOG.md`
- Print a summary to stdout

Optional flags:
```bash
python tools/campaign-report/report.py --dry-run             # preview without writing
python tools/campaign-report/report.py --supabase data/supabase-exports/supabase-export-2026-04-27.csv  # specific CSV
```

---

### Step 4: Verify call requests (manual — 15 min)

At the bottom of the generated report is a **Call Verification Checklist** — a list of all warm leads from the Supabase CSV, grouped by geo. Each entry shows the **full `conversation_raw`** (the complete multi-message thread between SI8 and the lead).

**Critical: You must read the entire thread, not just the first reply.** Call requests frequently appear in message 3 or 4, after the lead has asked follow-up questions or after SI8 has replied with more context. A lead who gave a minimal reply to message 1 may have explicitly asked for a call in a later exchange. Reviewing only the initial reply (or a short preview) will systematically undercount verified calls.

The checklist format shows the full thread verbatim per lead — scroll through the entire exchange before marking any lead as "not a call request."

For each warm lead listed:
1. Read the **entire conversation thread** as displayed in the checklist
2. Mark as a verified call request ONLY if they **explicitly** asked for a meeting/demo/call in any message
3. Reject these common false positives:
   - "Nice to e-meet you" / "lovely to connect" (LinkedIn greeting, not a call request)
   - Explicit rejection: "no need for a meeting" (algorithm fires on "meeting")
   - Consultant who sent **their own** Calendly link (they're selling to you)
   - "Happy to chat if you have questions" (passive open door, not an active request)

Count verified call requests per geo and update `data/geo-cost-inputs.csv`:

```
geo,verified_calls
UAE/Dubai,2
London/UK,3
Netherlands,0
...
```

Then re-run the script. The $/call column will populate.

---

### Step 5: Review and commit

Scan the generated `03_Sales/CAMPAIGN-PERFORMANCE-LOG.md` for sanity:
- Grand totals match Dripify dashboard
- Top geo by response rate matches intuition
- Cost table looks right ($/warm reply should be in $1–$5 range for good geos)

If anything looks off, check whether the Supabase CSV export is current and whether any campaigns are missing from the Dripify CSV.

Commit: `Sales: [month] campaign performance report — [N] campaigns, [N] leads`

---

## Formula Reference

| Metric | Formula | Notes |
|--------|---------|-------|
| **Accept %** | `accepted / leads_sent × 100` | Denominator = all leads, not contacts sent |
| **Response %** | `responded / leads_sent × 100` | Denominator = all leads, not contacts sent |
| **Cost per lead** | `$100 / 700 = $0.143` | Dripify cost basis. Update if pricing changes. |
| **Total cost (geo)** | `leads_sent × $0.143` | Applies to Legal Friction campaigns only for cost table |
| **$/warm reply** | `total_cost / warm_replies` | Warm = `classify_reply()` returns `'warm'` |
| **$/call request** | `total_cost / verified_calls` | Verified calls = manual review (Step 4) |

**Cost basis update:** If Dripify pricing changes, update `COST_PER_LEAD = 100 / 700` in `tools/campaign-report/report.py`. The current basis ($100/month = 700 outreaches) was set May 2026.

---

## Classification Rules

### What counts as "warm"

Defined in `tools/linkedin-analysis/classify.py` — `classify_reply()` function.

Four classes:
| Class | Meaning |
|-------|---------|
| `warm` | Genuine buying-intent signal: described pain, asked a product question, expressed interest, offered to chat |
| `pass` | Polite no: "not right now", "not relevant", "haven't had this issue" |
| `naf` | Not a fit: "we don't use AI", "never will", counter-pitch |
| `minimal` | Too short to classify: thumbs up, "Hi", single word |

The classifier uses keyword pattern matching. It is:
- **Reliable for warm** — tested across 450+ responses, false positive rate low
- **Not reliable for call requests** — ~80% false positive rate on call-intent detection (hence manual Step 4)

To update warm patterns (e.g. if a new common phrase appears): edit `WARM_PATTERNS` in `classify.py`. Add phrases that unambiguously signal buying intent.

### What counts as a "verified call request"

A lead explicitly asked for a meeting, demo, walkthrough, or call using their own words. Examples:
- "I would love to see the platform in action — let me know when you have time"
- "Happy to speak with JD. Let me know a couple of time options"
- "Yes I will be open to finding out more and a short call" → then booked

NOT a verified call request:
- "Happy to chat if you have more questions" (passive, not an active ask)
- "Let me know if you need support" (counter-offer)
- Any rejection that contains the word "meeting" (e.g. "no need for a meeting")

---

## Geo Normalization

The Dripify CSV uses short geo labels. The Supabase CSV contains raw `lead_location` strings (e.g. "London, United Kingdom"). The script maps both to a canonical geo using two functions:

- `DRIP_TO_NORM` dict — maps Dripify geo label → canonical geo
- `norm_location()` — maps lead_location string → canonical geo

**If you add a new geo** (e.g. "Paris" campaigns):
1. Add a row to `DRIP_TO_NORM` in `report.py`: `'Paris': 'France/Paris'`
2. Verify `norm_location()` handles that city (check the `paris` / `france` branch)
3. Add a row to `data/geo-cost-inputs.csv`: `France/Paris,0`

---

## Data Architecture (Where This Fits)

```
Dripify dashboard (UI)           Supabase Table Editor
        ↓ manual copy                    ↓ CSV export
data/dripify-campaigns.csv    data/supabase-exports/*.csv
        ↓                                ↓
        └──────────────────┬────────────┘
                           ↓
              tools/campaign-report/report.py
                           ↓
          03_Sales/CAMPAIGN-PERFORMANCE-LOG.md   ← this report
                           ↓
    03_Sales/outreach/LINKEDIN-CAMPAIGN-ANALYSIS.md (Section 9 + 10)
                           ↓
                   03_Sales/CRM.md (Section 3 — ICP thesis)
```

The warm reply classification also feeds `tools/linkedin-analysis/analyze.py` which generates the separate ICP validation reports (`LINKEDIN-ICP-REPORT-YYYY-MM-DD.md`). Those reports and this one use the same classifier but serve different purposes:
- **ICP reports** — who is the buyer? What titles/geos/messages convert?
- **Campaign performance report** — how efficient is spend? Which geos get the most warm replies per dollar?

---

## Troubleshooting

**Warm reply counts look too low:**
- Check that the Supabase export is recent (campaigns may have new responses since last export)
- Check that `campaign_name` in the Supabase CSV contains "Legal Friction" — if the sequence name changed in Dripify, update the filter in `report.py`: `'legal friction' in r.get('campaign_name', '').lower()`

**A geo shows 0 warm replies but there should be some:**
- Check `norm_location()` handles that city (e.g. "Dubai" locations might come through as "United Arab Emirates")
- Check `DRIP_TO_NORM` maps the Dripify geo label to the same canonical geo as `norm_location()`

**Script errors on import:**
- Run from repo root: `python tools/campaign-report/report.py`
- Ensure `tools/linkedin-analysis/classify.py` exists (it should — don't delete it)

**New alias added (e.g. a 5th outreach profile):**
- Add their campaigns to `data/dripify-campaigns.csv`
- No script changes needed — alias is just a string grouping field
