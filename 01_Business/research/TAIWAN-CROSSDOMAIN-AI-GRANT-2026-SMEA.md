# Taiwan Cross-Domain AI Co-Creation Grant (2026, SME & Startup Administration) — October Cycle

**Source:** Alice Feng (Anchor Film) via LINE, 2026-09-15, sharing 2 slides from a draft (草案) deck credited to 中小及新創企業署 (SME & Startup Administration, MOEA) — a different agency from the Ministry of Digital Affairs program tracked separately (Sept 2026 cycle; see note below on that file's current status).
**Status:** EARLY LEAD — draft-stage program materials, not a confirmed RFP. Do not treat as validated grant terms until the full announcement is obtained.
**Purpose:** Track a second, distinct Taiwan government funding opportunity Alice surfaced unprompted, and keep FACT/HYPOTHESIS/OPEN QUESTION separated per SI8's Decision Quality Standards (`06_Operations/DECISION-QUALITY-STANDARDS.md`).

---

## 1. Provenance

Slides are marked 草案 (draft) — not a finalized public RFP. Source and reliability equivalent to how the Sept MODA deck was obtained (an early-access briefing deck, not the eventual formal announcement). Raw images: `03_Sales/crm/raw/anchor-film/2026-09-15-crossdomain-grant-slide-1-overview.jpg`, `...-slide-2-agentic-ai.jpg`.

## 2. FACTS (from the two slides as shown)

- Issuing body: 中小及新創企業署 (SME & Startup Administration).
- Stated purpose: implement Executive Yuan's "中小微企業多元振興發展計畫" and MOEA's "AI新十大建設" — drive domestic SMEs toward cross-domain (跨域) co-created technology/service value, using tech or business-model innovation, to accelerate technology development, commercialization, and new market opportunity.
- Three proposal tracks: (1) Agentic AI 與領域應用, (2) Sustainable AI 與災防管理, (3) Physical AI 技術與服務.
- R&D outcomes must reach a three-stage commercialization goal: 場域驗證 (field validation) → 國內落地 (domestic deployment) → 國際出海 (international expansion).
- Eligibility: at least 2 (or more) SMEs must apply jointly; the lead applicant (主導廠商) must be an SME.
- Bonus-scoring items (可酌予加分): (1) at least one alliance member is a startup; (2) a committed, verifiable carbon-reduction figure at project close; (3) extending the R&D result into international/third-country markets.
- Funding: subsidy capped at NT$9,000,000 per application; subsidy cannot exceed 50% of total project expenditure; stated relationship is 補助款 ≤ 自籌款 ≤ 實收資本額 (subsidy ≤ self-funded portion ≤ paid-in capital).
- Execution window: from the 1st of the month following approval through 116/10/31 (2027-10-31 ROC calendar), estimated ~9 months.
- Expected outcome at project close: 已試量產、試營運或上市銷售/服務 (trial production, trial operation, or market sales/service already reached); 若獲海外營收尤佳 (overseas revenue is explicitly preferred, not required).
- Agentic AI track's listed sub-technology areas: agentic frameworks (autonomous task decomposition/planning/execution/tool use), domain knowledge base + RAG, tool/API interoperability (explicitly names MCP/A2A), multimodal perception, "trustworthiness and evaluation" (可信任與評測 — hallucination suppression, traceable/auditable decision logs, human hand-back on abnormal cases), model tuning/lightweight models, cloud/edge deployment.
- Listed proposal shapes: (1) AI-optimize an existing process; (2) existing product + AI innovation — 1.0→2.0 value-add/subscription, or product-line upgrade, or business-model/scenario migration.
- Slide 2 lists 6 named prior cross-domain-alliance case studies (113/114/115 program years) as precedent examples of the alliance format — not evidence about this specific October cycle's difficulty or acceptance rate.

## 3. WORKING HYPOTHESES (not yet validated)

- **H1 — Consortium fit:** Anchor Film + SI8 may constitute a plausible eligible consortium (2+ SMEs, SME-led), pending confirmation of SI8's Taiwan-entity SME status and the program's exact eligibility text.
- **H2 — Technical fit:** SI8's current architecture maps onto the Agentic AI track's listed sub-areas without requiring SI8 to build a generic AI-video production or capture platform: Living Knowledge → domain knowledge base/RAG; the Decision/Readiness Engine hypothesis → agentic reasoning/decision layer; CRC → conversational acquisition/explanation surface; Commercial Assurance → the commercial decision output; assessment/evidence history → the "trustworthiness and evaluation" traceability/audit requirement; external production-system integration → the tool/API interoperability requirement (MCP/A2A is directly named, which is notable since SI8 already treats MCP as a live integration surface elsewhere in the platform).
- **H3 — Complementary roles:** Anchor could supply real production workflow, a Taiwan field-validation environment, and existing enterprise relationships (domestic deployment); SI8 could supply the international-commercialization narrative and the Agentic AI/decision-layer thesis.
- **H4 — Grant funds validation SI8 already wants:** the grant could fund work that overlaps with SI8's own ACTIVE STRATEGIC HYPOTHESIS validation (see `claude.md` "Decision Engine" hypothesis) rather than being an unrelated distraction.

None of H1–H4 are confirmed. In particular: winning or being eligible for this grant is not evidence of customer demand, willingness to pay, or product-market fit for the Decision Engine hypothesis — it would only be evidence of grant-eligibility fit.

## 4. OPEN QUESTIONS (must be resolved before any commitment)

1. Full RFP/eligibility text — the 2 slides are a draft summary, not the governing document.
2. Whether SI8's Taiwan entity qualifies as an eligible SME lead or consortium member under this specific program (distinct question from the Sept MODA program's own capital-linked cap, which does not automatically transfer here).
3. Scoring rubric — specifically whether overseas revenue is scored as (a) existing revenue, (b) contracted/pipeline revenue, or (c) a credible in-project plan; the slide text ("尤佳") only signals a preference, not a scoring weight.
4. Whether Anchor or SI8 should be lead applicant, and the basis for that choice (capital, prior grant history, SME status).
5. Eligible expense categories for SI8's kind of work (software/decision-layer R&D vs. production/hardware-oriented spend more typical of past case studies shown).
6. IP ownership / licensing terms for a jointly-funded R&D outcome.
7. Application deadline and full timeline — not stated on either slide.
8. Relationship (if any) between this program's capital/self-funding math and the Sept MODA program's "subsidy ≤ registered capital" rule — do not assume it is identical.

## 5. DECISION

No decision has been made to apply, to choose a lead applicant, or to scope a joint project. Per the interaction log in `03_Sales/crm/anchor-film.md`, the immediate next step is administrative (obtain the full program materials from Alice/ITRI/SMEA), not strategic commitment.

## 6. Relationship to the September MODA program

SI8's Sept-cycle research on the Ministry of Digital Affairs 開發產業AI便利工具及補助計畫 (NT$6.7M cap, 50% match, foreign-entity/PRC-capital exclusion, announced 2026-09-01, deadline 2026-09-30) was previously tracked at `01_Business/research/TAIWAN-AI-SUBSIDY-PROGRAM-2026-MODA.md`. **That file is currently missing from `main`** (last seen on a `recovery/pre-territory-main-worktree-2026-09-11` snapshot branch, not reachable from current `main` history) — flagged here as a fact discovered while cross-referencing, not yet investigated or fixed. Do not assume the two programs share identical capital/subsidy mechanics; they are issued by different agencies (MODA vs. SMEA) with separately stated rules.
