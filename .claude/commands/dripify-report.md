Run the SI8 monthly Dripify LinkedIn campaign performance report wizard.

Walk the user through all 6 steps below using your tools. Use AskUserQuestion for structured choices. For numeric inputs, ask in plain text and process the reply.

---

## Step 1: Supabase CSV

Run `ls -la data/supabase-exports/` and show the user what exports exist with their dates.

Ask (AskUserQuestion):
- "Did you export a new Supabase CSV today?" → Yes / No (use latest)

If Yes: ask what the filename is and confirm it exists in `data/supabase-exports/`.
If No: use the most recently dated file.

Tell the user: to export, go to Supabase → Table Editor → `linkedin_responses` → Export → CSV → save as `data/supabase-exports/supabase-export-YYYY-MM-DD.csv`.

---

## Step 2: Dripify Campaign Numbers

Read `data/dripify-campaigns.csv`. Display all campaigns grouped by alias in a table showing:
- Campaign name (short form, strip `SI8_RV_R4LI_` prefix)
- Current leads_sent / accepted / responded
- Geo and sequence

Ask (AskUserQuestion):
- "Do any campaigns have updated numbers from Dripify?" → Yes / No

If Yes: ask "Which campaigns need updates? List the short names (or say 'all of Lilly' etc.)."
Then for each campaign that needs updating, show current values and ask for new leads_sent, accepted, responded.
Edit `data/dripify-campaigns.csv` with the updated values.

---

## Step 3: New Campaigns

Ask (AskUserQuestion):
- "Any new campaigns to add since last report?" → Yes / No

If Yes: collect all required fields for each new campaign:
- campaign_name, alias, geo, target_segment, sequence, launch_date, leads_sent, accepted, responded
- Auto-set in_cost_analysis=true if sequence contains "Legal Friction" AND target contains "AI Video" / "CreaDir"
- Ask user to confirm the in_cost_analysis flag

Append to `data/dripify-campaigns.csv`.

---

## Step 4: Sequence Content

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

## Step 5: Run Report

Run: `python3 tools/campaign-report/report.py`

If a specific supabase path was chosen in Step 1: `python3 tools/campaign-report/report.py --supabase data/supabase-exports/FILENAME.csv`

Read `03_Sales/CAMPAIGN-PERFORMANCE-LOG.md` and show the user:
1. The Key Insights section
2. The Cost Efficiency table (without the call verification checklist — that comes next)

---

## Step 6: Call Verification

Read `03_Sales/CAMPAIGN-PERFORMANCE-LOG.md`. Find the `### Call Verification Checklist` section.

For each geo block listed:
1. Show the geo name and warm lead count
2. Show each lead: name · title · company and their reply excerpt
3. Ask the user: "How many verified call requests for [geo]?" (show current count from `data/geo-cost-inputs.csv`)

Rules for verified calls (remind the user):
- ✓ CALL: they explicitly asked for a meeting, demo, walkthrough, or call in their own words
- ✗ NOT: "nice to e-meet you", rejections containing "no need for a meeting", consultants who sent their own Calendly link, passive "happy to chat if you have questions"

After collecting all counts, update `data/geo-cost-inputs.csv`.

Re-run: `python3 tools/campaign-report/report.py` (with the same supabase path from Step 1).

Show the final Cost Efficiency table with the $/call column filled in.

---

## Step 6: Commit

Ask (AskUserQuestion):
- "Commit this report?" → Yes / No

If Yes: 
- The report is written to two places:
  - Archive: `03_Sales/campaign-reports/CAMPAIGN-REPORT-YYYY-MM-DD.md` (dated, permanent)
  - Latest: `03_Sales/CAMPAIGN-PERFORMANCE-LOG.md` (overwritten each run)
- `git add data/dripify-campaigns.csv data/geo-cost-inputs.csv data/sequence-content.json 03_Sales/CAMPAIGN-PERFORMANCE-LOG.md 03_Sales/campaign-reports/CAMPAIGN-REPORT-YYYY-MM-DD.md`
- Read the campaign count and total leads from the CSV for the commit message
- Commit with message: "Sales: [Month Year] campaign report — [N] campaigns, [N,NNN] leads"

---

## Reference

Full methodology: `03_Sales/CAMPAIGN-REPORT-METHODOLOGY.md`
Data architecture: Dripify UI → `data/dripify-campaigns.csv` + Supabase CSV → `report.py` → `CAMPAIGN-PERFORMANCE-LOG.md`
