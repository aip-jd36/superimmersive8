# CR-Track A2 (Angel) + B2 (Vanessa) — Wave 1 Final Cohort QA

**Prepared:** 2026-09-05 · **Status:** Launch-ready cohorts for **manual Dripify upload by JD**. No campaign launched, no message sent, no Dripify interaction, no commit/push.
**Experiment concepts:** APPROVED by Strategic OS, unchanged. Messaging not touched (Part 8).
**Scope:** contamination resolution + 60-person cohort construction + mechanical QA only.

---

## 1. PART 1 — SCE-100 launch/contact status

**FINDING: SCE-100 (and the sibling HGE-100) was constructed as a candidate list only on 2026-08-15 and was NEVER configured into a campaign and NEVER contacted.**

| Layer | SE-001 / SCE-100 status | Evidence |
|---|---|---|
| Candidate/list construction | ✅ **done** (2026-08-15) | `03_Sales/standing-encore/send-lists/SE-001-SCE-100-2026-08-15.csv` (100 rows); `SIGNAL-TEST-LOG.md` §"Step 4 — List (built 2026-08-15, UK pilot)" |
| Campaign configuration | ❌ **not done** | `SIGNAL-TEST-LOG.md` Test Status table: `SE-001 | … | **Designing** | Launched: — | Report Due: —`. §"Step 2 — Hypothesis (draft, needs your read)"; §"Step 3 — Message arms: **Not yet drafted**"; §"Steps 5–6 — Launch, scoring: **Not started**" |
| Actual outreach / contact | ❌ **not done** | Zero `SE-001` / `SCE` / `HGE` / `Standing Encore` / `Signal Test` campaign names anywhere in `CAMPAIGN-PERFORMANCE-LOG.md`, `CAMPAIGN-QUEUE.md`, `campaign-reports/`, or **any** of the 11 Supabase response exports. No SE-specific `alias_profile` value exists in the Supabase corpus (only Vanessa / Lilly / Ivy / Angel / JD + LH/IL legacy tags). |

**Per the task rule** ("If the list was merely constructed but never contacted, do NOT treat membership in SCE-100 alone as contamination") — **the precautionary SCE-100 exclusion is LIFTED.**

### Newly eligible after SCE resolution (identified separately, NOT auto-merged)

Removing the SCE filter re-qualifies **7 B2** and **7 A2** candidates who were role-qualified and otherwise clean (all had prior *Ivy* contact only — no prior Vanessa/Angel, not in JD 114, not warm-lead). They are tagged `NEWLY ELIGIBLE — SCE STATUS RESOLVED` in the reserve CSVs.

- **B2:** Tunc Akyuz, Roozbeh Minouei, David Goode, Oliyah Joseph, Carl Fox, Aaron Teale, Dan Tapper. **None used in the final 60** — the approved 93-person universe already yields 60 without them; they sit in B2 reserve.
- **A2:** Xuan Pham, Rowland French, Bardia Koushan, Ioana Diana Costea, Clement Edeh, Jay Pirabakaran, Duncan Thomsen. **Two used in the final 60** — Xuan Pham (Executive Creative Director International, **Amazon Prime Video & MGM Studios**) and Rowland French (Executive Producer & Creative Director, **Endemol Shine UK**). Both rank objectively above the weakest members of the approved-65 cohort (rank 1 "named major broadcaster/streamer/studio" vs. the approved-60's weakest at rank 4–5), so they are unambiguous material improvements. The other 5 are lateral rank-2/3/4 and were **not** swapped in — an approved-65 candidate of equal rank was kept instead. They are in A2 reserve.

**No universe rebuild.** B2 stays the approved 93; A2's working pool is the approved 65 plus the 2 unambiguous SCE upgrades.

---

## 2. PART 2 — HGE-100 name-level contamination check vs Angel A2

**FINDING: zero HGE-100 overlap with the 65-person A2 universe. No exclusions.**

| Check | Result |
|---|---|
| Exact normalized-full-name match (A2 65 ↔ HGE-100 100) | **NONE** |
| Fuzzy: same last name + shared company token | **NONE** |
| A2 candidates at a UK office of an HGE-100 agency (OLIVER, VCCP, Grey London, Saatchi London, Ogilvy UK, BBH London, McCann London, Adam&Eve/TBWA, Publicis London, AMV BBDO) | **NONE** — the 5 A2 candidates at HGE-*adjacent* companies are all non-UK offices (Ogilvy **Singapore**, Publicis Groupe [generic], BBH **Asia Pacific**, Saatchi & Saatchi [not "London"], Boomerang/Publicis) — none name-matched, none is a UK-agency contact |

No CONFIRMED / PROBABLE / FALSE match dispositions to report — there were no matches to classify.

**Independent of the above:** HGE-100 was **never contacted** (same SE-001 "Designing" evidence as §1), so even a match would not constitute contamination per the task rule.

---

## 3. PART 3 — Final Vanessa B2 cohort

**Final count: 60** (from the approved 93-person universe; no expansion).

### Method
Ranked the 93 by **objective role tier** (response-blind, hypothesis-blind — see §6):

| Tier | Definition | In final 60 |
|---|---|---|
| 1 | "AI filmmaker" (explicit) | 2 |
| 2 | AI / film director | 9 |
| 3 | AI / GenAI creative director | 9 |
| 4 | craft maker (VFX / motion / 3D / animation / cinematography) + AI | 10 |
| 5 | creative / video producer + AI | 9 |
| 6 | AI artist / AI content creator (explicit) | 7 |
| 7 | creative / art / design director + AI context | 14 |

### 3 qualification-driven swaps (Part 11)
Three candidates reached the tier-fill cut but fail the CR-Track B bar on review of their **full master title** — demoted to reserve, backfilled with the next-strongest on-domain reserve candidates (deterministic rank+name order, response-blind):

| Demoted → reserve | Full master title / reason | Backfilled in |
|---|---|---|
| **Katharina Botel-Azzinnaro** | "AI Visuals & Journalism Researcher \| Broadcast Journalist \| Creative Producer \| News Presenter" @ German Council on Foreign Relations (Research Services) — journalist/researcher, explicitly excluded | **Arkan Gahramy** (Creative Director \| Senior Art Director \| AI Expert) |
| **Klaus Borges** | "Seeking new opportunities to learn and grow / Multimedia Creative Director / Producer / …" @ KBL STORES (Retail) — job-seeking, no current production role | **Rob Gax** (Creative Director \| AI Creator \| Producer) |
| **Steff Donkers** | "Creative Project Lead \| Strategist \| Strategic Branding \| Video Producer \| …" — strategist; "Video Producer" not strong enough evidence of hands-on commercial AI delivery | **Thomas Grandperret** (Freelance Sr Art Director / Creative Lead — AI Prompt Designer) |

Net effect on composition: nil (out = 1 responder + 2 non; in = 1 responder + 2 non).

### Two entries kept but flagged for Strategic OS eyes (in `Qualification Basis`)
- **Jay Laville** ("AI Creative Director Kearney \| AI & Brand Strategist") and **Kd Pascall** ("Creative Director \| Advertising & Marketing \| Ai Gener[ative]") — carry a strategy/marketing element alongside a genuine creative-director-of-AI role. Kept (on-domain), flagged.
- **Ashique Abdulkader** / **Faizan Arshad** / **Vim Shanmugam** — multi-hat titles that lead with a non-maker term but also carry a genuine hands-on element ("Video Editor & Motion Graphics", "CGI Artist", "Award-Winning TV & Film Producer, Writer & Director" respectively). Kept, flagged.

---

## 4. PART 3 — B2 prior-response composition

| | Final 60 | Approved 93 universe |
|---|---|---|
| Prior responders | **26** (43%) | 39 (42%) |
| Prior non-responders | **34** (57%) | 54 (58%) |

Within the ~25 / ~35 sanity range. Natural engagement composition of the qualified universe is preserved — no artificial split imposed, and no selection on response content.

---

## 5. PART 4 — Final Angel A2 cohort

**Final count: 60.** Construction: strongest 60 of the approved 65 by objective org-context tier, then swap the 2 weakest for the 2 unambiguous SCE-newly-eligible upgrades (Xuan Pham, Rowland French). Net: **58 approved-65 + 2 SCE-newly-eligible.**

### Objective org-context tiers

| Tier | Definition | In final 60 |
|---|---|---|
| 1 | named major broadcaster / streamer / studio / enterprise (Amazon Prime Video ×4, Warner Bros Discovery, EA, Endemol Shine, Condé Nast, Nexus Studios) | 10 |
| 2 | named global network agency (Ogilvy, Saatchi, VCCP, BBH, Publicis, Havas, Monks ×2, Accenture Song, DEPT, Jellyfish) | 14 |
| 3 | established independent production company / studio (Balter Films, Tarot Pictures, Analog Studio, Flat2VR, Instant Replay, AAPIX, …) | 16 |
| 4 | production / agency / studio context (smaller) | 20 |

### Tier A verification (Part 4 requirement — heuristic quotes checked against raw `conversation_raw`)

The 4 heuristic "Tier A candidate" flags from the universe file were verified verbatim. **None survives as a prioritisable Tier A signal:**

| Candidate | Verified verbatim quote | Verdict |
|---|---|---|
| Cris Cerqueira | *"For projects involving AI-generated imagery, I keep a record of the tools used and the creative workflow…"* — genuine process statement, **BUT** he also says *"Most of my work is in packaging design, branding, and advertising visuals rather than AI video"* and is a **solo studio** (Founder). | Personal habit, not organisational governance; marginal A2 org fit. Treated as Tier B; kept in the 60 at rank 3, flagged. |
| Alex Jenkins | *"I know one of my clients want us to document whenever we use AI… May I ask why you are enquiring?"* | A **client requirement he's reporting**, not his own process; slightly guarded. Not Tier A. Strong Tier B on org (Nexus Studios). |
| Laurence Quinn | *"Hi Ivy, Not yet. but I am aware of logging everything thanks."* | One-line assertion, no described process. Not Tier A. Tier B (AMV BBDO history / Ai4ADS). |
| Jia Jin (JJ) Goh | *"all my client do not ask for documentation… We leave the issue of whether AI is stealing work to the platform legal team."* | **Anti-maturity** — the heuristic matched "commercial rights" out of context. FALSE Tier A. Tier B org OK (Alternate Video Production). |

**Consequence:** no candidate was prioritised on an unverified quote. A2 ranking is purely objective org-context.

### The 5 held-out approved-65 candidates + 2 swapped-out (all → reserve, all "qualified but not this wave")

| Held out | Company | Objective reason |
|---|---|---|
| Ali Shabaz | The Brand Agency | rank 5 — "Chief Creative Officer \| AI, Marketing & Brand Building" — marketing-brand agency, thin commercial-AI-production context |
| Ismail Ahmed | UNHCR (UN Refugee Agency) | rank 5 — NGO, not a commercial production org |
| Leslie Zhong Han Kazuki Ng | MIU Global Pte Ltd | rank 5 — small creative shop, weakest org context |
| Andre Yeo | onedash22 | rank 4 — small production shop |
| Alexandre Perez | Impossible From | rank 4 — small founder-led shop |
| Jacob Norris | Sierra Division, Inc. | rank 4 — small founder-led shop |
| Giulio Musi | The Chimney Pot | rank 4 by the classifier — *note: The Chimney Pot is a real London post house; SOS may wish to pull him up over one of the rank-4 SCE entries* |

**Strict-no-expansion alternative** (if Strategic OS wants zero SCE additions): drop Giulio Musi + one of {Norris / Perez / Yeo} instead of swapping, giving a 60 that is 100% approved-65. Both versions are 60 and pass all QA. The shipped FINAL CSV is the **recommended** version (58 + Xuan Pham + Rowland French).

---

## 6. PART 4 — A2 Tier / prior-response composition

| | Final 60 | Approved 65 universe |
|---|---|---|
| Tier A (verified) | **0** (all 4 heuristic flags failed verification — see §5) | (4 heuristic, now 0) |
| Tier B | **60** | 61 |
| Prior responders | **15** (25%) | 18 (28%) |
| Prior non-responders | **45** (75%) | 47 (72%) |

The ~17 / ~43 sanity check expected ~28% responders; the final is 25%. **The 2-person difference is an emergent property of response-blind objective ranking** — the highest-org-context organisations happened to contain slightly more prior non-responders, and both SCE upgrades (Xuan Pham, Rowland French) are non-responders. No selection on response status occurred (the ranking function never sees it). Per the task, the stronger role-qualified cohort is preserved and the difference explained rather than corrected by quota.

---

## 7. PART 5 — Cross-experiment QA (verified against the produced FINAL CSVs)

| Check | Required | Result |
|---|---|---|
| Vanessa B2 final ∩ Angel A2 final | 0 | **0** ✅ |
| Vanessa B2 final ∩ JD Track A | 0 | **0** ✅ |
| Vanessa B2 final ∩ JD Track B | 0 | **0** ✅ |
| Angel A2 final ∩ JD Track A | 0 | **0** ✅ |
| Angel A2 final ∩ JD Track B | 0 | **0** ✅ |
| Vanessa B2 final with prior Vanessa contact | 0 | **0** ✅ |
| Angel A2 final with prior Angel contact | 0 | **0** ✅ |
| Warm-lead validation subjects (either cohort) | 0 | **0** ✅ |
| Unresolved / ambiguous identities (either cohort) | 0 | **0** ✅ |
| Within-list duplicate LinkedIn URLs (each) | 0 | **0 / 0** ✅ |
| Cross-list duplicate LinkedIn URLs | 0 | **0** ✅ |
| Within-list duplicate normalized names (each) | 0 | **0 / 0** ✅ |
| Every selected person in the authoritative accepted-lead population | 60 / 60 | **60 / 60** ✅ (exact LinkedIn-URL match to `SI8 Rights Verified Master 090126.txt`) |
| Every selected person has traceable prior campaign + alias history | 60 / 60 | **60 / 60** ✅ (`Original Campaign (master)` + `All Prior Campaigns` + `All Prior Aliases` populated on every row) |
| No one selected due to prior agreement with the tested hypothesis | required | **Confirmed** — see §8 |
| Sending alias | Vanessa (B2) / Angel (A2) on every row | **✅ / ✅** |
| Dripify import files match audit files person-for-person | required | **✅ / ✅** (60 each, same LinkedIn URLs) |

Identity key: normalized LinkedIn URL throughout.

---

## 8. Selection was NOT on the dependent variable

Ranking used **only** objective role/organizational-context signals from the master `Position` / `Industry` / `Company` fields and campaign metadata. The ranking functions never read `Previous Response`, response sentiment, interest score, whether the person mentioned copyright / legal pain / uncertainty, or whether they seem likely to give a positive answer or want CRC. The `Prior Response Summary` column is carried for **audit only** and was not an input to selection or ordering. Tiebreaks are `(rank, approved-before-newly, last name, first name)`.

The one place prior-conversation content was consulted — Tier A quote verification (§5) — was used only to **remove** an unearned priority signal, never to add one, and resulted in 0 Tier A prioritisations.

---

## 9. PART 7 — Reserve inventory (qualified, not in this wave — NOT rejected)

### B2 reserve — `CR-TrackB2_Vanessa_Candidate-Universe.csv` unaffected; reserve file `CR-TrackB2_Vanessa_RESERVE.csv`

| Segment | Count |
|---|---|
| Approved-93 not selected into the 60 | 30 |
| Demoted from the 60 on qualification review (§3) — still qualified for later manual review | 3 (Katharina Botel-Azzinnaro, Klaus Borges, Steff Donkers) |
| `NEWLY ELIGIBLE — SCE STATUS RESOLVED` (Tunc Akyuz, Roozbeh Minouei, David Goode, Oliyah Joseph, Carl Fox, Aaron Teale, Dan Tapper) | 7 |
| **Total B2 reserve inventory** | **40** |

(The task's "expected reserve 33" = 93 − 60. Actual = 33 approved-93 not selected [30 + 3 demoted] + 7 SCE-newly-eligible = 40.)

### A2 reserve — `CR-TrackA2_Angel_RESERVE.csv`

| Segment | Count |
|---|---|
| Approved-65 held out (5 weakest) + 2 swapped out for SCE upgrades | 7 (Ali Shabaz, Ismail Ahmed, Leslie Zhong Han Kazuki Ng, Andre Yeo, Alexandre Perez, Jacob Norris, Giulio Musi) |
| `NEWLY ELIGIBLE — SCE STATUS RESOLVED`, not used in the 60 | 5 (Bardia Koushan, Ioana Diana Costea, Clement Edeh, Jay Pirabakaran, Duncan Thomsen) |
| **Total A2 reserve inventory** | **12** |

---

## 10. Files produced (all in `03_Sales/validation/`)

| File | Rows | Purpose |
|---|---|---|
| `SI8_CR-TrackB2_Vanessa_Wave1_FINAL.csv` | 60 | **Full audit CSV** — First/Last Name, Company, Position, Location, LinkedIn URL, Sending Alias (Vanessa), Validation Track, Original Campaign (master), All Prior Campaigns, All Prior Aliases, Previous Response, Prior Response Summary (heuristic), Objective Role/Org Rank, Rank Basis, Qualification Basis, SCE Status, Cohort Role |
| `SI8_CR-TrackA2_Angel_Wave1_FINAL.csv` | 60 | Full audit CSV (same schema; Sending Alias = Angel; adds nothing beyond the above) |
| `SI8_CR-TrackB2_Vanessa_Wave1_DRIPIFY-IMPORT.csv` | 60 | **Dripify import CSV** — narrow schema: First Name, Last Name, Company, Position, Location, LinkedIn. First line is a `#` banner ("… DRIPIFY IMPORT — NOT LAUNCHED"). |
| `SI8_CR-TrackA2_Angel_Wave1_DRIPIFY-IMPORT.csv` | 60 | Dripify import CSV (same schema) |
| `CR-TrackB2_Vanessa_RESERVE.csv` | 40 | B2 reserve inventory (audit schema + Cohort Role = "RESERVE") |
| `CR-TrackA2_Angel_RESERVE.csv` | 12 | A2 reserve inventory |
| `SI8_CR-TrackA2-B2_Wave1_FINAL-QA.md` | — | This file |

The prior review artifacts (`CR-TrackB2_Vanessa_Candidate-Universe.csv` [93], `CR-TrackA2_Angel_Candidate-Universe.csv` [65], `CR-A2-B2_POPULATION-QA.md`, the two `-Historical-Conversation.md` files) are unchanged in substance and remain for reference.

---

## 11. Candidates excluded / moved during final QA

| Person | Track | Action | Exact reason |
|---|---|---|---|
| Katharina Botel-Azzinnaro | B2 | Final 60 → reserve | Full master title: "AI Visuals & Journalism Researcher \| Broadcast Journalist \| Creative Producer \| News Presenter" @ German Council on Foreign Relations (Research Services). Journalist / researcher — CR-Track B qualification explicitly excludes. |
| Klaus Borges | B2 | Final 60 → reserve | Full master title leads "Seeking new opportunities to learn and grow" @ KBL STORES (Retail). No current commercial-AI-production role. |
| Steff Donkers | B2 | Final 60 → reserve | Full master title leads "Creative Project Lead \| Strategist \| Strategic Branding". Strategist; "Video Producer" present but not strong hands-on delivery evidence. |
| (Arkan Gahramy, Rob Gax, Thomas Grandperret) | B2 | Reserve → Final 60 | Backfill — next 3 strongest on-domain reserve candidates by deterministic rank+name order (response-blind). |
| 7 approved-65 (Shabaz, I. Ahmed, Ng, Yeo, Perez, Norris, Musi) | A2 | Universe → reserve | 5 weakest by objective org-context rank (held out to hit 60) + 2 displaced by the Xuan Pham / Rowland French upgrades. All remain qualified. |
| Xuan Pham, Rowland French | A2 | SCE-newly-eligible → Final 60 | Rank-1 org context (Amazon Prime Video & MGM Studios ECD International / Endemol Shine UK EP) — unambiguous material improvement over the approved-60's weakest members. |

No candidate was removed for a contamination reason discovered in this pass — the only contamination findings (§1, §2) both **lifted** precautionary exclusions.

---

## 12. Git & boundary

- **Files created:** the 7 files in §10 (all under `03_Sales/validation/`).
- **Files modified outside `03_Sales/validation/`:** none.
- **`git status`:** unchanged except the new untracked files inside the already-untracked `03_Sales/validation/` directory. The 7 pre-existing modified tracked files (`.gitignore`, `claude.md`, `DISCOVERY-LOG.md`, 4 CRC files) and all other pre-existing untracked paths are untouched.
- **Not touched:** CRC/product code, `claude.md`, `BUSINESS_PLAN`, `ICP-DEFINITIONS.md`, the current JD Track A/B FINAL CSVs, the approved candidate-universe CSVs.
- **No commit, no push, no Dripify interaction, no campaign launched, no message sent.**
