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

## Step 7: CRM Quick Sync

Ask the user: "Any CRM stage updates? Enter B-ID:Stage pairs (e.g. B050:Call Scheduled, B042:Evaluating) or press Enter to skip."

Valid stages: Lead Replied · Warm Lead · Call Requested · Call Scheduled · Call Taken · Evaluating · Creator Submitted · Rights Verified Submitted · Won · Lost

For each pair, find the matching row in `03_Sales/CRM.md` pipeline table (between `<!-- pipeline:start -->` and `<!-- pipeline:end -->`) and update the stage field.

---

## Commit

Ask (AskUserQuestion):
- "Commit this report?" → Yes / No

If Yes:
- `git add data/dripify-campaigns.csv data/geo-cost-inputs.csv data/sequence-content.json 03_Sales/CAMPAIGN-PERFORMANCE-LOG.md 03_Sales/DISCOVERY-PERFORMANCE-LOG.md 03_Sales/DISCOVERY-PIPELINE.md 03_Sales/CRM.md 03_Sales/campaign-reports/CAMPAIGN-REPORT-YYYY-MM-DD.md 03_Sales/discovery-reports/DISCOVERY-REPORT-YYYY-MM-DD.md`
- Read the campaign count and total leads from the CSV for the commit message
- Commit with message: "Sales: [Month Year] campaign report — [N] campaigns, [N,NNN] leads"

---

## Reference

Full methodology: `03_Sales/CAMPAIGN-REPORT-METHODOLOGY.md`
Data architecture: Dripify UI → `data/dripify-campaigns.csv` + Supabase CSV → `report.py` + `discovery_report.py` → `CAMPAIGN-PERFORMANCE-LOG.md` + `DISCOVERY-PERFORMANCE-LOG.md`
