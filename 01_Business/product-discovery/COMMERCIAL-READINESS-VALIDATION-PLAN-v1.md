# Commercial Readiness — Market Validation Plan v1

**Status:** WORKING HYPOTHESIS VALIDATION — not a product decision, not a roadmap commitment.
**Created:** 2026-08-30, per SI8 Strategic Handoff (Commercial Readiness Market Validation System).
**Parent context:** `CLAUDE.md` → ACTIVE STRATEGIC HYPOTHESIS section, and Execution Gap **§3s** ("Validate Commercial Readiness Decision Layer"). `01_Business/plans/BUSINESS_PLAN_v4.md` → "Strategic Product Direction Under Validation." This plan operationalizes §3s's Demand workstream; it does not restate or replace either source.

---

## 0. Operating model

Two layers, kept deliberately separate:

- **Strategic OS** (PMM / strategic product layer) — defines hypotheses, ICPs, experiments, evidence standards; interprets results; makes strategic decisions.
- **Execution / Developer** (this plan and everything under `03_Sales/validation/`) — operationalizes approved experiments, maintains execution documentation, constructs and validates datasets, enforces experiment rules, captures raw evidence, calculates mechanical metrics, produces review-ready evidence.

Execution does **not** independently promote experiment results into company strategy, approve new product architecture, create a Decision Engine PRD, or change frozen/current product definitions. Evidence returns to Strategic OS for interpretation via the Validation Review Template (`03_Sales/validation/VALIDATION-REVIEW-TEMPLATE.md`).

---

## 1. Strategic context

SI8 is investigating whether it should ultimately own a specialized **Commercial Readiness decision capability** for AI-generated media.

Three distinct concepts, not interchangeable:

- **Production state / provenance** — what happened, what can be evidenced.
- **Commercial readiness** — what those facts and evidence mean for the intended commercial use.
- **Commercial Assurance** — SI8's existing higher-assurance, human-reviewed institutional assessment product.

Working lifecycle: **PLAN → RECORD → DECIDE → ASSURE** (where necessary). SI8 does not currently intend to own RECORD/provenance — that may come from production systems, customers, platforms, C2PA systems, rights systems, spreadsheets, or other tools. The hypothesis under test concerns the **DECIDE** layer and its relationship to CRC and Commercial Assurance.

This remains a WORKING HYPOTHESIS. Nothing in this plan or its execution specs converts it into approved product architecture.

---

## 2. Two validation tracks, each with a sub-experiment

Per Strategic OS decision (2026-08-30): the handoff's original "ICP 1"/"ICP 2" labels are **not used** in execution — they collide with the live, authoritative `03_Sales/ICP-DEFINITIONS.md` (ICP 1 = Agency, ICP 2 = Legal, ICP 3 = Line Producer/deferred). `ICP-DEFINITIONS.md` is not modified by this initiative.

**Updated per Strategic OS synchronization memo, 2026-09-11 ("SI8 Commercial Readiness Validation — Strategic Thesis & Product-Surface Mapping"):** each track now has a named primary experiment and a named sub-experiment, run by a different alias, testing a different link in the same RECORD→DECIDE chain. The sub-experiments (A2, B2) are **not** new independent top-level tracks — they refine Track A/B, and are documented that way here and in their own spec files (§9).

### CR-Track A — B2B Readiness

B2B production organizations or platforms that already capture, or are actively implementing, reliable production state/evidence for AI media (production companies, commercial production houses, AI-forward agencies/studios, production workflow/platform companies). Provenance-technology agnostic — do not assume C2PA, blockchain, or any specific method.

**Hypothesis:** once production state/evidence is captured, these organizations still have a distinct problem determining what that evidence *means* for the project's intended commercial use.

**Core research question:** "Once provenance/documentation is solved, what happens next?"

- **A1 — JD: After Documentation.** Tests whether RECORD is followed by delivery directly, or by RECORD → an additional determination/review → delivery. Negative evidence ("documentation itself is normally sufficient") is valid and important. Full spec: `03_Sales/validation/CR-TRACK-A-B2B-READINESS-SPEC.md`.
- **A2 — Angel: Decision Ownership.** If a separate readiness determination exists, who owns it (producer / production org / client / agency / legal / other)? Also probes what happens when the available information doesn't yield a clear answer. Locates the hypothesized DECIDE job organizationally rather than assuming SI8 already knows who the buyer/user is. Full spec: `03_Sales/validation/CR-TRACK-A2-DECISION-OWNERSHIP-SPEC.md`.

### CR-Track B — Creator Readiness

Individuals — Creative Producers, AI filmmakers, hands-on AI creative leadership — who want direct commercial-readiness guidance for an AI media project before, during, or after production, without adopting an enterprise platform.

**Hypothesis:** creators want project-specific readiness guidance and will actually use a free tool (CRC) to get it — not merely discuss the topic.

**Important:** ICP 2/Track B may *also* surface provenance/documentation pain. That is irrelevant to this hypothesis — do not treat prompt-logging or provenance-capture pain as validation of Track B. The test concerns commercial readiness specifically.

- **B1 — JD: Creator Readiness.** Tests job existence — do hands-on commercial AI creators actually perform project-level checks (tool commercial-use terms, licensing, source-asset tracking, likeness releases, music rights), not merely hold an opinion about AI copyright risk? CRC is offered manually, after a substantive response, as a behavioral test — **not included in the automated discovery sequence.** Full spec: `03_Sales/validation/CR-TRACK-B-CREATOR-READINESS-SPEC.md`.
- **B2 — Vanessa: Decision Friction.** After a creator performs their normal commercial-use checks, does meaningful uncertainty remain, and does it change production behavior (creative changes, dropped asset, delay, escalation, outside/client/legal review, avoidance)? Negative evidence ("I can normally resolve it myself and it doesn't materially affect the project") is valid. Full spec: `03_Sales/validation/CR-TRACK-B2-DECISION-FRICTION-SPEC.md`.

**The warm-lead research program (`03_Sales/validation/CR-WARM-LEAD-RESEARCH-SPEC.md`) is not gated to Track A.** Several named candidates carry signal relevant to both tracks; classification happens per-conversation, not per-list.

---

## 3. Parallel execution model

Two tracks of *activity*, run simultaneously — not to be confused with the two validation tracks above:

- **High-information warm leads** — existing relationships/responders, used for qualitative depth. Spec: `CR-WARM-LEAD-RESEARCH-SPEC.md`.
- **STEC managed ICP tests** — Standing Encore-run outreach at volume, launched in parallel with warm-lead outreach, not gated on warm-lead responses. Specs: `CR-TRACK-A-B2B-READINESS-SPEC.md`, `CR-TRACK-B-CREATOR-READINESS-SPEC.md`.

STEC inventory is staged, not consumed in one irreversible batch, to preserve the ability to iterate messages/follow-ups on new qualitative evidence.

---

## 4. Evidence standards

All evidence is captured and classified per SI8's existing Decision Quality Standards (`06_Operations/DECISION-QUALITY-STANDARDS.md`):

- **CURRENT FACT** — confirmed by direct evidence (interview, reply, transaction). Cite source.
- **WORKING HYPOTHESIS** — reasoned belief not yet validated, with a validation method attached.
- **DECISION** — a strategic choice, made by Strategic OS only.
- **OPEN QUESTION** — uncertainty that materially affects future decisions, kept visible.
- **DEFERRED ISSUE** — flagged, not resolved, not forgotten.

Raw evidence is never rewritten into a stronger claim than the source supports. Example from the handoff, preserved as the governing pattern:

> FACT: "7 of 12 substantive Track A responders said legal reviews the record." **NOT automatically** DECISION: "Legal is the buyer." The latter requires Strategic OS review.
> FACT: "5 creators completed CRC." **NOT automatically** "Track B validated."

Numerical validation thresholds are not defined in this plan. Flagged as an **OPEN QUESTION** for Strategic OS — see §6.

---

## 5. Falsification logic

### CR-Track A

**Positive:** a distinct determination exists after documentation; repeated legal/BA/client review; the process is manual/uncertain/slow/costly; a project can be blocked/delayed; customer requirements drive it; prospects want an independent/systematic solution; prospects want integration/demo/call.

**Negative:** production documentation itself is sufficient; no separate determination occurs; an existing system already solves it satisfactorily; risk is simply transferred contractually and nobody wants another layer; the current manual/legal solution isn't meaningfully painful; no willingness to change behavior.

### CR-Track B

**Positive:** creators want project-specific readiness guidance; creators actually start CRC; creators complete checks; outputs surface meaningful unknowns; outputs affect real decisions; repeat use occurs or is requested; willingness to pay/escalate appears.

**Negative:** people discuss the topic but don't use CRC; generic copyright concern doesn't translate into project checking; users don't find outputs actionable; no repeat-use behavior; provenance/documentation discussion dominates without readiness demand.

---

## 6. Open questions for Strategic OS

- **Numerical validation thresholds** — none exist yet in SI8 methodology. What counts as "enough" positive evidence to promote a hypothesis? Flagged, not assumed.
- **LinkedIn-URL / identity-key coverage gap** — `03_Sales/CRM.md` (the canonical 171-row pipeline tracker, and the file used to verify all 16 named warm-lead candidates) has **no LinkedIn URL field at all**. Full findings and proposed fallback in `03_Sales/validation/VALIDATION-LEDGER-SCHEMA.md` §"Identity-key coverage." Executing the proposed compound-match backfill would need a small one-off script — not yet authorized, flagged as a candidate next step.
- **Teddy Sandu employer identity conflict** (McCann/Unilever@Omnicom vs. MullenLowe/IPG across different pipeline-analysis cycles) — unresolved, must be reconciled before any Track A/B outreach to this candidate.
- **A1/B1 launch status vs. respondent evidence (opened 2026-09-11, unresolved as of this sync).** The 2026-09-11 Strategic OS synchronization memo states the A1/B1 (JD Track A/B) campaigns "have now launched" and names four current B1 respondents (Johnny Otto, Michael Fayek, Shyan Pawl, Henri Kang), instructing that these "must be logged verbatim in the appropriate evidence system before being used as durable repository evidence." **As of this same synchronization pass, no repository evidence supports the launch claim or any of the four respondents' current-campaign content:** `SI8_CR-TrackA-B_JD_Wave1_QA.md` §9 still reads "No Dripify campaign created. No LinkedIn message sent." (re-checked 2026-09-11, unchanged); no Supabase export newer than `supabase-export-2026-07-17.csv` exists; no current-campaign trace for Shyan Pawl exists anywhere in the repo; the only Henri Kang record found is a 2026-05-22 reply to an unrelated, earlier campaign (Angel alias, pre-dates Track B). Per this plan's own §4 evidence standard, this is logged here as an **OPEN QUESTION, not a FACT** — the campaign-launch/respondent claims are not promoted into `DISCOVERY-LOG.md` or `data/validation-ledger.csv` pending the actual source (export file, screenshots, or verbatim text) from Strategic OS.

---

## 7. Product boundaries preserved (unchanged by this plan)

- **CRC** — free, AI-assisted, does not certify, does not issue legal opinions, does not determine institutional commercial acceptability, does not replace human review. May be offered to Track A prospects as a **demonstrator/reference interface**, explicitly not framed as the eventual enterprise product.
- **Commercial Assurance Assessment** — paid, human-reviewed, institutional. Unchanged.
- **Living Knowledge** — governed institutional knowledge substrate. Unchanged; this validation package does not write to it (see §8).
- **Commercial Readiness Decision Engine ("DE")** — WORKING HYPOTHESIS ONLY. Not approved vocabulary outside this hypothesis context, not approved architecture, no PRD authorized, no API build authorized.

## 8. Explicit exclusions

Do not, on the strength of this plan or the evidence it produces:
- Modify `PRD_CRC_v1.0.md`, `PRD_LIVING_NOTEBOOK.md`, `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md`, `PRD_ASSESSMENT_SERVICE_v1.0.md`, `CRC_CURRENT_STATE.md`, `PRICING-STRATEGY-v3.0.md`, `TECHNICAL_ARCHITECTURE.md`, or `PRODUCT-STRATEGY-2026-06-28.md`.
- Modify `03_Sales/ICP-DEFINITIONS.md`.
- Write into `06_Operations/institutional-knowledge/notebook/` (Living Notebook / Living Knowledge) — that four-document system is architecture-frozen for governed knowledge claims, a different object than market-validation evidence.
- Create a Decision Engine PRD, build a generalized API, automate Commercial Assurance, or change official product vocabulary.
- Perform exhaustive ZebraTruth/Creation Rights competitive benchmarking as a prerequisite — escalate only if prospects name one as a current solution, compare SI8 directly to one, or independent adoption evidence validates the category.

---

## 9. Package index

| Doc | Path | Covers |
|---|---|---|
| A — this plan | `01_Business/product-discovery/COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md` | Strategic context, hypotheses, evidence/falsification standards |
| B — warm-lead spec | `03_Sales/validation/CR-WARM-LEAD-RESEARCH-SPEC.md` | 16-candidate research plan, informs both tracks |
| C — Track A / A1 STEC spec | `03_Sales/validation/CR-TRACK-A-B2B-READINESS-SPEC.md` | B2B org managed-outreach experiment (JD: After Documentation) |
| C2 — Track A2 spec | `03_Sales/validation/CR-TRACK-A2-DECISION-OWNERSHIP-SPEC.md` | Decision-ownership sub-experiment (Angel), within Track A |
| D — Track B / B1 STEC/CRC spec | `03_Sales/validation/CR-TRACK-B-CREATOR-READINESS-SPEC.md` | Creator managed-outreach + CRC funnel (JD: Creator Readiness) |
| D2 — Track B2 spec | `03_Sales/validation/CR-TRACK-B2-DECISION-FRICTION-SPEC.md` | Decision-friction sub-experiment (Vanessa), within Track B |
| E — ledger schema | `03_Sales/validation/VALIDATION-LEDGER-SCHEMA.md` | Evidence ledger fields, identity-key findings, Dripify sourcing-vs-contact methodology |
| E — ledger data | `data/validation-ledger.csv` | Row-level evidence (empty scaffold) |
| F — review template | `03_Sales/validation/VALIDATION-REVIEW-TEMPLATE.md` | Reusable per-cycle Strategic OS review artifact |

**Synchronization note (2026-09-11):** this plan, and the C2/D2 spec files above, were brought into alignment with the Strategic OS memo "SI8 Commercial Readiness Validation — Strategic Thesis & Product-Surface Mapping" (2026-09-11) — the A1/A2/B1/B2 naming, the A–H evidence-chain framing (§5a below), and the Dripify sourcing-vs-contact methodology (now in `VALIDATION-LEDGER-SCHEMA.md`) all originate from that memo. The memo's §7 claim that A1/B1 have launched, and its attribution of specific current responses to four named respondents, is **not** synchronized into evidence files — see the new Open Question in §6.

---

## 5a. The A–H evidence chain (2026-09-11)

The four experiments (A1, A2, B1, B2) are not four disconnected campaigns — read together they test one chain, per Strategic OS's 2026-09-11 memo:

| # | Question | Primarily tested by |
|---|---|---|
| A | Job existence — do people actually perform Commercial Readiness work? | B1, warm-lead evidence |
| B | Residual decision gap — does unresolved project-level decision work remain after normal documentation/checking/legal input? | A1, A2, B2, warm follow-ups |
| C | Consequence — does uncertainty actually affect production behavior, delivery, escalation, cost, or risk? | B2 (explicit); may surface elsewhere |
| D | Decision ownership — who actually makes the readiness determination? | A2, warm qualitative follow-ups |
| E | Decision inputs — what evidence/rules/judgment does that person use? | Increasingly, substantive follow-up conversations |
| F | Current substitute — how is the job performed today? | All four, opportunistically |
| G | Product behavior — will users actually use CRC/readiness tooling on a real project? | CRC referrals following substantive B1 responses |
| H | Demand / economics — will someone pay, who, under what circumstances? | **Substantially untested by the four automated campaigns** — a separate, later validation gate (§11 of the 2026-09-11 memo) |

Strong problem responses (A–F) must not be interpreted as willingness-to-pay evidence (H) — these remain independent gates, per §11 of Strategic OS's memo, before Surface 2 (the Decision/Readiness Engine) can move from WORKING HYPOTHESIS toward committed product architecture.
