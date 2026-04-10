# LinkedIn Campaign Analysis — SI8

**Purpose:** Track campaign performance, calculate ICP conversion ratios, and identify which messages, geographies, and titles produce the best-qualified leads. Updated periodically as campaigns run and new data comes in.

**⚠️ Data flow — READ THIS FIRST:**
This file is the **primary source of truth** for ICP development. LinkedIn responses are live data. Patterns observed here flow UP to the ICP thesis — they do not get defined by it.

```
LinkedIn responses (live)
        ↓
LINKEDIN-CAMPAIGN-ANALYSIS.md  ← YOU ARE HERE (raw data + patterns)
        ↓
CRM.md Section 3 — ICP Analysis  (synthesized thesis, updated from this file)
        ↓
LINKEDIN-CAMPAIGNS-CAAS-V1.md  (targeting filters + campaign playbook)
        ↓
tools/daily-digest/digest.py  (ICP signal check in daily email)
```

See `03_Sales/SALES-INTELLIGENCE-ARCHITECTURE.md` for the full hierarchy and update process.

**Last updated:** April 10, 2026

---

## How to Update This File

1. Pull latest campaign stats from Sales Navigator / outreach tool (per list)
2. Update the raw data table (Section 2) — accepted + response counts change as campaigns progress
3. Re-run the funnel summary (Section 4) — total sent, accepted, responses, good ICP leads
4. Log any new good ICP leads in the ICP lead log (Section 5)
5. Update campaign performance table (Section 3) if new campaigns launched
6. Note any new learnings in Section 7

**Cadence:** Update monthly, or after each major campaign batch completes.

---

## 1. Definitions

### Funnel Stages

| Stage | Definition | How counted |
|-------|-----------|-------------|
| **Leads in list** | Total contacts in the list (including not-yet-sent) | "All leads" in tool |
| **Contacts sent** | Connection requests actually sent (= all leads − blacklisted) | Derived: all leads − BL |
| **Accepted** | Connection accepted | Shown in tool |
| **Responded** | Any reply received (including passes, short replies) | Shown in tool |
| **Good ICP lead** | See definition below | Logged manually in Section 5 |

### Good ICP Lead Definition

A lead qualifies as "good ICP" if they meet ALL of:
1. **Title fit** — Creative Director, Head of Production, VP/Director of Marketing, CMO, or agency owner at a creative/production agency OR brand in-house team
2. **Pain acknowledged** — Replied with acknowledgment of the compliance documentation problem (not just "thanks", not a pass)
3. **Engagement depth** — Asked at least one product-specific question OR offered to talk OR replied to more than one message

Leads that are "interesting but unclear" go into the CRM as warm/lukewarm — they do NOT count as good ICP leads in this analysis unless they progress.

### Campaign Version Classification

| Version | Angle | Notes |
|---------|-------|-------|
| **v3** | Catalog supply (pre-verified AI film library) | Superseded — pivot to v4 March 2026 |
| **v4** | CaaS — Chain of Title verification service ($499/video) | Current model |

---

## 2. Raw Data — All Lists

*Contacts Sent = All Leads − Blacklisted. Acceptance % and Response % calculated on contacts sent.*

### Lilly Hsiao (LH)

| List ID | Campaign | Geo | Title Tier | All Leads | BL | Sent | Accepted | Acc% | Responses | Resp% | Start | Status |
|---------|----------|-----|-----------|-----------|-----|------|----------|------|-----------|-------|-------|--------|
| Owner+_BizCons,Mktg_Sydney_0326B | Vetting Takes Weeks | Sydney | Owner / BizCons+Mktg | 298 | 155 | 143 | 23 | 16.1% | 2 | 1.4% | Mar 5 | Running |
| Mgr+_Mktg_London_0326A | Vetting Takes Weeks | London | Mgr+ Mktg | 99 | 0 | 99 | 22 | 22.2% | 12 | 12.1% | Mar 11 | Running |
| Mgr+_Adv_SPG_0326A | Vetting Takes Weeks | Singapore | Mgr+ Adv | 97 | 0 | 97 | 37 | 38.1% | 5 | 5.2% | Mar 8 | Running |
| Mgr+_Mktg_London_0326E | Documented Provenance | London | Mgr+ Mktg | 299 | 96 | 203 | 45 | 22.2% | 3 | 1.5% | Mar 15 | Running |
| CMO_SPG_0326A | Early Days | Singapore | CMO | 149 | 0 | 149 | 27 | 18.1% | 3 | 2.0% | Mar 27 | Running |
| VP+_Creative_SPG_0426A | Hitting a Wall | Singapore | VP+ Creative | 191 | 0 | 191 | 53 | 27.7% | 10 | 5.2% | Mar 30 | Running |
| VP+_Creative_London_0426C | Blocks AI Campaign | London | VP+ Creative | 199 | 42 | 157 | 8 | 5.1% | 0 | 0.0% | Apr 3 | Running |
| VP+_Creative_SPG_0426B_LH | Hitting a Wall | Singapore | VP+ Creative | 300 | — | — | — | — | 0 | — | Apr 10 | Running |
| **Lilly Total** | | | | **1,632** | **293+** | **1,039+** | **215+** | — | **35** | — | | |

### Ivy Lin (IL)

| List ID | Campaign | Geo | Title Tier | All Leads | BL | Sent | Accepted | Acc% | Responses | Resp% | Start | Status |
|---------|----------|-----|-----------|-----------|-----|------|----------|------|-----------|-------|-------|--------|
| Mgr+_Mktg_London_0326C | Trusted AI Supplier | London | Mgr+ Mktg | 101 | 0 | 101 | 25 | 24.8% | 6 | 5.9% | — | Running |
| Mgr+_Mktg_London_0326D | Vetting Takes Weeks | London | Mgr+ Mktg | 299 | 152 | 147 | 39 | 26.5% | 5 | 3.4% | Mar 14 | Running |
| NA_MetaV_Agency_Gbl_0326A | Hitting a Wall | Global/NA | Agency | 200 | 1 | 199 | 55 | 27.6% | 12 | 6.0% | Mar 27 | Running |
| VP+_Creative_London_0426B | Hitting a Wall | London | VP+ Creative | 299 | 116 | 183 | 37 | 20.2% | 2 | 1.1% | Apr 3 | Running |
| **Ivy Total** | | | | **899** | **269** | **630** | **156** | **24.8%** | **25** | **4.0%** | | |

### Vanessa Pan (VP)

| List ID | Campaign | Geo | Title Tier | All Leads | BL | Sent | Accepted | Acc% | Responses | Resp% | Start | Status |
|---------|----------|-----|-----------|-----------|-----|------|----------|------|-----------|-------|-------|--------|
| Owner+_BizCons,Mktg_SGP_0326A | Trusted AI Supplier | Singapore | Owner / BizCons+Mktg | 299 | 0 | 299 | 85 | 28.4% | 15 | 5.0% | — | Running |
| Mgr+_Mktg_London_0326B | Vetting Takes Weeks | London | Mgr+ Mktg | 101 | 0 | 101 | 23 | 22.8% | 7 | 6.9% | Mar 11 | Running |
| Mgr+_Mktg_London_0326F | Documented Provenance | London | Mgr+ Mktg | 299 | 100 | 199 | 42 | 21.1% | 2 | 1.0% | Mar 16 | Running |
| Mgr+_Mktg_London_0326G | Legal Friction | London | Mgr+ Mktg | 199 | 0 | 199 | 48 | 24.1% | 12 | 6.0% | Mar 27 | Running |
| VP+_Creative_London_0426A | Blocks AI Campaign | London | VP+ Creative | 285 | 106 | 179 | 33 | 18.4% | 5 | 2.8% | Apr 3 | Running |
| **Vanessa Total** | | | | **1,183** | **206** | **977** | **231** | **23.6%** | **41** | **4.2%** | | |

### Grand Total (All Personas)

| | All Leads | Blacklisted | Sent | Accepted | Acc% | Responses | Resp% of Sent | Resp% of Accepted |
|-|-----------|-------------|------|----------|------|-----------|--------------|-------------------|
| **Total** | **3,414** | **768** | **2,646** | **602** | **22.8%** | **101** | **3.8%** | **16.8%** |

---

## 3. Campaign Performance — By Message Angle

*Grouped by campaign message to understand which angle generates the most engagement.*

| Campaign | Version | Angle | Sent | Accepted | Acc% | Responses | Resp% of Sent | Resp% of Accepted | Notes |
|----------|---------|-------|------|----------|------|-----------|--------------|-------------------|----|
| **SI8_Vetting Takes Weeks** | v3 | Catalog speed / pre-verified supply | 587 | 144 | 24.5% | 31 | 5.3% | 21.5% | v3 catalog pitch; highest raw responses |
| **SI8_Trusted AI Supplier** | v3 | White-label supply partner | 400 | 110 | 27.5% | 21 | 5.3% | 19.1% | Good acceptance; strong response rate |
| **SI8_Legal Friction** | v4 | "Client legal team blocking AI video?" | 199 | 48 | 24.1% | 12 | 6.0% | 25.0% | Best response-to-accepted rate; v4 angle |
| **SI8_Hitting a Wall** | v4 | "Client legal teams reject AI over missing docs" | 573 | 145 | 25.3% | 24 | 4.2% | 16.6% | v4 angle; largest campaign; still running |
| **SI8_Early Days** | v4 | "Is AI video still early days for your agency?" | 149 | 27 | 18.1% | 3 | 2.0% | 11.1% | Small sample; neutral opener |
| **SI8_Documented Provenance** | v3/v4 | Liability transfer framing | 402 | 87 | 21.6% | 5 | 1.2% | 5.7% | Weakest performer — provenance framing cold |
| **SI8_Blocks AI Campaign** | v4 | "When legal blocks AI campaign — what's your process?" | 336 | 41 | 12.2% | 5 | 1.5% | 12.2% | Low acceptance; too direct/aggressive opener? |

---

## 4. Funnel Conversion Summary

*As of April 9, 2026. All campaigns still running — numbers will improve.*

### Overall Funnel

```
2,646 contacts sent
   ↓ 22.8% acceptance
  602 accepted connections
   ↓ 16.8% of accepted replied
  101 total responses
   ↓ ~5.9% of responses are good ICP leads
    6 good ICP leads identified
```

### Cost Per Contact

**$0.18 USD per contact sent** (outreach tool cost, April 2026)

### Key Ratios

| Metric | Ratio | Cost (all campaigns) | Cost (optimized batch) |
|--------|-------|---------------------|----------------------|
| **Contacts sent → 1 good ICP lead** | ~441 : 1 | **~$79 per ICP lead** | **~$36 per ICP lead** |
| **Accepted connections → 1 good ICP lead** | ~100 : 1 | — | — |
| **Responses → 1 good ICP lead** | ~17 : 1 | — | — |
| **Acceptance rate** | 22.8% | ~1 in 4 connections accepted | — |
| **Response rate (of sent)** | 3.8% | ~1 in 26 replied at all | — |
| **Response rate (of accepted)** | 16.8% | ~1 in 6 accepted leads replied | — |

*Optimized batch = Legal Friction campaign + Founder/MD title filter + London/Singapore geo.*
*Cost per ICP lead will decrease as campaigns run to completion and ratio improves.*

### By Persona

| Persona | Sent | Accepted | Acc% | Responses | Resp% | Good ICP Leads | Leads per Contact Sent |
|---------|------|----------|------|-----------|-------|---------------|----------------------|
| Lilly (LH) | 1,039 | 215 | 20.7% | 35 | 3.4% | ~3 | ~346 |
| Ivy (IL) | 630 | 156 | 24.8% | 25 | 4.0% | ~1 | ~630 |
| Vanessa (VP) | 977 | 231 | 23.6% | 41 | 4.2% | ~2 | ~489 |

*Good ICP lead attribution is estimated — campaign source not logged in CRM for all leads.*

### By Geography

| Geography | Sent | Accepted | Acc% | Responses | Resp% of Sent |
|-----------|------|----------|------|-----------|--------------|
| London | ~1,378 | ~313 | 22.7% | ~54 | 3.9% |
| Singapore | ~736 | ~202 | 27.4% | ~33 | 4.5% |
| Sydney | 143 | 23 | 16.1% | 2 | 1.4% |
| Global/NA | 199 | 55 | 27.6% | 12 | 6.0% |

### By Title Tier

| Title Tier | Sent (est.) | Responses | Resp% | Notes |
|-----------|-------------|-----------|-------|-------|
| Owner / BizCons+Mktg | ~442 | ~17 | ~3.8% | Mixed — some non-ICP |
| Manager+ Mktg/Adv | ~947 | ~48 | ~5.1% | Volume segment; decent response rate |
| VP+ Creative | ~709 | ~22 | ~3.1% | Right seniority; lower response rate (harder to reach) |
| CMO | 149 | 3 | 2.0% | Small sample; too senior for cold outreach? |

---

## 5. Good ICP Lead Log

*Manual log. Add each lead that reaches "good ICP" status with source campaign if known.*

| CRM ID | Name | Company | Title | Geo | Campaign (est.) | Persona | What they said | Date |
|--------|------|---------|-------|-----|----------------|---------|---------------|------|
| B011 | Hugo Barbera | HumAIn | AI Director | Paris | Hitting a Wall (est.) | Ivy | Initially defensive ("we've never been rejected in 3 years"). Progressed to: "if you can do that report for me, it's interesting with the higher price — we only do it when clients ask and it's time-consuming." **Conversion pathway: outsource existing workflow, not solving a new problem.** Meeting requested week of Apr 21. | Apr 2026 |
| B002 | Theodor Sandu | McCann/Unilever @ Omnicom | Creative Director | London | London Mgr+ (est.) | Lilly | Engaged with sample + Calendly | Apr 2026 |
| B027 | Marc Danielle De Guzman | UnaFinancial | Creative Head | Manila | — | Lilly | "Can see how it could quickly become a blocker" | Apr 2026 |
| B031 | Steve Mcpartland | Visually Sonic | Chief Story Architect | London | VP+Creative London (est.) | Vanessa | "Tell me more" — asked about tools used | Apr 2026 |
| B012 | Ivan Ng | Bacon Creatives | — | Singapore | Singapore (est.) | — | Pivoted to "SI8 as doc layer for my clients" | Apr 2026 |
| B001 | Leimi Zhou | WOMBO | — | — | — | — | AI-native company; product feedback question sent | Apr 2026 |

**Total good ICP leads to date: 6**

---

## 6. Key Learnings

### Full-pool analysis — 107 unique responses (April 10, 2026)

*Sourced from Supabase CSV export. Warm rate = % of responses classified as warm/interested.*

**By campaign (warm rate):**

| Campaign | Responses | Warm | Warm% | Pass+NAF% | Verdict |
|----------|-----------|------|-------|-----------|---------|
| Hitting a Wall | 28 | 6 | **21%** | 11% | Scale |
| Legal Friction | 14 | 2 | **14%** | 43% | Strong pre-qualifier |
| Trusted AI Supplier (v3) | 18 | 1 | 6% | 22% | Retire |
| Vetting Takes Weeks (v3) | 27 | 1 | 4% | 22% | Retire |
| Blocks AI Campaign | 9 | 0 | 0% | 44% | Kill |
| Documented Provenance | 6 | 0 | 0% | 17% | Kill |
| Early Days | 2 | 0 | 0% | 50% | Kill |

**By message number (which message triggered the response):**

| Message | Responses | Warm | Warm% | Pass+NAF% |
|---------|-----------|------|-------|-----------|
| #1 | 48 | 4 | 8% | 21% |
| #2 | 34 | 0 | 0% | 35% |
| **#3** | **11** | **4** | **36%** | **0%** |
| #4 | 5 | 0 | 0% | 20% |

**Message 3 is the standout.** People who stay engaged to message 3 convert to warm at 36%. Message 2 is the worst — 35% pass rate, 0% warm. The 4-message sequence is working as a filter, not just a follow-up tool. Do not shorten the sequence.

**By alias:**

| Alias | Responses | Warm | Warm% | Pass+NAF% |
|-------|-----------|------|-------|-----------|
| Ivy | 27 | 4 | **15%** | 19% |
| Vanessa | 43 | 4 | 9% | 30% |
| Lilly | 35 | 2 | 6% | 20% |

Ivy is the best performing alias. Vanessa has the highest pass+naf rate.

**By geography:**

| Geo | Responses | Warm | Warm% | Pass+NAF% |
|-----|-----------|------|-------|-----------|
| Singapore | 23 | 2 | **9%** | **13%** |
| London/UK | 52 | 3 | 6% | 31% |
| France/Paris | 3 | 1 | 33% | 0% |
| India | 3 | 0 | 0% | 0% |

Singapore has a much better pass ratio than London (13% vs 31%).

**By title:**

| Title | Responses | Warm | Warm% | Pass+NAF% |
|-------|-----------|------|-------|-----------|
| AI Director | 3 | 1 | **33%** | 0% |
| Creative Director | 13 | 2 | **15%** | 31% |
| Founder/Co-Founder | 24 | 2 | 8% | 29% |
| Managing Director | 6 | 0 | 0% | 33% |
| Director (other) | 18 | 0 | 0% | **39%** |

Director (other) is dead weight — 0% warm, 39% pass+naf. These are media directors, PR directors, commercial directors getting through the filter. Remove this group explicitly.

---

### What's working
- **Hitting a Wall** is the clear best campaign — 21% warm rate from those who respond
- **Message 3** converts warm at 36% — people who stay to message 3 are genuinely interested; the sequence is a funnel
- **Ivy alias** outperforms on warm rate (15%) despite lowest volume
- **Singapore** has better warm:pass ratio than London
- **3rd conversion pathway confirmed (April 10):** Hugo Barbera (AI Director, HumAIn) progressed from defensive ("we have our own process") to "if you can do that report for me, it's interesting at the higher price — it's time-consuming." Distinct buyer motivation: **outsource existing compliance workflow**, not solve a new problem.

### What's not working
- **Blocks AI Campaign:** 0% warm rate, 44% pass+naf — kill
- **Documented Provenance + Early Days:** 0% warm — kill
- **Vetting Takes Weeks + Trusted AI Supplier:** v3 campaigns, 4-6% warm — retire
- **Director (other) title tier:** 0% warm, 39% pass+naf — tighten exclusion list (Media Director, PR Director, Commercial Director, Partnerships Director, Operations Director)
- **Sydney:** 1.4% response rate — pause confirmed

### Message angle ranking (v4 only, warm rate from full-pool CSV)
1. **Hitting a Wall** — 21% warm rate ← **scale this**
2. **Legal Friction** — 14% warm rate, 43% pass+naf (strong pre-qualifier; self-selects fast)
3. Blocks AI Campaign — 0% warm ← kill

---

## 7. Open Questions / Next Analysis

- [x] **Attribution gap RESOLVED:** Supabase CSV export has campaign name + alias on every row. CRM is warm/active leads only — full response log lives in CSV. Export every 1-3 days for analysis.
- [ ] **Cost per lead:** Add outreach tool monthly cost and calculate $ per good ICP lead once known.
- [ ] **v4 vs v3 ICP quality:** Do v4-message leads convert at a higher rate to qualified conversations? Track separately as more v4 campaigns complete.
- [ ] **Title tier validation:** VP+ Creative has lower response rate but may produce better ICP quality leads. Track separately.
- [ ] **Manila signal:** Marc Danielle came from outside the core London/Singapore target. Investigate whether Manila deserves its own campaign list.
- [ ] **Follow-up sequence performance:** Currently tracking first-message acceptance and total responses. Add breakdown by message number (which message in the 4-msg sequence triggered the reply?).
- [ ] **Blocks AI Campaign retirement decision:** April 10 data confirms poor lead quality from this campaign even when they accept. Decide: retire, rewrite opener, or test one more batch before retiring.
- [ ] **Outsource workflow segment:** Hugo Barbera's conversion reveals a segment — agencies that currently produce their own compliance reports. These contacts will answer "no" to "do you have this problem?" because they've solved it themselves. Need a different opener: "Are you currently producing Chain of Title documentation for your AI video clients — and is that a workflow you'd consider outsourcing?" Consider a targeted campaign to AI Director / AI Practitioner titles.
- [ ] **David Tamayo (Prose on Pixels, France) probe:** Creative AI Director, "big network with Legal team dedicated to AI," aware of US vs. global law differences. Replied defensively (similar to Hugo's initial pattern). EU AI Act follow-up sent April 10 — track response. If he engages, France/EU is validating as a real test batch territory.

---

## 8. Methodology Notes

- **Acceptance rate** = accepted connections / contacts sent (not / all leads in list)
- **Response rate** = responses / contacts sent (not / accepted)
- **Contacts sent** = all leads in list − blacklisted (blacklisted = filtered out before send, usually due to Sales Navigator criteria mismatch or tool rules)
- **Good ICP lead** = manually assessed, see Section 1 definition — not the same as "warm reply" or "not a pass"
- All campaigns still running as of this update — ratios will improve as in-progress leads complete the sequence
- Numbers rounded to nearest whole; percentages rounded to 1 decimal place
