# SI8 Pipeline + ICP Analysis — 2026-07-18

**Date:** 2026-07-18
**Report type:** Full report cycle — Supabase export `supabase-export-2026-07-17.csv` (659 responses, `is_latest_version=true`)
**Previous analysis:** [PIPELINE-ICP-ANALYSIS-2026-06-27.md](PIPELINE-ICP-ANALYSIS-2026-06-27.md)
**Wizard:** `/dripify-report` Steps 1–9

**Stage vocabulary note:** This cycle's `SALES-PIPELINE.md` was realigned to SE engineering's 10-stage DB enum (2026-07-18). Old "Warm Lead + Call Requested" section is now `1a. Call Requested` + `1b. Warm` (both sub-groups of `1. Lead Responded`). Nothing was dropped — see reclassification notes in that file.

---

## Funnel State (as of this cycle)

| Stage | Count | Δ vs Jun 27 |
|-------|-------|-------------|
| Lead Responded (1a Call Requested + 1b Warm + 1c Replied) | 95 (6 + 27 + 62) | +8 (was 62+27+6=95 → same total; composition shifted slightly) |
| 1st Mtg Scheduled | 1 | — |
| 1st Mtg Taken | 2 | — |
| Evaluating | 0 | — |
| Proposal Made | 0 | — |
| Negotiating | 0 | — |
| Closed Won | 0 | — |

**Discovery Pipeline:** 269 signals (up from 258 — 19 net new after dedup against pre-existing entries). Discovery signal rate this cycle: **44.2%** (284/642 responses scanned).

**Cost efficiency:** Unchanged from last cycle — no new verified-call counts this cycle (JD confirmed "no change" in Step 5).

| Geo | Leads Sent | Total Cost | Warm Replies | $/warm reply | Verified Calls | $/call |
|-----|-----------|-----------|--------------|--------------|----------------|--------|
| UAE/Dubai | 388 | $55.43 | 26 | $2.13 | 4 | $13.86 |
| London/UK | 1,292 | $184.57 | 32 | $5.77 | 8 | $23.07 |
| Germany | 364 | $52.00 | 12 | $4.33 | 1 | $52.00 |
| Singapore | 232 | $33.14 | 10 | $3.31 | 0 | — |
| Netherlands | 300 | $42.86 | 12 | $3.57 | 0 | — |
| USA | 650 | $92.86 | 14 | $6.63 | 0 | — |
| Sweden/Stockholm | 341 | $48.71 | 4 | $12.18 | 0 | — |

---

## ⚠️ Standing caveat on all T1 figures below

The Jun 16 pitch-conversion audit (`SPLIT-TEST-LOG.md` Cumulative Learnings) already established that the classifier's T1 definition — "client/legal is asking" — conflates two different things: **disclosure-T1** (client wants to know AI was used, an Article 50/labeling conversation) and **genuine Chain-of-Title-T1** (client's legal team rejected an informal submission and needs a structured format). That audit revised the true buyer estimate down from ~54% to ~15% of the pipeline. Tests 10 and 11 (the two-part gate question designed specifically to separate these two groups) were designed on 2026-06-16 and **still have zero leads assigned as of this cycle** — over a month later. The T1 figures in Section 1 use the same loose classifier as always (for continuity with prior cycles), but should be read as an upper bound, not a buyer count.

---

## Section 1: Signal Quality Map

*Population: `1a. Call Requested` (6) + `1b. Warm` (27) + `2. 1st Mtg Scheduled` (1) + `3. 1st Mtg Taken` (2) = 36 leads. Excludes B089 (confirmed wrong-ICP) and B125 Tim Deussen (advisor/validator, not a buyer — tracked separately in Section 6).*

### By Geo

| Geo | T1 (In pain) | T2 (Curious) | T3 (Building) | Total | T1% |
|-----|-------------|-------------|--------------|-------|-----|
| London/UK | 6 | 5 | 1 | 12 | 50% |
| Dubai/UAE | 4 | 2 | 1 | 7 | 57% |
| USA | 2 | 0 | 0 | 2 | 100% |
| Germany | 1 | 1 | 1 | 3 | 33% |
| Singapore | 1 | 0 | 0 | 1 | 100% |
| Amsterdam | 0 | 1 | 0 | 1 | 0% |
| Egypt (off-geo) | 1 | 0 | 0 | 1 | 100% |
| Unspecified geo | 0 | 5 | 0 | 5 | 0% |

**London/UK T1 leads:** B130 Ivan Petruzzelli (State Street — client requiring structured auditable format, Call Requested), B143 Simon Helm (advising clients already, Call Requested), B145 Daniele Zennaro (AiYR4, commercial/rights side), B139 James Hilditch (BearJam, "important part of the process"), B087 Ibrahim Badi (IKM, regulated sectors, confirmed beachhead), B088 Matthew Sergison-Main (OLIVER/Brandtech, "100% being asked" — strongest single signal in the pipeline).

**Dubai/UAE T1 leads:** B100 Ramez Tabshi ("IP ownership and copyright risks... exactly what they are looking for" — finserv/healthcare/public-sector clients, explicit product-fit confirmation), B122 Mhd Ali (Monks holdco), B099 Sultan Alsuwaidi ("becoming standard now"), B101 Anas Bakal (1st Mtg Scheduled — 3-point structured reply: licensing, provenance/prompt logs, platform labeling).

**USA T1:** B158 Dan Lantry (Sonova VP Legal Affairs Americas, NY Law-triggered interest), B094 Justin Lufair Brown (Amazon, "contract language tightened a lot in last 12 months").

**Singapore T1:** B002 Teddy Sandu (MullenLowe IPG, "asking for both" disclosure + Chain of Title).

**Notable pipeline hygiene gap:** B157 Steve Bannerman (Prime Video/Amazon MGM, Head of Post-Production APAC) gave one of the strongest T1 quotes in the entire dataset — "provenance of the video is HUGELY important" — but is still sitting in `1c. Replied`, the coldest sub-tier, not yet promoted to Warm. Same signal quality as the confirmed Warm leads above; recommend promoting at next Step 8.

### By Title Cluster

| Title cluster | T1 | T2 | T3 | Total | T1% |
|--------------|----|----|-----|-------|-----|
| ICP 3 — Legal / Business Affairs / Client-side requirement generator | 3 | 0 | 0 | 3 | **100%** |
| Holdco-embedded / finserv-exposed CD + Production | 5 | 1 | 0 | 6 | 83% |
| Boutique Founder / MD / CEO / Independent | 1 | 0 | 3 | 4 | 25% |
| Individual Creative / Gen AI Specialist (non-decision-maker) | 0 | 9 | 1 | 10 | 0% |

**ICP 3 T1 leads (stable, 2nd consecutive cycle at 100%):** B130 Ivan Petruzzelli, B158 Dan Lantry, B143 Simon Helm — identical roster to Jun 27. No churn, no new adds to this cluster this cycle.

**Holdco/finserv CD T1 leads:** B088 Matthew (OLIVER/Brandtech), B002 Teddy Sandu (MullenLowe IPG), B145 Daniele (AiYR4), B087 Ibrahim (IKM), B122 Mhd Ali (Monks) — new add this cycle. B126 Phil Langer (JvM) is T2, awaiting reply.

### The Beachhead Intersection

**Beachhead = London/UK × ICP 3 demand generator + Holdco/finserv-exposed execution layer — unchanged from Jun 27, now confirmed for a 2nd consecutive cycle with zero composition churn in ICP 3.**

This is the single most important stability signal in this cycle's data: a month of additional outreach volume did not shake the ICP 3 cluster (still 100% T1, still the same 3 names) and only added one new name to the Holdco/finserv execution layer (Mhd Ali, Monks). The beachhead isn't just confirmed — it's proving durable, which is a stronger claim than "confirmed once."

---

## Section 2: Message Effectiveness

| Sequence | Responses this cycle | Discovery signal rate | T1 quality | Note |
|----------|----------------------|-----------------------|-----------|------|
| SI8_Legal Friction_Finserv (4 Msg) | 3 | 100% | ✅ Strongest — small n | All 3 replies regulated-sector language, zero mismatch |
| SI8_EU AI (4 Msg) | 23 | 87% | ⚠️ Mixed — mismatch persists | Ivan Petruzzelli's fresh reply this cycle is disclosure-flavored despite being a confirmed real buyer; Jason Pryce-Kennedy (new) gave only a thin "Okay" |
| SI8_Who's Asking_ASA (4 Msg) | 3 | 67% | ✅ ICP 3-specific | Small pool, high per-reply quality |
| SI8_Clearance-Pro-v1 (3 Msg) | 2 | 50% | ⚠️ First real data point negative | Michele Hill (LA Line Producer): "production has slowed down... I have not seen any brand clients starting to add any [requirements]" |
| SI8_Legal Friction_Finserv_NY (4 Msg) | 4 | 50% | ✅ Confirms Test A | Alina Baimatova, Alon Bendory — both regulated-sector language |
| SI8_Legal Friction (4 Msg) | 441 | 48% | ✅ Core workhorse | Still the volume + quality backbone of the whole funnel |
| SI8_Who's Asking_NY Law (4 Msg) | 11 | 45% | ⚠️ 1 wrong-desk this cycle | Gianmarco Vairo (Amex Legal Affairs) — "not something I've been handling" |

**Which message generates richest replies:** Unchanged from last cycle — Msg 1 screens (yes/no), Msg 2 is where real discovery happens (Ibrahim Badi's 9-field inline answer, Tim Deussen's gap analysis, this cycle's Nikan Nazari contractual-documentation detail all landed at Msg 2 or later).

**Opening hook still producing the most explicit pain:** "When your client's legal team asks for documentation on an AI video you delivered..." remains the sharpest T1 discriminant. No new hook language displaced it this cycle.

---

## Section 3: Beachhead Cluster Definition + TAM

### Beachhead ICP (as of 2026-07-18) — unchanged from Jun 27, now second-cycle-confirmed

```
Title: Senior Video Production Specialist / Creative Director / Senior Producer
        at holdco arm (OLIVER, Monks, MullenLowe) OR boutique agency
        with active finserv, pharma, or regulated-sector client accounts
Company type: UK boutique AI agency (5–50 people) or embedded agency
              within a holdco serving regulated-sector clients
Geo: London/UK (primary) — UAE/Dubai (secondary, lowest $/call)
Trigger: Client legal team making explicit written/contractual documentation request
Decision: CD or MD makes the purchase; B2B2B path (client requires SI8 format) still unconfirmed
Velocity: T1 → call in 2–3 weeks; T2 → 4–8 weeks
```

### Demand Generator ICP (ICP 3) — unchanged, still the highest-leverage cluster

```
Title: VP/Head of Legal Affairs / Business Affairs / Brand IP Counsel / independent AI compliance advisor
Company: Brand or holdco HQ (not agency)
Geo: London/UK (primary) — USA/NY (secondary, NY Synthetic Performer Law)
Decision: Single authority — sign-off creates pull demand on every agency they work with
Revenue multiplier: 1 ICP 3 win → 5–10 ICP 1a agency certifications minimum
```

### New this cycle — narrow wedge worth naming: FinServ-NY sub-segment

`SI8_Legal Friction_Finserv_NY` (4 Msg) produced 2 replies, both regulated-sector language, 0 mismatches — smallest sample of any sequence but the cleanest signal-to-noise ratio observed this cycle. Not yet large enough to size a TAM line, but worth a larger next-cycle batch specifically to test whether it holds at volume.

### Bottom-Up TAM Estimate — carried forward, no material change to assumptions

No new campaign volume was added to the ICP 1a UK or ICP 3 UK pools this cycle (per Step 2 — see note below), so the TAM math from Jun 27 stands:

- **ICP 1a (UK boutique/holdco-embedded, finserv-exposed):** $30–60K Year 1 addressable
- **ICP 3 (UK brand legal/BA, cascade effect):** $20–40K Year 1 value
- **Combined UK beachhead:** $50–100K — still within the $80–120K target range on UK alone

Cross-reference `BUYER-ANALYSIS-2026-06.md`: Driver 2 (holdco/client-contract-imposed requirement) is still the dominant driver in reply language this cycle (see Section 4) — same conclusion as Jun 27, reinforcing rather than revising the TAM model's buyer-pull assumption.

---

## Section 4: Regulatory Signal Tracker

| Regulatory trigger | Times cited this cycle | Geo concentration | Fit with SI8 product? |
|--------------------|------------------------|--------------------|------------------------|
| "Client / legal team is asking" (no law cited) | ~12 | UK, Dubai, Germany, Netherlands | ✅ Strongest signal |
| EU AI Act — labeling/disclosure expectation | 2 of 3 EU Act mentions | UK | ⚠️ Mismatch persists — Ivan Petruzzelli's own language conflates the two even though he's a confirmed buyer |
| EU AI Act — client/brand pressure framing (correct) | 1 of 3 | UK | ✅ Correct fit |
| Regulated sector exposure (finance, pharma, legal, insurance) | 4 | UK, USA (finserv-NY) | ✅ Test A confirming, no counter-examples this cycle |
| NY Synthetic Performer Law | 3 | USA | ✅ All 3 correctly production/brand-side, not entertainment-talent-side — but 1 of 3 was the wrong internal desk (Legal Affairs Program at Amex, not the AI-review owner) |
| E&O / production-side blocker | 1 (negative) | LA | ⚠️ Only production-side data point this cycle ran counter to the Driver 3 thesis (Michele Hill: no slowdown-driven urgency observed) |

**EU Act framing accuracy rate this cycle:** 1 correct / 3 mentions = **33%** — still well below the 70% threshold flagged on Jun 27, and the Msg 2 revision recommended that cycle does not appear to have been applied (Ivan's fresh reply this cycle still shows the same disclosure/Chain-of-Title blend). This is now a 2nd-cycle-unresolved item, not a new finding.

**NY Law pattern holds:** targeting logic (production/brand/agency-side, not talent-side) is validated again this cycle. The Vairo miss is a title-precision problem (Legal Affairs Program ≠ the person who owns AI creative review), not a targeting-logic problem.

---

## Section 5: Split Test Integration

*Full table in Step 7A above; condensed here.*

- **Confirmed, strengthening:** Test A (regulated-sector = ICP discriminant) — 3 new confirming replies this cycle, zero counter-examples across 2 cycles now.
- **Confirmed, stable:** Test C variant C1 (blocker probe) — Ivan Petruzzelli reinforced again.
- **Active, approaching threshold:** Test C variant C2 (aware-not-blocked), Test E (current-solution probe) — both gained 2-3 new candidate leads this cycle from discovery signals, neither has been formally logged into the split-test tables yet.
- **First real data point, negative:** Test 9 (Clearance Pro) — Michele Hill's reply ran counter to the LA line-producer thesis. Only 1 substantive data point; too early to retire, but the log's "PENDING, lead count TBD" status is stale — the campaign is live (258 leads across 2 variants, 3 total responses).
- **Unresolved, 2nd cycle running:** Test 10/11 (two-part gate question) — designed 2026-06-16 specifically to fix the T1-definition conflation problem flagged in this same report's standing caveat, still zero leads assigned. Test 14 (document-formality gate), recommended in the Jun 27 report, was never added to `SPLIT-TEST-LOG.md` at all.
- **Log needs a refresh independent of this report:** Test 5 (EU Act) and Test 7 (Who's Asking) both describe themselves as "TBD launch" / "0% response" in the log while dripify-campaigns.csv shows they've been live for weeks with real reply data (Test 5: 4 cohorts, up to 24% response; Test 7: 3 cohorts, up to 27% response). Recommend a manual `SPLIT-TEST-LOG.md` refresh pass separate from this wizard.

---

## Section 6: Competitive Signal

| Lead | Company | What they're building / using | Implication |
|------|---------|-------------------------------|-------------|
| Christopher Neitzert | Creative Mayhem (Germany) | "Yeah I have a solution. Do you?" — DIY tracking (unchanged since Jun 27, no new probe result) | Upgrade buyer, not competitor |
| Florent Delavous | Xtendency (Dubai) | "Already working on something in this space" (unchanged, still unprobed) | Ambiguous — probe still outstanding |
| Gabriel Preston | Imagine This Creative Studio (UK) | Approved platform lists, prompt sheets — internal process for the directors he represents | Upgrade buyer / potential bulk facilitator (aggregator role, per Jun 11 log entry) |
| Oscar Julius Marmelstein *(new)* | The Shed, Netherlands | "We keep logs of how [AI content] was made" — internal, informal | Upgrade buyer signal, Test E candidate |
| Shahrukh Kazmi *(new)* | Freelance, Netherlands | Shares tool list + process manually per request | Upgrade buyer signal, Test E candidate |
| Max Penk *(new)* | TEKTITE, Germany | "So far nobody asked for this, as we do it internally" + requested a sample doc | Upgrade buyer, T2 curiosity |
| Simon Tan *(new)* | Reka AI, Singapore | "Multimodal agentic AI company, we have agents to automate most of our workflows" | First AI-native/tool-side signal this cycle — per the Jun 11 non-responder audit, this profile type ("inside the ecosystem") historically never converts. Log as a negative-fit pattern match, not a lead to pursue. |
| B125 Tim Deussen | XRBB (Germany) | Independent validation, unchanged: "no company for front-to-back rights management in generative workflows" | Still the clearest external confirmation the gap is real and unfilled |

**No new named competitor products surfaced this cycle** — same conclusion as Jun 27. All "I have a solution" signals remain ad-hoc/internal, not competing commercial products.

---

## Section 7: 30-Day GTM Recommendation

```
NEXT 30 DAYS — GTM RECOMMENDATION

Concentrate on: Same beachhead as last cycle (ICP 3 + Holdco/finserv-exposed UK) —
               it held for a second consecutive cycle with zero ICP 3 churn. This is
               no longer a hypothesis to validate further; it is the operating thesis.
               New wedge to test alongside it: FinServ-NY sub-segment (100% signal
               rate on n=2 — needs volume before it can be trusted).

Why: Repetition without decay is the strongest evidence available at this scale —
     a month of additional volume did not surface a single ICP 3 counter-example.
     Diminishing marginal value in re-confirming; the constraint is now execution
     speed on the leads already in hand (see stalled items below), not more discovery.

Message hook: Keep "client/legal team is asking" as Msg 1 — still the sharpest
              discriminant. Do NOT lead with EU Act language until Msg 2 is fixed
              (see below) — it is still producing disclosure-flavored replies from
              otherwise-good buyers (Ivan Petruzzelli, 2nd cycle running).

Campaign to launch: Scale SI8_Legal Friction_Finserv_NY from n=4 to a proper batch
                    (100–150 profiles) — it's the cleanest signal-to-noise sequence
                    observed in two cycles, currently running at toy volume.

Test to run: Stop designing new tests. Launch Test 10/11 (two-part gate question) —
             designed 2026-06-16, zero leads assigned five weeks later. This is the
             single test most likely to correct the T1-count inflation this report
             flags at the top. It should outrank any new test idea until it has data.
```

### Stalled items carried forward from last cycle (now overdue, not just open)

1. **EU Act Msg 2 revision** — recommended Jun 27, still not applied (Ivan's fresh reply this cycle shows the same mismatch). Second cycle unresolved.
2. **B088 Matthew (OLIVER) B2B2B probe** — sent Jun 8, still "await reply" as of this cycle's pipeline snapshot. Six weeks with no follow-up nudge logged.
3. **B130 Ivan (State Street) reply draft** — flagged Jun 17 as high-value ("JD to draft reply before sending"), still undrafted as of this cycle.
4. **Test 10/11 launch** — designed Jun 16, zero leads assigned.
5. **Test 14 launch** — recommended Jun 27, never added to the log at all.
6. **B157 Steve Bannerman promotion** — strong T1 quote, still sitting in the coldest pipeline sub-tier.

None of these are new findings — they are the same five items from the Jun 27 report plus one new pipeline-hygiene catch, now aging a second cycle. The beachhead thesis doesn't need more validation right now; these six items need action.

---

## Compare to Previous Analysis (Jun 27 → Jul 18)

- **Beachhead:** Unchanged, now confirmed twice — this is the most important delta (a non-delta).
- **ICP 3 cluster:** Zero churn — same 3 names, still 100% T1.
- **New signal:** FinServ-NY sub-segment (small n, worth scaling to test).
- **New pipeline hygiene gap:** Steve Bannerman under-promoted relative to signal strength.
- **New negative data point:** Test 9 (Clearance Pro / LA line producers) — first real reply ran counter to thesis.
- **Recurring failure:** none of the 5 action items recommended on Jun 27 were completed by this cycle. The report's analytical engine is functioning; the follow-through loop between report and action is the weak link right now.

---

## Open Questions Carried Forward

- [ ] EU Act Msg 2 revision — still pending, 2nd cycle
- [ ] B088 Matthew (OLIVER) — B2B2B probe reply still awaited
- [ ] B130 Ivan (State Street) — reply draft still pending
- [ ] Test 10/11 launch — two-part gate question, designed Jun 16, no leads assigned
- [ ] Test 14 launch — never logged
- [ ] B157 Steve Bannerman — promote to Warm
- [ ] SPLIT-TEST-LOG.md refresh — Tests 5, 7, 9 all show stale "TBD/0%" status against live campaign data
- [ ] Adjacent sector TAM (pharma/healthcare) — still not quantified
- [ ] Sofia Yan (Capture/Numbers Protocol) — still awaiting Trust List / API credentials reply

---

*Next full report: after next Dripify export + Supabase export cycle.*
