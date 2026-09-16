# Taiwan AI Subsidy Program — 開發產業AI便利工具及補助計畫 (2026)

**Status:** ACTIVE — reference document
**Added:** 2026-08-25
**Restored:** 2026-09-16 — this file (and its raw-text companion in `03_Sales/crm/raw/anchor-film/`) had gone missing from `main` since an unresolved history event around 2026-09-11; content recovered byte-for-byte from a `recovery/pre-territory-main-worktree-2026-09-11` snapshot branch. Root cause of the loss not investigated — flagging in case other files from the same event are still missing.
**See also:** `01_Business/research/TAIWAN-CROSSDOMAIN-AI-GRANT-2026-SMEA.md` — a second, distinct Taiwan grant program (different administering agency, different October cycle) Alice Feng surfaced 2026-09-15. Do not conflate the two programs' eligibility/capital rules.
**Source:** `AI 領航推動提案草案.pptx` — a proposal-drafting template/briefing deck for applicants to this program (10 slides; slides 8-10 are fill-in-the-blank ("XXXX") applicant templates, not company-specific content). **Provenance confirmed 2026-08-25**: sent directly by Alice Feng via chat, who noted the program itself isn't officially announced until September — ITRI (工研院) gave her early access to this briefing deck ahead of the public announcement.
**Raw source:** `03_Sales/crm/raw/anchor-film/2026-08-25-ai-subsidy-proposal-draft-moda.pptx` (gitignored, local only — large binary) and `...-extracted-text.txt` (tracked, full slide-by-slide text extraction)
**Why filed here, not only under Anchor Film:** the announcement date matches what Alice Feng described on the [[CALL-2026-08-21-B164-Alice-Feng-Anchor-Film]] call ("Ministry of Digital Affairs opens ~Sept 2026") almost exactly, and gives real numbers behind the grant-mechanics facts already logged there — but the program itself is open to any qualifying Taiwan company, including SI8's own future Taiwan-entity option if that's ever pursued (see CLAUDE.md's "government-grant opportunity" as a standing, not-yet-scoped BD motion, per the ChatGPT analysis of the Aug 21 call, §20).

---

## Program identity

**Administering agency:** 數位產業署 (Digital Industries Administration, DIDA — under the Ministry of Digital Affairs / 數發部)
**Program name:** 開發產業AI便利工具及補助計畫 ("Developing Industry AI Convenience Tools" Subsidy Program)
**Context slide (slide 1):** positioned under the national "AI新十大建設推動方案" (AI New Ten Major Construction Plan, 2025-2028), citing the plan's own core-approved text, 115年1月版 (Jan 2026 ROC-calendar edition), pp. 41-42.

## Subsidy amount — the number JD asked for

**NT$6.7 million (670萬元) maximum per case, capped at 50% of the total approved project budget.**

That means a fundable project must be sized at **NT$13.4 million total minimum** to draw the full subsidy (50% self-funded / 50% subsidized) — the same 50/50 structure, and the same registered-capital-linked capping logic, Alice described on the Aug 21 call, now with the program's own real ceiling number attached.

**USD equivalents** (@ NT$31.89/USD, XE.com spot rate, 2026-08-25 — a live market rate that moves; re-check before using in anything time-sensitive like a proposal budget):

| | NTD | USD (approx.) |
|---|---|---|
| Subsidy cap | NT$6.7M | ~$210,100 |
| Min. total project | NT$13.4M | ~$420,200 |

The NT$6.7M cap applies identically to **both** eligible tracks:

| Track | Scope |
|---|---|
| **A. AI Agent 產品化服務** (AI Agent productization services) | Task orchestration, decision execution, agent collaboration, RAG (retrieval-augmented generation) / CAG (cache-augmented generation), A2A (Agent2Agent) |
| **B. AI 模型輕量產品化服務** (Lightweight AI model productization services) | Model distillation, fine-tuning, quantization, pruning, RLHF-style expert-feedback reinforcement learning, domain-specific / on-device hardware-software co-optimization |

## Timeline

| Milestone | Date |
|---|---|
| Expected announcement | **2026-09-01** |
| Application deadline | **2026-09-30, 5:00pm** (online submission; 30 calendar-day window) |
| Earliest execution start | Retroactive to the announcement date |
| Latest project completion | **2027-10-31** (execution period ~1 year; "備註" notes the schedule may shift depending on Legislative Yuan budget-approval timing) |

## Applicant eligibility (slide 2)

- Single company or joint (consortium) proposal allowed.
- Lead applicant must meet **at least one** of:
  1. Has dedicated AI personnel (AI-degree holders, AI-certified staff, or AI-trained staff — per DIDA's own May 2026 "AI Industry Talent Recognition Guidelines")
  2. Holds DIDA's "AI-category AI Technology Service Institution" registration certificate
  3. Is a domestically (Taiwan-)registered sole proprietorship, partnership, or company whose Ministry of Finance tax-registry industry classification is **J582** (software publishing), **J62** (computer programming/consulting/related services), or **J63** (information services)
- Not a bank-blacklisted entity; positive net worth (shareholders' equity).
- **Categorically excluded: PRC-invested (陸資) enterprises, and any branch office of a domestic-or-foreign for-profit entity established in Taiwan** — this is the exact eligibility rule Alice described on the call, citing her client "Hearst" as a real rejected example.
- Application-volume caps: max **2** of this agency's own R&D subsidy programs per applicant within any 3-year window; max **3** total concurrent government program applications/executions per company or per responsible person at the same time.

## Eligible cost categories (slide 5)

- R&D/innovation personnel salaries (system dev, deployment, ops, project management, marketing — all participants must keep timesheets)
- Consultant/expert fees (domestic + international)
- Training costs
- Equipment usage/maintenance fees — bandwidth, cloud hosting, hardware, software and software upgrades classified as capital equipment; AI cloud service usage fees; equipment rental
- Promotional/outreach costs
- Intangible-asset licensing + outsourced research — **combined cap: ≤40% of total project budget**; outsourced research excludes equipment/software procurement but may include necessary research/survey costs
- Consumables and raw materials
- Outsourced labor/verification services
- Domestic travel only

## Review criteria (slides 6-7, near-identical for both tracks A and B)

Four weighted sections:
- **計畫價值 (Project value) — 40 pts:** target-customer need/pain-point analysis, customer engagement/go-to-market plan, competitive positioning + expected quantified benefit, AI compute-architecture performance metrics
- **規劃內容 (Plan content) — 40 pts:** productization method, business/monetization model, validation plan (domestic test site, feedback loop), commercial validation (pricing model, retention/AARRR metrics, order pipeline), operations plan (org/staffing, business model, profit sustainability); technical architecture + security management (≥7% of total budget); two-phase delivery — Phase 1 = POC/POS technical + field validation, Phase 2 = POB field-scaling/order count, weighted 20% of this section; Track B adds "AIEC benchmark pass preferred" for language models
- **可行性分析 (Feasibility analysis) — 20 pts:** track record/execution capability, IP risk assessment, schedule/checkpoints/budget structure
- Explicit requirement: AI application must be the company's core business focus or a stated strategic priority; project timeline/checkpoints must carry concrete, quantified metrics.

## Relevance to SI8

1. **Corroborates and quantifies Alice Feng's grant-mechanics claims** from the Aug 21 call (registered-capital-linked cap, foreign-entity exclusion, 50/50 split) — now with real figures (NT$6.7M cap, NT$13.4M minimum total project size) rather than her own smaller illustrative numbers (she used NT$6M/NT$12M as her own company's specific case).
2. **Timing match confirmed**: the 2026-09-01 announcement date lines up with what Alice described as the Ministry of Digital Affairs window opening "~Sept 2026" — confirmed 2026-08-25 as the specific program she meant (she sent this exact deck).
3. **Lead-applicant math, confirmed 2026-08-25**: SI8's own Taiwan entity has registered capital of **NT$1.55M (~$48,600)**, well below Anchor's (~NT$6M / ~$188,200, per the Aug 21 call). Applying the capital-linked cap above, SI8 as lead applicant would be capped around **NT$1.55M / ~$48,600 subsidy on a ~NT$3.1M / ~$97,200 total project**, versus **~NT$6M / ~$188,200 subsidy on a ~NT$12M / ~$376,400 total project** if Anchor leads with SI8 folded in as a sub-scope/partner instead — roughly a 4x difference in what the whole proposal could be sized at, in either currency. JD proposed the Anchor-leads structure directly to Alice in an Aug 25 chat; she responded by confirming SI8's capital figure, suggesting she was running the same calculation. See the interaction log in [[anchor-film]] (`03_Sales/crm/anchor-film.md`) for the exchange.
4. **Still open**: whether SI8 (a Texas S-corp DBA operating a Taiwan entity) is otherwise eligible under the foreign-entity/PRC-capital exclusion rule at all — not yet independently verified against the program's own written eligibility text (that text wasn't part of the deck excerpted above), and worth a direct legal read once the official announcement lands in September (see the standing OPEN QUESTION already logged in [[CALL-2026-08-21-B164-Anchor-Film-ChatGPT-Analysis]]).
