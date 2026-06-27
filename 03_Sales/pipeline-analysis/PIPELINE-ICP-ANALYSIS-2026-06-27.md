# SI8 Pipeline + ICP Analysis — 2026-06-27

**Date:** 2026-06-27
**Report type:** Full report cycle — Supabase export `supabase-export-2026-06-27.csv` (626 responses, `is_latest_version=true`)
**Previous analysis:** [PIPELINE-ICP-ANALYSIS-2026-06-22.md](PIPELINE-ICP-ANALYSIS-2026-06-22.md)
**Wizard:** `/dripify-report` Steps 1–9

---

## Funnel State (as of this cycle)

| Stage | Count | Δ vs Jun 22 |
|-------|-------|-------------|
| Lead Replied | 62 | +8 |
| Warm Lead | 27 | +4 |
| Call Requested | 6 | — |
| Call Scheduled | 1 | — |
| Call Taken | 2 | +1 (Tim Deussen B125) |
| Evaluating | 0 | — |
| Closed Won | 0 | — |

**Discovery Pipeline:** 258 signals (up from 256). Discovery signal rate: **44.6%** (279/626 responses).

**Cost efficiency:**
| Geo | Leads Sent | Calls Verified | $/call |
|-----|-----------|---------------|--------|
| UAE/Dubai | 388 | 4 | $13.86 |
| London/UK | 1,292 | 8 | $23.07 |
| Germany | 364 | 1 | $52.00 |
| Netherlands | — | 0 | — |
| USA | — | 0 | — |
| Singapore | — | 0 | — |
| France/Paris | — | 0 | — |
| Sweden/Stockholm | — | 0 | — |

---

## Section 1: Signal Quality Map

### By Geo (Warm Lead + Call Requested + Call Scheduled only)

| Geo | T1 (In pain) | T2 (Curious) | T3 (Building) | Total | T1% |
|-----|-------------|-------------|--------------|-------|-----|
| London/UK | 6 | 5 | 0 | 11 | **55%** |
| Dubai/UAE | 3 | 3 | 1 | 7 | 43% |
| USA | 2 | 1 | 0 | 3 | 67% |
| Germany | 1 | 1 | 1 | 3 | 33% |
| Singapore | 1 | 0 | 0 | 1 | 100% |
| Netherlands | 0 | 1 | 0 | 1 | 0% |

**London/UK T1 leads:** B087 Ibrahim Badi (IKM, regulated sectors), B088 Matthew Sergison-Main (OLIVER/Brandtech, "100%"), B139 James Hilditch (BearJam, "yes, sometimes — important part of process"), B145 Daniele Zennaro (AiYR4, "request via commercial/rights side"), B130 Ivan Petruzzelli (State Street, Call Requested), B143 Simon Helm ("advising clients already — can we chat?")

**Dubai/UAE T1 leads:** B100 Ramez Tabshi ("IP provenance escalating with clients"), B099 Sultan Alsuwaidi ("becoming standard now"), B101 Anas Bakal (Call Scheduled — 3-point structured reply on licensing/provenance/labeling)

**USA T1 leads:** B094 Justin Lufair Brown (Amazon, "contract language tightened a lot last 12 months"), B158 Dan Lantry (Sonova VP Legal Affairs, "would like to better understand — NY Law triggered")

**Singapore T1:** B002 Teddy Sandu (MullenLowe IPG, "asking for both" — disclosure + Chain of Title same-day reply)

### By Title Cluster

| Title cluster | T1 | T2 | T3 | Total | T1% |
|--------------|----|----|-----|-------|-----|
| ICP 3 — Legal / Business Affairs / GC | 3 | 0 | 0 | 3 | **100%** |
| Holdco-embedded / finserv-exposed CD + Production | 4 | 4 | 0 | 8 | **50%** |
| Boutique Founder / MD / CEO | 1 | 2 | 2 | 5 | 20% |
| Gen AI Specialist (holdco) | 0 | 2 | 0 | 2 | 0% |
| Film/TV Post-production (E&O track) | 2 | 0 | 0 | 2 | 100% |

**ICP 3 T1 leads:** B130 Ivan Petruzzelli (State Street — requiring structured AI workflow auditability from agencies), B158 Dan Lantry (Sonova VP Legal Affairs Americas — NY Law interest), B143 Simon Helm (consultant, advising clients on this already)

**Holdco/finserv CD T1 leads:** B088 Matthew (OLIVER/Brandtech), B002 Teddy Sandu (MullenLowe IPG Singapore), B145 Daniele (AiYR4, commercial/rights side requirement), B087 Ibrahim (IKM, pharma/finserv/regulated sectors)

**Film/TV Post-production T1:** B094 Justin (Amazon, contract tightening), B157 Steve Bannerman (Prime Video APAC, "provenance HUGELY important" — Lead Replied stage, not yet Warm Lead)

### The Beachhead Intersection

**Beachhead = London/UK × ICP 3 demand generator + ICP 1a holdco/finserv-exposed execution layer**

- Highest T1% geo with 3+ leads: London/UK (55%, 11 warm leads)
- Highest T1% title cluster with 3+ leads: ICP 3 (100%, 3 leads); Holdco/finserv CD (50%, 8 leads)
- The two clusters are linked: ICP 3 (brand legal / BA) generates the requirement → ICP 1a (agency CD) must fulfill it → SI8 is what satisfies both

This is not two separate ICPs. It is one B2B2B chain: **Brand legal (ICP 3) → Agency CD (ICP 1a) → SI8 Certified**

A single ICP 3 win (e.g. State Street specifying SI8 format) creates pull demand from every agency working that client account. This is the network effect that makes ICP 3 the highest-leverage target in the funnel even with 3 leads — each lead has a multiplier.

---

## Section 2: Message Effectiveness

### Which sequences produce T1 replies?

| Sequence | Signal type produced | T1 quality | Note |
|----------|---------------------|-----------|------|
| Legal Friction — FinServ | Highest T1 % | ✅ Strong | "100%", "especially in regulated sectors", "both disclosure + Chain of Title" |
| Logline-Global-v1 (CarFax) | Mixed T1/T2 | ⚠️ Moderate | Broad hook; some strong replies (Sultan, Anas Bakal) but more T2 curiosity |
| Legal Friction — EU Act (France) | T2 only — mismatch | ❌ Weak for SI8 | All replies describe labeling/disclosure (Article 50), not Chain of Title. Wrong hook. |
| Who's Asking (NY Law) | ICP 3 signal | ✅ ICP 3 specific | Dan Lantry (VP Legal Affairs) — direct brand legal interest. Smaller pool but higher-quality leads. |

### Which message in the sequence generates richest replies?

- **Msg 1 (Legal Friction):** Gets a YES/NO signal quickly. Best T1 discriminant. Shortest path to qualifying.
- **Msg 2 ("How are you handling it today?"):** Generates the most detailed replies when a T1 is already identified. Ibrahim Badi answered 9 intake questions inline at Msg 2. Tim Deussen gave full gap analysis at Msg 2. This is where the product discovery happens.
- **Msg 3/4:** Drop-off. Replies at this stage are mostly polite re-engagements or "not yet but soon" — T2, not T1.

**Implication:** The sequence is working as a T1 filter. The job of Msg 1 is to screen; Msg 2 is where the real conversation starts. Don't dilute Msg 1 with too much product information — keep it as a pure "are they asking?" gate.

### Opening hook that produced most explicit pain signals

1. **"When your client's legal team asks for documentation on an AI video you delivered..."** — most explicit T1 signal; describes the precise moment of pain
2. **"IP provenance and training data transparency is absolutely escalating with clients"** (Ramez T1 reply language, unprompted) — this is what T1 leads sound like, not our hook language; worth testing as the opening frame
3. **"No company for front-to-back rights management in generative workflows"** (Tim Deussen's independent validation) — could be used as a problem-framing hook in ICP 3 campaigns

---

## Section 3: Beachhead Cluster Definition + TAM

### Beachhead ICP (as of 2026-06-27)

```
Beachhead ICP:
Title: Senior Video Production Specialist / Creative Director / Senior Producer
        at holdco arm (OLIVER, Monks, VaynerMedia) OR boutique agency
        with active finserv, pharma, or regulated-sector client accounts
Company type: UK boutique AI agency (5–50 people) or embedded agency
              within a holdco serving regulated-sector clients
Geo: London/UK (primary) — UAE/Dubai (secondary, lower cost)
Trigger: Client legal team making explicit written/contractual documentation request
         on AI-generated video deliverables (not just verbal clearance)
Decision: CD or MD makes the purchase; may require client to explicitly "require"
          SI8 in their brief (B2B2B path) or can self-buy for pitch readiness
Velocity: T1 leads → call in 2–3 weeks (B088, B002 converted in 1 session);
          T2 → 4–8 weeks (sample + follow-up cycle needed)
```

### Demand Generator ICP (ICP 3)

```
Demand Generator ICP:
Title: VP/Head of Legal Affairs / Business Affairs / Brand IP Counsel / GC
Company: Brand or holdco HQ (not agency)
Geo: London/UK (primary, ASA + EU Act pressure) — USA/NY (secondary, NY Synthetic Performer Law)
Trigger: Regulatory pressure + no internal solution for AI video IP documentation
Decision: Single authority — their sign-off creates pull demand on every agency they work with
Velocity: Slow to reply (2–4 messages) but high-quality signal when they do
Revenue multiplier: 1 ICP 3 win → 5–10 ICP 1a agency certifications minimum
```

### Bottom-Up TAM Estimate

**ICP 1a: UK boutique / holdco-embedded agency CDs with finserv-exposed accounts**

- Sales Navigator scope: UK, Advertising/Creative Services, CD/VP/Senior Producer titles → estimated 2,500–3,500 profiles
- Accepted leads (current acceptance rate ~30–35%): ~800–1,100
- Warm reply rate of accepted (Legal Friction sequence): ~15%
- T1 rate of warm: 55% (observed London this cycle)
- Full saturation warm T1 leads: ~65–90 per campaign cycle
- At 10% T1→close: 6–9 deals/cycle
- At 20% T1→close: 13–18 deals/cycle
- Revenue (SI8 Certified $499 × 1.5 avg submissions per agency): $4,500–$13,500/cycle
- **Beachhead TAM (ICP 1a UK, Year 1 addressable): $30–60K**

**ICP 3: Brand legal / BA at UK brands and holdco headquarters**

- Sales Navigator scope: UK, Financial Services / Consumer Goods / Media, Legal/BA titles → estimated 300–600 profiles
- Not a volume play — targeted 50-lead campaigns, hand-screened
- Pipeline value: each ICP 3 converted = $499 × 5–10 agency clients per year (conservative)
- One State Street ICP 3 win → ~$5–10K in agency cascades over 12 months
- **ICP 3 TAM (Year 1 value): $20–40K (via cascade effect, not direct sales)**

**Combined Year 1 addressable (UK beachhead):** $50–100K — within the $80–120K target range with only the UK beachhead fully penetrated.

Cross-reference with `BUYER-ANALYSIS-2026-06.md`: The 5-market-driver framework predicts client pressure as the dominant Year 1 driver. This cycle confirms it — all T1 leads cite client/legal pull, not internal initiative. TAM model should weight toward buyer-pull scenarios, not self-motivated buyers.

---

## Section 4: Regulatory Signal Tracker

| Regulatory trigger | Times cited this cycle | Geo concentration | Fit with SI8 product? |
|-------------------|----------------------|-------------------|----------------------|
| "Client / legal team is asking" (no law cited) | ~18 | UK, Dubai, Singapore, Germany | ✅ Strongest signal — pure demand signal |
| EU AI Act — labeling/disclosure expectation | ~7 | France, Germany, Netherlands | ⚠️ Mismatch — Art. 50 = labeling, not Chain of Title |
| EU AI Act — client/brand pressure framing | ~3 | UK | ✅ Correct fit — client requiring documentation for compliance |
| Regulated sector exposure (finance, pharma, healthcare) | ~5 | UK, UAE, USA | ✅ Test A confirming — regulated-sector exposure = ICP discriminant |
| NY Synthetic Performer Law | 2 | USA | ✅ ICP 3 trigger — brand legal interest, not agency |
| "Required for broadcast / platform" | 1 | UK (Jenny Springett, Electric Violet TV) | ✅ E&O / broadcast track — ICP 2 signal |
| ASA / CAP Code | 0 | — | Not yet showing in reply language |

**EU Act framing accuracy rate:** 3 correct / 10 EU Act mentions = **30%** — well below the 70% threshold. Recommendation: Revise Msg 2 in the EU Act sequence to explicitly distinguish SI8 (IP clearance / Chain of Title) from labeling/disclosure requirements (Art. 50 compliance). France and Germany Msg 2 will hit these leads in the next send cycle — intercept before they receive mislabeled follow-up.

**NY Law signal pattern:** Both NY Law signals (Dan Lantry / Sonova, William Finkel / Hello Sunshine) are ICP 3 profiles — brand legal / business affairs, not agency CDs. The NY Law hook is an ICP 3 hook, not ICP 1a. Confirm before scaling USA outreach.

**"Client is asking" dominance:** This is the most common and most reliable T1 signal across all geos and sequences. It is the proof point that demand is being driven from the buy side (brand legal), not invented by agencies. GTM implication: position SI8 as the answer to an inbound request that agencies already receive, not a proactive solution.

---

## Section 5: Split Test Integration

| Test | Hypothesis | Leads assigned | Replies this cycle | Status | Verdict |
|------|-----------|----------------|-------------------|--------|---------|
| A | Regulated-sector exposure = ICP discriminant | 8+ | B087 (pharma/finserv), B002 (IPG), B145 (commercial/rights) | **CONFIRMED** | Stop testing — design targeting filter around it |
| B | BA / Broadcast Affairs titles = operational buyers today | 3 | No new replies | Insufficient data | Expand list — Test 12 (EP/LP) is the priority variant |
| C | "Has it blocked you?" separates buyers from aware | 5+ | B088 ("100% being asked"), Tim Deussen (gap validated) | **CONFIRMED** | Use "blocked" / "held up" language in Msg 2 probes |
| D | Pre vs. post production documentation timing | 6+ | 4 geos independently described pre-production gate (Hugo/NL, Jian Yi/SG, Jean Delaunay/USA, Seb Winter/DE) | **D1 CONFIRMED** | Enterprise buyers describe documentation as pre-production gate — not post-delivery |
| E | Current-solution probe converts faster than pitch | 4+ | Ibrahim Badi 9-field inline checklist at Msg 2 — confirmed ad-hoc workaround | **CONFIRMED** | Workaround language is real; "how are you handling it today?" produces richer replies than pitch |
| 5 | EU Act sequence produces Chain of Title replies | 30+ (France, London/FinServ) | France: 6 signals, ALL labeling/disclosure — zero Chain of Title | **MISMATCH** | EU Act hook attracts wrong buyer profile in France; revise Msg 2 before next send |
| 7 | Research framing vs. validation framing for ICP 3 | Dan Lantry, William Finkel | Both replied to "Who's Asking" research frame | **CONFIRMING** | Research frame lands with ICP 3 (legal/BA titles); needs 1 more data point to confirm |
| 8 | Pre-approval pitch: agency pitches SI8 to client legal before delivery | 3 | B088 (B2B2B probe sent — awaiting) | Insufficient data | Awaiting Matthew reply — this is the key test |
| 9 | Clearance Pro: pure probe vs. probe + product hint | 5 | No new substantive replies | Insufficient data | Need more leads in this test |
| 10 | Two-part gate question: formal document or informal sign-off? | 3 | No new replies | Active | |
| 12 | EP/LP E&O ICP — film/TV track | B157 Steve Bannerman (Prime Video) | T1 signal: "Provenance HUGELY important" | Confirming | 1 strong signal — Film/TV E&O track is real; need BA title |
| 13 | AI Compliance Advisor multiplier (consultant-to-referral) | B143 Simon Helm | "Advising clients already — can we chat?" | Confirming | Consultant-as-multiplier pattern: 1 consultant → N clients |

**Recommended retires:** Test E (confirmed; pattern established — current-solution probe is standard Msg 2), Test A (confirmed; now a targeting filter, not a test)

**Recommended new test (Test 14):** Document formality gate — Msg 1 opener: *"When your client's legal team asks for documentation on an AI video — are they asking for a verbal confirmation from you, or a signed document?"* Forces a YES/NO on formality level. Predicts: formal document requirement (YES) → buyer; verbal OK still (NO) → early-stage T2. Hypothesis: forcing the formality gate produces call requests 30% faster than the open-ended "are they asking?" question because it resolves ambiguity in one exchange.

---

## Section 6: Competitive Signal

| Lead | B-ID | Company | What they're building / using | Implication |
|------|------|---------|------------------------------|-------------|
| Christopher Neitzert | B128 | Creative Mayhem (Germany) | "Yeah I have a solution. Do you?" — DIY tracking system | Manual/ad-hoc internal system — upgrade buyer, not competitor. Probe what his solution looks like; could become case study if converted. |
| Florent Delavous | B095 | Xtendency (Dubai) | CEO saying "already working on something in this space" | Ambiguous — could be building competing product OR building their own internal tracking. Probe required before dismissing. |
| Gulzar Junaid | B123 | Kling AI (Germany) | "Usually driven by legal or brand safety" — at Kling AI | Platform-side signal: Kling is tracking this. Could be distribution partnership opportunity, not competition. |
| B125 Tim Deussen | B125 | XRBB (Germany) | Validated the gap independently: "No company for front-to-back rights management in generative workflows" | ✅ External validation that no competitor has filled this space — gap confirmed by industry practitioner |

**No new named competitors in reply language this cycle.** Tim Deussen's advisory call provided the clearest independent confirmation that the SI8 gap is real and unfilled. No leads cited a competing service they were already using. The "I have a solution" signals (B128, B095) are both ad-hoc/internal — they confirm the workaround problem, not a competitor product.

---

## Section 7: 30-Day GTM Recommendation

```
NEXT 30 DAYS — GTM RECOMMENDATION

Concentrate on: ICP 3 demand generators (Legal Affairs / Business Affairs)
               + converting 6 T1 London/UK warm leads to calls

Why: ICP 3 is 100% T1 conversion rate with 3 signals. Each win creates cascading
     demand from 5–10 agency clients. London/UK has 6 T1 warm leads in the funnel
     right now — these are the closest revenue signal. Both tracks run simultaneously.

Message hook: "Client pull" framing — "When your client's legal team asks for
              documentation on an AI video you delivered, what do you send them today?"
              This is the T1 discriminant. T1 leads give specific workaround answers.
              T2 leads say "not yet." One exchange qualifies better than 4 messages.

Campaign to launch: Legal Team LinkedIn campaign (see 03_Sales/outreach/LINKEDIN-CAMPAIGNS-LEGAL-TEAMS-V1.md)
                    Geo: London/UK | Alias: Angel or Ivy | Titles: Legal Affairs, Business Affairs,
                    Head of Legal, GC at brands with active AI video programs
                    Volume: 100–150 profiles (hand-screened — not volume play)
                    Sequence: "Who's Asking" research frame (Test 7 confirming for ICP 3)

Test to run: Test 14 — Document formality gate as Msg 1 (see Section 5 above)
             Run on next London/UK ICP 1a batch. Compare call request rate
             vs. standard Legal Friction Msg 1 "are they asking?" hook.
```

### Critical fixes before next campaign send

1. **Revise EU Act Msg 2** — France/Germany batches hitting Msg 2 in next cycle. Currently the follow-up will deepen EU Act mismatch. Revise to distinguish SI8 (IP clearance) from labeling/disclosure (Art. 50). Draft: *"Just to be specific about what we do — this isn't about EU labeling compliance (disclosure tags, etc.). It's about chain of title for AI-generated video: who created it, what tools were used, what training data was involved, what rights have been cleared. That's the documentation brands and their legal teams are starting to require when agencies deliver AI content."*

2. **Pre-production positioning** — D1 confirmed: enterprise buyers describe documentation as a PRE-production gate, not post-delivery. Current SI8 flow ("submit your completed video") is misaligned. Add messaging in Msg 3/4 that positions SI8 as the pre-production planning layer: *"Some agencies are using SI8 before production starts — tool approval, rights planning, prompt logging — so the Chain of Title is complete at delivery, not assembled afterward."*

3. **B2B2B probe on Matthew B088** — he is the closest confirmed ICP 1a to conversion. B2B2B probe sent (is the requirement from brand legal or creative?). If he confirms brand legal → this is the first confirmed end-to-end B2B2B chain in the pipeline.

4. **Ivan B130 reply** — State Street is specifying a structured campaign brief format that may differ from SI8 PDF. Draft a reply that probes whether their requirement is IP provenance (SI8 fit) or campaign workflow data (different product). This call is high-value — State Street setting a format specification that SI8 matches would create pull from every agency working that account.

5. **Gate question for B002 Teddy Sandu (MullenLowe Singapore)** — "Asking for both disclosure + Chain of Title" is the best single-reply in the pipeline. Follow-up gate sent: "What are you currently sending them — and does it satisfy their legal team?" This answer determines if he's T1 with an active gap (immediate buyer) or T1 with an adequate workaround (upgrade buyer, slower).

### ICP 3 B2B2B play — full logic

The B2B2B chain SI8 needs to establish:
```
Brand legal (ICP 3)
  "We require Chain of Title on all AI video deliverables"
        ↓
Agency CD (ICP 1a)
  "Our client is requiring SI8 Certified format"
        ↓
SI8 Certified ($499/video)
  Recurring per submission as campaign volume grows
```

Ivan Petruzzelli (B130) and Dan Lantry (B158) are the two most advanced ICP 3 leads. If either confirms they would specify or recommend SI8 format to their agencies → that is the proof-of-concept for the entire model. Prioritize both replies this week.

---

## Open Questions Carried Forward

- [ ] EU Act Msg 2 revision — before France/Germany Msg 2 send
- [ ] B088 Matthew (OLIVER) — B2B2B probe: does requirement originate from brand legal? Yes → Test 8 confirmation + ICP 3 cascade model proof
- [ ] B130 Ivan (State Street) — draft reply: probe whether requirement is IP provenance (SI8 fit) or campaign workflow auditability (different product)
- [ ] B002 Teddy (MullenLowe) — gate Q: what are they sending now? Does it satisfy legal team?
- [ ] B158 Dan Lantry (Sonova) — brief NY Law education + call ask in flight (due Jun 18 — follow up)
- [ ] B095 Florent (Xtendency) — probe: building competitor or internal tool?
- [ ] Test 14 launch — document formality gate as Msg 1 replacement
- [ ] ICP 3 Legal Team campaign launch — 100–150 profiles, London/UK
- [ ] Adjacent sector TAM (pharma/healthcare) — MLR review parallel to finserv — not yet quantified
- [ ] Apply C2PA Conformance Program (disclosure gap analysis pending)
- [ ] Sofia Yan (Capture/Numbers Protocol) call — technical confirm MP4 support before integrating

---

*Next full report: after next Dripify export + Supabase export cycle (est. mid-July 2026).*
