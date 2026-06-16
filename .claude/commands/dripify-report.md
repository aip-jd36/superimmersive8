Run the SI8 monthly Dripify LinkedIn campaign performance report wizard.

Walk the user through all steps below using your tools. Use AskUserQuestion for structured choices. For numeric inputs, ask in plain text and process the reply.

**Report purpose (v2):** Two goals in priority order:
1. **Find the beachhead** — the tightest ICP cluster with the highest conversion signal and enough addressable market to build on
2. **Find the GTM move** — which segment to concentrate on next cycle, what to say, and which regulatory/research trigger to lead with

Cost efficiency ($/call) is still tracked but is now one input to the beachhead analysis, not the headline output.

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
3. By Sequence table — note which sequences are producing the highest warm % and which are producing primarily passes or minimal replies

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

## Step 6: Discovery Signal Review + Trigger Classification

Read `03_Sales/DISCOVERY-PERFORMANCE-LOG.md`. Parse the `## Discovery Signal Checklist` section.

Also read `03_Sales/outreach/SPLIT-TEST-LOG.md` — you'll need the active test hypotheses and B-ID assignments for flagging.

Display each lead as a numbered entry with a pre-classification:

```
[N] [CLASS]  Name · Title · Company
      Geo: GeoName
      Trigger: [T1 — Already Being Asked / T2 — Product Curiosity / T3 — Already Building / ?]
      Split test: [confirms Test X / disconfirms Test X / no active test match]
      "excerpt from reply..."
```

**Trigger classification rules (pre-label before JD confirms):**
- **T1** — reply contains: explicit "yes, clients/legal are asking", "required to", "demanding", "becoming standard", "they want documentation", "blocked", "held up", regulated-sector mention + documentation language
- **T2** — reply contains: "how does it work", "what does it cover", "can I see an example", "what do you look for", "how much", curiosity without urgency
- **T3** — reply contains: "I already have", "we built", "I'm working on something", "I have a solution", "we track this internally", competitor-building language
- **?** — unclear; flag for JD to classify

**Split test cross-reference rules:**
- T1 reply from a lead with **regulated-sector client exposure** (finance, pharma, legal, insurance context) → "confirms Test A (regulated-sector hypothesis)"
- Reply from a Business Affairs / Broadcast Affairs / Line Producer / EP title → "confirms Test B / Test 9 (BA-ops ICP)"
- Reply that mentions documentation blocking a campaign or approval → "confirms Test C (blocker hypothesis)"
- Reply that describes an informal/workaround process → "confirms Test E (current-solution probe)"
- Reply citing EU Act in a way that suggests labeling/disclosure expectation (not Chain of Title) → "⚠️ EU Act framing mismatch — see Test 5 watch"
- Reply mentioning NY Law, ASA, or brand legal requirement → flag for regulatory signal tracker (Step 7)

Ask the user: "Add to Discovery Pipeline (e.g. 1,3,5  /  all  /  none)"

For each selected lead, append a row to the Signal table in `03_Sales/DISCOVERY-PIPELINE.md`:
- Columns: Lead | Title | Company | Geo | Sales Class | Campaign | Key insight excerpt | Added
- Update the `## Signal (N)` count

After adding, show a brief summary:
- How many T1 / T2 / T3 signals were added this cycle
- Which split tests received confirming/disconfirming data points

Remind the user: full conversations are in `03_Sales/DISCOVERY-PERFORMANCE-LOG.md`.

---

## Step 7: Split Test + Research Synthesis

This step integrates the split test log with regulatory research to answer: **"What have we learned this cycle, and does it match what the research predicts?"**

### 7A: Split Test Status Update

Read `03_Sales/outreach/SPLIT-TEST-LOG.md`. For each **active test** (currently: A, B, C, D, E, 5, 7, 8, 9):

1. List all B-IDs assigned to that test (from the test's lead tables)
2. Check the Supabase CSV: has any assigned lead replied this cycle? (match by name or B-ID noted in CRM)
3. Classify new replies by variant and trigger type

Display a test status table:

```
| Test | Hypothesis | Leads assigned | Replies this cycle | Status | Verdict |
|------|-----------|----------------|-------------------|--------|---------|
| A    | Regulated-sector exposure = ICP discriminant | N | N | Active / Confirmed / Disconfirmed / Insufficient data | — |
| B    | BA/ops titles feel this as operational today | N | N | ... | — |
| C    | "Has it blocked you?" separates buyers from aware | N | N | ... | — |
| D    | Pre vs. post production timing framing | N | N | ... | — |
| E    | Current-solution probe converts faster than pitch | N | N | ... | — |
| 5    | EU Act sequence (France + London/FinServ) | N | N | ... | — |
| 7    | Who's Asking: research frame vs. validation frame | N | N | ... | — |
| 8    | Pre-approval pitch framing | N | N | ... | — |
| 9    | Clearance Pro: pure probe vs. probe + product hint | N | N | ... | — |
```

Status definitions:
- **Confirmed** — 3+ replies consistently support the hypothesis
- **Disconfirmed** — replies consistently contradict the hypothesis
- **Insufficient data** — fewer than 3 replies in either variant
- **Active** — running but no new data this cycle
- **Retire** — hypothesis answered or invalidated; recommend closing

For any test with **Confirmed** status, note the specific data points (lead name, quote, B-ID) that confirmed it.
For any test with **Disconfirmed** status, note what the data actually showed and propose a revised hypothesis.

Ask: "Any test status changes to make manually? (e.g. a reply you received outside the Supabase export)" — update SPLIT-TEST-LOG.md Cumulative Learnings section if yes.

### 7B: Research-Reality Gap Check

Read the following three research files:
- `01_Business/research/ASA-IAB-2026-AI-CONTENT-RESEARCH.md`
- `01_Business/research/NY-SYNTHETIC-PERFORMER-LAW-2026.md`
- `01_Business/research/BUYER-ANALYSIS-2026-06.md`

Cross-reference against reply language from the Supabase CSV this cycle. Specifically check:

**EU Act accuracy check:**
Scan reply text for "EU Act", "AI Act", "Article 50", "August 2", "August deadline". For any lead citing EU Act:
- Did they describe a Chain of Title / IP documentation need? (correct fit for SI8)
- Did they describe a labeling/disclosure need? (Article 50 mismatch — SI8 does not solve this)
- Flag mismatches: these are leads attracted by wrong framing who will churn or ghost after the sample

**NY Law signal check:**
Scan for "NY", "New York", "synthetic performer", "S.8420". Did any US leads cite this law? If yes: confirm they are production-side (agencies, studios) not entertainment-side (talent agencies, unions — wrong ICP).

**Regulated-sector confirmation:**
Scan for "finance", "pharma", "insurance", "healthcare", "legal", "bank", "regulated". Count mentions per geo. Cross-reference against Test A hypothesis (regulated-sector client exposure = ICP discriminant).

**Buyer Analysis alignment:**
From `BUYER-ANALYSIS-2026-06.md`, check: which of the 5 market drivers are showing up in reply language this cycle? (Client pressure / regulatory requirement / brand liability / competitive differentiation / internal policy). Note which driver is most cited — this should inform the primary message hook for next cycle.

Output a 5-bullet synthesis:
```
Research-Reality Synthesis:
• EU Act framing: [X leads cited Act correctly / Y leads cited labeling mismatch / hook accuracy: N%]
• Regulated-sector signal: [top sectors mentioned, top geos]
• Dominant buyer driver: [which of the 5 drivers appears most in reply language]
• NY Law: [any US signal? production-side or entertainment-side?]
• Research gap: [anything the research predicts that is NOT showing up in reply language yet]
```

---

## Step 8: Sales Pipeline Sync

Ask the user: "Any sales pipeline stage updates? Enter B-ID:Stage pairs (e.g. B050:Call Scheduled, B042:Evaluating) or press Enter to skip."

Valid stages: Lead Replied · Warm Lead · Call Requested · Call Scheduled · Call Taken · Evaluating · Creator Submitted · Rights Verified Submitted · Lost

**Do NOT update CRM.md.** All stage changes go into `03_Sales/SALES-PIPELINE.md` only.

For each pair provided:
1. Look up the lead's name, company, and geo from `03_Sales/CRM.md` (read-only reference).
2. Add or move the lead row into the correct stage section of `03_Sales/SALES-PIPELINE.md` (between `<!-- sales-pipeline:start -->` and `<!-- sales-pipeline:end -->`).
3. Update the stage section count (e.g. `## 3. Call Requested (0)` → `## 3. Call Requested (1)`).
4. If the lead already exists in an earlier stage section, remove it from there before adding to the new one.

Use the column structure defined in each stage section. Fill in what's available from CRM context; use `—` for unknowns.

### Call Taken — additional step

If any lead moves to **Call Taken**, ask: "Do you have a call transcript for [lead name]?"

If yes:
1. Ask for the transcript path (or confirm it's in `03_Sales/transcripts/`).
2. Read the transcript and generate a call note at `03_Sales/call-notes/CALL-YYYY-MM-DD-BXXX-Name.md` using this structure:
   - Header: date, duration, participants, B-ID, transcript path
   - ICP Verdict (fit / not fit + 1-line reason)
   - Summary (2-3 sentences)
   - Key Signals (bullets)
   - Objections Heard (bullets)
   - Product Feedback / Discovery Notes
   - Next Steps (checkboxes)
   - Re-engage Trigger (if nurture)
3. Update the `CRM.md` entry to add `Call notes: 03_Sales/call-notes/CALL-YYYY-MM-DD-BXXX-Name.md` in the notes field.
4. Update the `SALES-PIPELINE.md` card: condense to 2-3 line verdict + link `→ [Call notes](call-notes/CALL-YYYY-MM-DD-BXXX-Name.md)`.

If no transcript: note "No transcript — verbal notes only" in the pipeline card and ask JD to add a brief summary to the call note file manually.

---

## Step 9: Beachhead + GTM Analysis

This is the primary strategic output of the report. It synthesizes everything from Steps 4–7 into a single answer: **who is the beachhead, how big is that market, and what is the GTM move for next cycle?**

Read:
- `03_Sales/SALES-PIPELINE.md` (Warm Lead + Call Requested sections — these are the conversion signals)
- `03_Sales/CRM.md` (title and company detail)
- The split test status from Step 7
- The research synthesis from Step 7
- The previous ICP analysis in `03_Sales/pipeline-analysis/` (most recent file)

### Analysis Framework

**Section 1: Signal Quality Map**

For all leads in Warm Lead + Call Requested, build a cross-tab:

| Geo | T1 (In pain) | T2 (Curious) | T3 (Building) | Total | T1% |
|-----|-------------|-------------|--------------|-------|-----|
| London/UK | N | N | N | N | N% |
| Dubai/UAE | ... | ... | ... | ... | ... |
| Germany | ... | ... | ... | ... | ... |
| etc. | ... | ... | ... | ... | ... |

Then by title cluster:

| Title cluster | T1 | T2 | T3 | Total | T1% |
|--------------|----|----|-----|-------|-----|
| Founder/MD/CEO (boutique) | ... | ... | ... | ... | ... |
| Creative Director | ... | ... | ... | ... | ... |
| Senior Production Specialist | ... | ... | ... | ... | ... |
| Gen AI Specialist (holdco) | ... | ... | ... | ... | ... |
| BA/Clearance/Ops title | ... | ... | ... | ... | ... |
| Other | ... | ... | ... | ... | ... |

**The beachhead is the intersection of the highest T1% geo AND the highest T1% title cluster with at least 3 leads.** Name it explicitly.

**Section 2: Message Effectiveness**

From the Supabase CSV and `DISCOVERY-PERFORMANCE-LOG.md`, identify which sequences and message numbers are generating T1 replies (not just any reply).

- Which sequence has the highest T1 reply % (not just reply %)?
- Which message number in the sequence generates the richest replies? (Msg 1 hook replies vs. Msg 2/3 follow-up replies often differ in quality)
- Which opening hook produced the most explicit pain signals? (EU Act / NY Law / ASA / CarFax / client-pull — based on campaign + reply language correlation)

Note: if the data doesn't support this breakdown yet, state what data is needed (e.g., need to tag reply quality by campaign in the CSV).

**Section 3: Beachhead Cluster Definition + TAM**

Based on Sections 1 and 2, write the tightest possible description of the beachhead ICP:

```
Beachhead ICP (as of YYYY-MM-DD):
Title: [specific title or title cluster]
Company type: [boutique AI studio / holdco arm / etc.]
Geo: [specific city or country]
Trigger: [what makes them T1 — what external force is making documentation mandatory for them]
Decision: [who buys, does it require approval, what's the price point]
Velocity: [how quickly do they move from warm reply to call request based on observed data]
```

Then estimate TAM for this cluster using the available data:

**Bottom-up TAM estimate:**
- From `data/dripify-campaigns.csv`: how many leads in campaigns targeting this ICP profile (title + geo + company type filter)?
- Acceptance rate for those campaigns (from Dripify data)
- Warm reply rate for those accepted leads
- Extrapolate: if we ran at full Sales Navigator scale, how many warm leads per campaign cycle?
- Revenue estimate: warm leads × historical conversion rate (warm → call → close) × $499

State TAM clearly as a range with assumptions visible. Example:
```
TAM estimate (UK boutique AI studio founders, 1-20 people):
- Estimated LinkedIn profiles matching: ~800-1,200 (Sales Navigator)
- Acceptance rate at current volume: ~35%
- Warm reply rate of accepted: ~15%
- Estimated warm leads at full saturation: 40-60 per campaign cycle
- At 10% warm→close conversion: 4-6 deals per cycle × $499 = $2,000-$3,000/cycle
- At 20% warm→close: 8-12 deals = $4,000-$6,000/cycle
- Beachhead TAM (addressable in Year 1 with current playbook): ~$30-50K
```

Note: cross-reference against `01_Business/research/BUYER-ANALYSIS-2026-06.md` for any broader TAM framing that should inform this estimate.

**Section 4: Regulatory Signal Tracker**

From the Step 7 research-reality check, display what regulation is showing up in reply language:

| Regulatory trigger | Times cited in replies (this cycle) | Geo concentration | Fit with SI8 product? |
|-------------------|-------------------------------------|-------------------|----------------------|
| EU AI Act (general) | N | UK, Germany | ⚠️ Partial — Article 50 = labeling, not Chain of Title |
| EU AI Act → client/brand legal pressure | N | UK | ✅ Correct fit |
| ASA/CAP Code | N | UK | ✅ Correct fit |
| NY Synthetic Performer Law | N | USA | ✅ Correct fit |
| "Client legal team is asking" (no law cited) | N | All geos | ✅ Strongest signal |
| "Regulated sector" (finance/pharma/legal) | N | UK, Dubai | ✅ Test A confirming |

**Framing accuracy rate:** What % of EU Act mentions are correctly framed (client/brand legal pressure) vs. incorrectly framed (labeling/disclosure expectation)? If below 70%, recommend revising EU Act hook in active sequences.

**Section 5: Split Test Integration**

Pull the test status table from Step 7. Summarize:
- Which tests are confirmed this cycle and what they mean for targeting
- Which tests are disconfirmed and what that means for the approach
- Which tests need more data (and what's blocking them — list build, alias issue, not enough replies)
- Recommended test to retire and recommended new test to launch next cycle

**Section 6: Competitive Signal**

From T3 leads in the pipeline and discovery data, map the competitive landscape:

| Lead | Company | What they're building / using | Implication |
|------|---------|------------------------------|-------------|
| [Name] | [Co] | [Description] | Competitor / Partner / Upgrade buyer |

Cross-reference with `01_Business/research/COMPETITIVE-ANALYSIS-AI-VIDEO-MARKETPLACE-2026.md` and `01_Business/research/COMPETITIVE_ANALYSIS_CAAS_2026.md`. Note any new players mentioned in replies that don't appear in the research files.

**Section 7: 30-Day GTM Recommendation**

Based on Sections 1–6, produce a single concrete GTM move for the next cycle:

```
NEXT 30 DAYS — GTM RECOMMENDATION

Concentrate on: [specific ICP cluster from Section 3]

Why: [2-sentence reason — what the T1 data + regulatory clock says]

Message hook: [which regulatory trigger or pain framing to lead with, based on Section 4]

Campaign to launch: [geo, title filter, sequence, alias, target volume]

Test to run: [the single most important open question to answer next cycle]

Test to retire: [what to stop and why]

Leads to prioritize this week (from current pipeline):
1. [Lead name, B-ID] — [reason]
2. [Lead name, B-ID] — [reason]
3. [Lead name, B-ID] — [reason]
```

**Section 8: Compare to Previous Analysis**

Read the most recent file in `03_Sales/pipeline-analysis/`. Note:
- Which trends are holding (cite specific data from both cycles)
- Which have changed or reversed
- What's new this cycle that wasn't present before
- Whether open questions from last cycle have been answered

**Section 9: Open Questions for Next Analysis**

Carry forward unanswered questions from the previous analysis. Add new questions surfaced this cycle. Format as checkboxes with a brief note on what data would answer each question.

### Output

Save the full analysis as:
`03_Sales/pipeline-analysis/PIPELINE-ICP-ANALYSIS-YYYY-MM-DD.md`

Before saving, show the user a 3-bullet executive summary:
- Beachhead cluster (one sentence)
- Top split test finding (one sentence)
- GTM recommendation for next 30 days (one sentence)

---

## Commit

Ask (AskUserQuestion):
- "Commit this report?" → Yes / No

If Yes:
- `git add data/dripify-campaigns.csv data/geo-cost-inputs.csv data/sequence-content.json 03_Sales/CAMPAIGN-PERFORMANCE-LOG.md 03_Sales/DISCOVERY-PERFORMANCE-LOG.md 03_Sales/DISCOVERY-PIPELINE.md 03_Sales/SALES-PIPELINE.md 03_Sales/CRM.md 03_Sales/outreach/SPLIT-TEST-LOG.md 03_Sales/campaign-reports/CAMPAIGN-REPORT-YYYY-MM-DD.md 03_Sales/discovery-reports/DISCOVERY-REPORT-YYYY-MM-DD.md 03_Sales/pipeline-analysis/PIPELINE-ICP-ANALYSIS-YYYY-MM-DD.md`
- Read the campaign count and total leads from the CSV for the commit message
- Commit with message: "Sales: [Month Year] campaign report — [N] campaigns, [N,NNN] leads"

---

## Reference

Full methodology: `03_Sales/CAMPAIGN-REPORT-METHODOLOGY.md`
Data architecture: Dripify UI → `data/dripify-campaigns.csv` + Supabase CSV → `report.py` + `discovery_report.py` → `CAMPAIGN-PERFORMANCE-LOG.md` + `DISCOVERY-PERFORMANCE-LOG.md`
Split test log: `03_Sales/outreach/SPLIT-TEST-LOG.md` — active tests: A, B, C, D, E, 5, 7, 8, 9
Research files: `01_Business/research/` — ASA-IAB, NY Law, Buyer Analysis, Competitive Analysis
Pipeline ICP analysis: `03_Sales/pipeline-analysis/` — dated files, one per report cycle
