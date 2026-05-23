Run the SI8 monthly Dripify LinkedIn campaign performance report wizard.

Walk the user through all 7 steps below using your tools. Use AskUserQuestion for structured choices. For numeric inputs, ask in plain text and process the reply.

---

## Step 1: Supabase CSV

Run `ls -la data/supabase-exports/` and show the user what exports exist with their dates.

Ask (AskUserQuestion):
- "Did you export a new Supabase CSV today?" → Yes / No (use latest)

If Yes: ask what the filename is and confirm it exists in `data/supabase-exports/`.
If No: use the most recently dated file.

Tell the user: to export, go to Supabase → Table Editor → `linkedin_responses` → Export → CSV → save as `data/supabase-exports/supabase-export-YYYY-MM-DD.csv`.

---

## Step 2: Dripify Campaign Numbers + New Campaigns

Paste Dripify campaign table from UI (tab-separated). The wizard auto-matches names, updates existing rows, and prompts for metadata on new ones.

Then asks: "Any additional campaigns to add manually?" — collects required fields for each:
- campaign_name, alias, geo, target_segment, sequence, launch_date, leads_sent, accepted, responded
- Auto-set in_cost_analysis=true if sequence contains "Legal Friction" AND target contains "AI Video" / "CreaDir"
- Ask user to confirm the in_cost_analysis flag

Saves to `data/dripify-campaigns.csv`.

---

## Step 3: Sequence Content

Read `data/sequence-content.json`. Show a summary table:
- Sequence name
- Msg 1 hook (first non-greeting line, truncated to ~80 chars)
- Number of campaigns using this sequence (from `data/dripify-campaigns.csv`)

Ask (AskUserQuestion):
- "Any new or updated message sequences?" → Yes / No

If No: skip.

If Yes: for each sequence being added or updated:
1. Ask for the sequence name (must match `sequence` column in `dripify-campaigns.csv` exactly)
2. Ask for the Dripify display name (e.g. "SI8_Legal Friction (4 Msg)")
3. Ask the user to paste each of the 4 messages in turn (blank line to finish each one)

Write updated entries to `data/sequence-content.json`.

---

## Step 4: Run Both Reports

Run sales report:
`python3 tools/campaign-report/report.py --supabase data/supabase-exports/FILENAME.csv`

Run discovery report:
`python3 tools/campaign-report/discovery_report.py --supabase data/supabase-exports/FILENAME.csv`

Show from `03_Sales/CAMPAIGN-PERFORMANCE-LOG.md`:
1. The Key Insights section
2. The Cost Efficiency table ($/warm reply — $/call comes after call verification)

Show from `03_Sales/DISCOVERY-PERFORMANCE-LOG.md`:
1. Grand Total table (total signals, class breakdown)
2. By Geo table

---

## Step 5: Call Verification

Read `03_Sales/CAMPAIGN-PERFORMANCE-LOG.md`. Find the `### Call Verification Checklist` section.

For each geo block listed:
1. Show the geo name and warm lead count
2. Show each lead: name · title · company
3. Ask the user: "How many verified call requests for [geo]?" (show current count from `data/geo-cost-inputs.csv`)

Rules for verified calls (remind the user):
- ✓ CALL: they explicitly asked for a meeting, demo, walkthrough, or call in their own words
- ✗ NOT: "nice to e-meet you", rejections containing "no need for a meeting", consultants who sent their own Calendly link, passive "happy to chat if you have questions"

After collecting all counts, update `data/geo-cost-inputs.csv`.

Re-run: `python3 tools/campaign-report/report.py` (with the same supabase path from Step 1).

Show the final Cost Efficiency table with the $/call column filled in.

---

## Step 6: Discovery Signal Review

Read `03_Sales/DISCOVERY-PERFORMANCE-LOG.md`. Parse the `## Discovery Signal Checklist` section.

Display each lead as a numbered entry:
```
[N] [CLASS]  Name · Title · Company
      Geo: GeoName
      "excerpt from reply..."
```

Ask the user: "Add to Discovery Pipeline (e.g. 1,3,5  /  all  /  none)"

For each selected lead, append a row to the Signal table in `03_Sales/DISCOVERY-PIPELINE.md`:
- Columns: Lead | Title | Company | Geo | Sales Class | Campaign | Key insight excerpt | Added
- Update the `## Signal (N)` count

Remind the user: full conversations are in `03_Sales/DISCOVERY-PERFORMANCE-LOG.md`.

---

## Step 7: Sales Pipeline Sync

Ask the user: "Any sales pipeline stage updates? Enter B-ID:Stage pairs (e.g. B050:Call Scheduled, B042:Evaluating) or press Enter to skip."

Valid stages: Lead Replied · Warm Lead · Call Requested · Call Scheduled · Call Taken · Evaluating · Creator Submitted · Rights Verified Submitted · Lost

**Do NOT update CRM.md.** All stage changes go into `03_Sales/SALES-PIPELINE.md` only.

For each pair provided:
1. Look up the lead's name, company, and geo from `03_Sales/CRM.md` (read-only reference).
2. Add or move the lead row into the correct stage section of `03_Sales/SALES-PIPELINE.md` (between `<!-- sales-pipeline:start -->` and `<!-- sales-pipeline:end -->`).
3. Update the stage section count (e.g. `## 3. Call Requested (0)` → `## 3. Call Requested (1)`).
4. If the lead already exists in an earlier stage section, remove it from there before adding to the new one.

Use the column structure defined in each stage section. Fill in what's available from CRM context; use `—` for unknowns.

---

## Step 8: Pipeline ICP Analysis

Read `03_Sales/SALES-PIPELINE.md`. Pull every lead from the **Warm Lead** and **Call Requested** sections only (these are the leads who have shown real signal — not Lead Replied, not Lost).

Run the following analysis framework across those leads. Cross-reference `03_Sales/CRM.md` for title and company details if not visible in the pipeline file.

### Analysis Framework

**A. Geo Breakdown**
Count leads per geo. Note which geos are punching above weight (high warm rate relative to outreach volume in `CAMPAIGN-PERFORMANCE-LOG.md`).

**B. Company Type**
Group into: boutique/indie studio · AI-native company · holdco arm · mid-size agency · brand-side · other.
Note which type has the most leads AND the highest signal quality (not the same thing).

**C. Title Clusters**
Group titles into: Founder/MD/CEO · Creative Director · Senior Production Specialist · Gen AI Specialist (inside large agency) · Art Director/Designer · Other.
Flag the "Gen AI Specialist inside a holdco" profile specifically — it is a high-value sleeper ICP.

**D. Signal Trigger Type**
Classify each warm lead into one of three trigger types:
- **Trigger 1 — Already Being Asked:** Lead's clients or legal teams are actively requesting documentation NOW. These are in pain today. (E.g. "Yes I am being asked this 100%")
- **Trigger 2 — Product Curiosity:** Lead is evaluating — asked what SI8 does, requested a sample, or reacted positively to the pitch. Not in pain yet but assessing.
- **Trigger 3 — Already Building Something:** Lead has independently built an informal solution (prompt logs, metadata docs, email trails). They've validated the problem themselves. These are the most strategically interesting leads — could be competitor, partner, or upgrade buyer.

**E. ICP Thesis**
From the patterns, write 2-3 sentences describing:
- The primary ICP (title + company type + geo + trigger)
- The secondary ICP (if a second distinct profile emerged)
- The "sweet spot" profile — the single lead type most likely to convert fastest

**F. Targeting Implications**
List 3-5 specific changes to make to campaign targeting, messaging, or geo prioritization based on what the warm leads are telling you.

**G. What is NOT Working**
Note title clusters, company types, or geos that appear in Lead Replied but rarely make it to Warm Lead. These are negative ICP signals — useful for tightening targeting.

**H. Compare to Previous Analysis**
Read the most recent file in `03_Sales/pipeline-analysis/`. Note which trends from last time are holding, which have changed, and what's new. If no previous analysis exists, note this is the baseline.

### Output

Save the full analysis as:
`03_Sales/pipeline-analysis/PIPELINE-ICP-ANALYSIS-YYYY-MM-DD.md`

Use this template structure (see `03_Sales/pipeline-analysis/PIPELINE-ICP-ANALYSIS-2026-05-24.md` as the reference example):
- Header: date, analyst, source data, lead count, link to previous analysis
- Sections 1–8 matching the framework above
- Section 8: Open Questions for Next Analysis (carry forward unanswered questions + add new ones)

Show the user a brief summary of the top 3 findings before saving.

---

## Commit

Ask (AskUserQuestion):
- "Commit this report?" → Yes / No

If Yes:
- `git add data/dripify-campaigns.csv data/geo-cost-inputs.csv data/sequence-content.json 03_Sales/CAMPAIGN-PERFORMANCE-LOG.md 03_Sales/DISCOVERY-PERFORMANCE-LOG.md 03_Sales/DISCOVERY-PIPELINE.md 03_Sales/SALES-PIPELINE.md 03_Sales/CRM.md 03_Sales/campaign-reports/CAMPAIGN-REPORT-YYYY-MM-DD.md 03_Sales/discovery-reports/DISCOVERY-REPORT-YYYY-MM-DD.md 03_Sales/pipeline-analysis/PIPELINE-ICP-ANALYSIS-YYYY-MM-DD.md`
- Read the campaign count and total leads from the CSV for the commit message
- Commit with message: "Sales: [Month Year] campaign report — [N] campaigns, [N,NNN] leads"

---

## Reference

Full methodology: `03_Sales/CAMPAIGN-REPORT-METHODOLOGY.md`
Data architecture: Dripify UI → `data/dripify-campaigns.csv` + Supabase CSV → `report.py` + `discovery_report.py` → `CAMPAIGN-PERFORMANCE-LOG.md` + `DISCOVERY-PERFORMANCE-LOG.md`
Pipeline ICP analysis: `03_Sales/pipeline-analysis/` — dated files, one per report cycle. Reference example: `PIPELINE-ICP-ANALYSIS-2026-05-24.md`
