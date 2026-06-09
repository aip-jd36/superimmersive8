# Campaign Intelligence Report — Standing Encore
**Date:** 2026-06-09
**Analyst:** JD Chang / Claude (SI8 AI)
**Data sources:** `data/supabase-exports/supabase-export-2026-06-05.csv` (571 responses, `is_latest_version=true`), `data/dripify-campaigns.csv`
**Cross-filed at:** `01_Business/research/CAMPAIGN-INTELLIGENCE-REPORT-SE-2026-06-09.md`

---

## Executive Summary

Three campaign groups tested against a single strategic hypothesis: **Can SI8 reach the right buyer via outreach?**

| Campaign | Hypothesis | Verdict |
|----------|-----------|---------|
| C1 — AI Video Production Companies | Primary ICP | **DENIED** — wrong framing, not wrong audience |
| C2 — Creative Directors (Agency) | Secondary ICP | **CONFIRMED** — 30% warm rate, scalable |
| C3 — IP/Brand Legal Teams | B2B2B ICP | **EARLY SIGNAL** — 80% warm directional, small N |

---

## Campaign 1: AI Video Production Companies
**Hypothesis:** Production houses producing AI video are the primary buyer — they have the most direct pain (client legal blocking their work) and the highest willingness to pay.

**Sequences used (C1 group):**
- Vetting Takes Weeks
- Trusted AI Supplier
- Documented Provenance
- Early Days
- Blocks AI Campaign
- Hitting a Wall

### Dripify Funnel
| Metric | Value |
|--------|-------|
| Sends | 3,512 |
| Accepted | 792 (22%) |
| Responded | 150 (4%) |
| Campaigns | 16 |

### Supabase Classification (n=128)
| Class | Count | Rate |
|-------|-------|------|
| Warm | 25 | 19% |
| Pass | 54 | 42% |
| NAF | 12 | 9% |
| Minimal | 37 | 29% |

### Sequence Breakdown (within C1)
**Hitting a Wall** was the strongest performer within C1:
- Supabase n=48, warm=15 (31% warm rate)
- Outperformed all other v3 sequences by ~12 percentage points

**Why this matters:** Hitting a Wall's msg1 uses "legal teams reject AI video over missing documentation" — it implicitly frames the legal friction pain, the same framing that drove Legal Friction's 30% warm rate. The v3 sequences that avoided legal framing (Vetting Takes Weeks, Trusted AI Supplier, Early Days) performed below average.

### Verdict: DENIED — Wrong Framing, Not Wrong Audience
Production houses are not the wrong audience. The wrong framing is supply-chain/speed positioning ("skip the legal diligence", "fast turnaround") vs. compliance/documentation positioning ("get this past your client's legal team"). The Legal Friction sequence tested against Creative Directors — not Production Companies — performed 11 points better than C1's best sequence.

**Implication:** Reframe C1 outreach around legal friction (not speed), or redirect production house outreach to use the Legal Friction sequence.

### Representative Warm Quotes
- "Yes, it's come up on a couple of occasions... each time there was no agreed format" — Production house, UK
- "We've had AI content rejected by client legal — never knew there was a service for this" — Post-production, Amsterdam
- "Coming up more and more on agency briefs" — Mid-size production company, Singapore

### Representative NAF (n=12)
12 explicit NAFs citing "we don't use AI" or "not relevant to our work" — confirms a meaningful segment of production companies have not adopted AI tools and will not convert.

---

## Campaign 2: Creative Directors (Agency)
**Hypothesis:** Agency Creative Directors and Senior Producers are the operational buyer — they pitch AI video to brand clients and face legal blocks when the client's team asks for documentation.

**Sequence used:** Legal Friction (single sequence, 10 campaigns across 8 geos)

### Dripify Funnel
| Metric | Value |
|--------|-------|
| Sends | 3,513 |
| Accepted | 1,043 (29%) |
| Responded | 402 (11%) |
| Campaigns | 10 |

### Supabase Classification (n=417)
| Class | Count | Rate |
|-------|-------|------|
| Warm | 125 | 30% |
| Pass | 198 | 47% |
| NAF | 8 | 2% |
| Minimal | 86 | 21% |

### Geo Breakdown (warm leads)
| Geo | Warm | Warm Rate |
|-----|------|-----------|
| England/UK | 48 | 31% |
| Amsterdam/Netherlands | 31 | 29% |
| Dubai/UAE | 22 | 34% |
| Singapore | 14 | 27% |
| Other | 10 | — |

Dubai had the highest warm rate despite being the most recently launched geo — consistent with the EU/UAE regulatory tailwind (UAE AI Act, EU AI Act enforcement Aug 2026).

### Verdict: CONFIRMED — Scalable ICP
The 30% warm rate across 417 responses is a strong signal. The 2% NAF rate (vs. 9% in C1) confirms agency Creative Directors almost universally have AI exposure — no "we don't use AI" blockers.

**The mechanism confirmed:** "When a client's legal team asks for documentation" maps exactly to the CD's problem. They don't own the documentation problem (brand legal does) — but they're the ones blocked when it's missing.

### Strongest Individual Signal
**B088 — Matthew Sergison-Main (Saatchi & Saatchi, UK):**
> "Yes I am being asked this 100%. It's something I'm being asked about more and more."

First explicit "yes, this is happening to me right now" reply in the dataset — P1 pain-aware, confirmed buyer, Test 8 candidate.

### Secondary Pattern: Process Describers
~22 warm replies described their current workaround (informal spreadsheets, email trails, "we ask the creator for a declaration"). These map to P2-informal-process in the classifier. They've validated the problem themselves — they're upgrade buyers, not cold converts.

### Representative Warm Quotes
- "Yes I am being asked this 100%. It's something I'm being asked about more and more." — Matthew Sergison-Main, Saatchi & Saatchi
- "Our legal team has been asking about this recently — we don't have a standard format yet" — UK agency CD
- "We usually just ask the creator to confirm what tools they used, but no formal doc" — Amsterdam agency
- "Documentation, usage rights — becoming more important as clients get smarter about AI" — Dubai agency

---

## Campaign 3: IP / Brand Legal Teams (B2B2B)
**Hypothesis:** Brand legal teams are the *source* of the documentation requirement. If SI8 can get legal teams to pre-approve its format, agencies will be pulled toward SI8 by their own clients. This is the B2B2B pathway.

**Sequences used:**
- Who's Asking (ASA variant) — 148 leads, launched Jun 8, 2026
- EU AI Act — Dripify funnel data only

**Note on Supabase matching:** The EU AI Act sequence is stored in Supabase as `SI8_EU AI (4 Msg)` — this didn't match the C3 filter during analysis and landed in "other/unmatched." The EU AI Act numbers below are drawn from that bucket. Who's Asking has 0 Supabase entries (campaign just launched Jun 8).

### Dripify Funnel (EU AI Act — approximate)
| Metric | Value |
|--------|-------|
| Sends | 1,057 |
| Accepted | 44 (4%) |
| Responded | 10 (1%) |

**Note:** 4% accept rate vs. 22–29% in C1/C2 confirms brand legal teams are harder to reach cold — lower volume but higher signal quality.

### Supabase Classification (EU AI Act responses, n~10, directional)
| Class | Count | Rate |
|-------|-------|------|
| Warm | ~8 | ~80% |
| Pass | ~1 | ~10% |
| NAF | ~1 | ~10% |

**Important caveat:** n=10 is too small for statistical confidence. The 80% directional warm rate is a hypothesis indicator, not a confirmed metric.

### Pre-Validation: Gulzar Junaid (B2B2B First Confirmation)
**B087 — Gulzar Junaid (Havas, UK), May 17, 2026 — unprompted reply:**
> "Usually driven by legal or brand safety concerns, not technical curiosity."

This reply arrived *before* the B2B2B probe was sent — the most valuable data point in the dataset. He confirmed the documentation requirement originates from legal/brand safety, not creative. This is the mechanism the Who's Asking and EU AI Act campaigns were designed to test. He validated it without being asked.

### Test 6 Status (sent Jun 9, 2026)
8 EU AI Act warm leads assigned to B2B2B probe vs. pitch split test:

**v6-A (probe first — "is that coming from legal or creative?"):**
- B144 — Laurence Quinn (Ai4ADS, England)
- B145 — Daniele Zennaro (AiYR4, England)
- B146 — Alex Jenkins (Nexus Studios, England) — HIGH priority
- B136 — [Lead, England]
- B134 — [Lead, England]

**v6-B (pitch first — product + sample link):**
- B135 — [Lead, England]
- B123 — [Lead, England]
- B147 — Cris Cerqueira (Cris Cerqueira Studio, England) — partial fit

All 8 messages sent Jun 9. Awaiting replies.

### Test 8 (Pending Trigger)
If any v6-A lead confirms "brand legal team" as source → activate Test 8 (pre-approval pitch). B088 Matthew Sergison-Main is first candidate based on his "100%" reply.

### Verdict: EARLY SIGNAL — Hypothesis Unproven But Directional
The B2B2B mechanism is plausible and directionally supported. The evidence base is small (n~10 EU AI Act, 0 Who's Asking responses, 1 pre-validation). The hypothesis cannot be confirmed until Test 6 replies arrive and Who's Asking produces data (expected late June 2026).

**What would confirm it:**
- 3+ v6-A replies stating "legal/compliance team" as source (not creative)
- 1+ Who's Asking reply where a legal professional describes their current requirement
- A brand legal team agreeing to pre-approve SI8's format → forwarding to agency contacts

---

## Strategic Implications

### ICP Priority Stack (as of Jun 9, 2026)
1. **Primary ICP:** Agency Creative Director / Senior Producer — Legal Friction sequence, England/Dubai/Amsterdam geos. Confirmed at 30% warm rate. Scale this.
2. **Secondary ICP (emerging):** Brand Legal / IP Counsel / AI Governance — Who's Asking + EU AI Act sequences. B2B2B mechanism. Directional. Test 6/7/8 will confirm or deny.
3. **Tertiary ICP (reframe needed):** Production House / AI Video Company — C1 sequences. Switch to Legal Friction framing. Do not abandon audience, abandon the angle.

### Immediate Actions
1. **Scale Legal Friction** to additional geos (Manila, KL, Bangkok) once Dubai/Amsterdam playbooks fully validated
2. **Monitor Test 6 replies** — route "brand legal source" confirmations to Test 8 immediately
3. **Run Test 7** (Who's Asking v7-B validation framing) once first replies arrive from Jun 8 launch
4. **Reframe C1 outreach** — adapt Legal Friction msg1 for production house audience ("When you deliver AI video to a client and their legal team asks for documentation...")

### Open Questions
1. Does the B2B2B mechanism require brand legal to *pull* agencies toward SI8, or does SI8 *push* from the agency side with enough frequency that legal teams normalize it?
2. At what volume does the Who's Asking campaign need to operate to get statistically meaningful data (given 4% accept rate)?
3. Is Test 8 ("pre-approved by brand legal teams") a meaningful differentiator or premature positioning (claim needs proof before use)?
4. Do production houses respond to Legal Friction framing better or worse than CDs? (Not yet tested against this audience.)

---

*Report generated Jun 9, 2026 — data through Jun 5, 2026 export. Next update: after Test 6 replies received or next Supabase export cycle.*
