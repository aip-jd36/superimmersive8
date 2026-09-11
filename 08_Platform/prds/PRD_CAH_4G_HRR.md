# PRD — CAH-4G: HRR V1 / Governed Research Interface (GRI)

**Status:** `CAH-4G.10 SLICE A — CLOSED / PRODUCTION-PROVEN` · `CAH-4G CONVERSATIONAL HRR — VISIBLE THREAD PRODUCTION-PROVEN / BOUNDED CONVERSATIONAL CONTEXT NOT STARTED` (CAH-4G.10C, 2026-09-11). **Slices 1–7 COMPLETE**; merged to `main` (`0413291`) and deployed (CAH-4G.8). CAH-4G.10P found a DEPLOYMENT GAP (Slice A reviewed locally, never pushed); CAH-4G.10I resolved it — fast-forward-pushed `d06c668 → 4b9ee5a` (no force), zero new test failures. **CAH-4G.10C (2026-09-11):** a PM-performed authenticated production UAT against the internal synthetic fixture `CA-RLK-2a PROD SMOKE` / `ASSESS-007-2026-09-07` passed all 10 acceptance checks — production is confirmed serving the append-only conversational thread: topic + 2 successive free-form questions all remained visible together (Copyright ownership / Copyrightability / Commercial use), the composer cleared each time, tab-switch and inspector close/reopen preserved the thread, workbook navigation cleared it (matching the V1 client-memory contract, not a defect), and "Clear conversation" reset the thread with no assessment-state change. Full evidence: `HRR_CONVERSATIONAL_ARCHITECTURE.md §FF`. **What is closed: the VISIBLE thread only.** Slice B (bounded conversational context / referent resolution) remains **NOT STARTED / NOT AUTHORIZED** — each question is still researched fully independently; no `prior_context`, no transcript to the model. Non-blocking UAT observations (thread density, duplicate "You asked" echo, a future navigation-persistence product question) recorded in `§HH` — none are Slice-A defects, none fixed here. Successive HRR research turns are append-only in the integrated + production-proven code — asking a second question no longer replaces the first (`hrr-thread.ts`; `ReviewerLkLookup` → `useReducer`). **VISIBLE, not CONTEXTUAL:** each free-form question is still classified independently from its own text alone; **no `prior_context`**; no prior turn reaches the classifier / retrieval / applicability / BI / composition / audit. Topic shortcuts still 0 model calls; free-form still ≤1 classify-only; audit unchanged (one `lk_research` per governed-research action; "Clear conversation" makes no server call); no persistence, no schema/migration, no CRC change. Zero new test failures vs a fresh `08f20e9` baseline. Slice B (bounded follow-up referent) is a separate, independently-optional change — not started. **CAH-4G.9 (2026-09-10, DESIGN ONLY):** PM production UAT PASS on the initial surface / topic shortcut / `copyright_ownership` / unresolved `copyrightability` / free-form NL classification / semantic + authority boundaries — but a **material product finding**: the single-turn model is *too visible* (asking a second free-form question replaces the first). A Human Reviewer expects a **conversational research thread** (interaction model like CRC). **Not an unsafe defect, not a rollback** — a V1 research-experience gap. CAH-4G is **not yet `CLOSED / PRODUCTION-PROVEN`**. Architecture designed in **`HRR_CONVERSATIONAL_ARCHITECTURE.md`** + **`ADR-003`**: visible thread = client-only UI (no persistence, refresh-clears); follow-up classifier gets a **bounded enum-only `{topic, scope, bi_status}` referent**, never the transcript; **one-model-call ceiling preserved** (topic 0 / free-form ≤1 / follow-up ≤1); **no audit change, no schema/migration, no CRC change**; reviewer conversation is never a project fact or evidence (§M). Non-goal for V1: hypothetical / jurisdiction-qualifier research (needs PM + applicability-architecture review). Implementation = Slices A→B→C, none begun. **CAH-4G.7P:** the 19-commit series was rebased onto `origin/main` (`eb4641f`) with proven patch equivalence and zero new test failures; the rebased HEAD was pushed to `origin/work/cah-4g-current-main-integration`. Preview credentialed UAT was blocked by a known Cloudflare Turnstile issue in Preview mode. **CAH-4G.8 — Controlled Production Integration (2026-09-10, PM-authorized):** `origin/main` had advanced `eb4641f → 9219496` (+5 commits, all NY §396-b synthetic-performer Living Knowledge governance — clean re-rebase, one non-overlapping test-file hunk; a new `likeness`-topic reviewer-eligible governed claim `CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1`, jurisdiction-scoped to New York, entered `TOPIC_CLAIMS_FIXTURE`). The 20-commit series was re-rebased onto `9219496` (`git range-diff` all `=`), re-verified (`tsc` clean; full-suite failing set byte-identical to a fresh `9219496` baseline — zero new failures; `next build` exit 0), then **fast-forward-merged to `main` `9219496 → 0413291` (no force)** and pushed. Production (`app.superimmersive8.com`) deployment confirmed by route topology: `POST .../reviewer-lk/research` → `401 {"error":"Unauthorized"}` (exact contract), legacy `GET .../reviewer-lk` → `404` (retired). **The authenticated production browser UAT + the bounded live classifier eval + the production audit-DB proof were NOT performed — the Claude Chrome extension is not connected to this session, and there is no admin/reviewer credential, `ANTHROPIC_API_KEY`, or audit-DB access here.** This document + `HRR_GRI_TECHNICAL_DESIGN.md` (§S/§T/§U/§V) + `ADR-002` are the implementation contract. **The Living Knowledge tab is the converged Governed Research Interface: topic shortcuts + Ask HRR both POST `.../reviewer-lk/research` → `runAuditedHrrResearch()` (audit-before-content, fail-closed) → one `HrrResearchAnswer` → one `<HrrResearchAnswerView>` (consultative order hardened CAH-4G.7). Single-turn; raw question never persisted. The legacy `GET .../reviewer-lk` topic route is RETIRED (CAH-4G.7). CRC unchanged.** **Not `CLOSED`/`PRODUCTION-PROVEN`: the code is merged and deployed, but the authenticated production visual UAT and the live classifier cost/quality eval remain pending a credentialed browser session (blocked on tooling/credentials, not on any defect).** The one genuinely-open design item is `HRR_MAX_RESOLVED_TOPICS` (§T-4, kept at 2 — a usage experiment, not a blocker).

**CAH-4G.1 (2026-09-10):** Slice 1 shipped `BiIntent` + the `userGoalsToBiIntents` adapter with a proven byte-for-byte CRC regression (`BiResult` deferred). The **mixed-intent authority contract is corrected** (see §5, §8, §19-6): a prohibited assessment-decision intent never converts a permitted research clause to a determination request.

**CAH-4G.2 (2026-09-10):** Slice 2 shipped the free-form research-intent classifier (`interpret-research-intent.{ts,anthropic.ts,mock.ts}` — one classify-only Anthropic call, enum-only schema, `thinking` disabled, fails closed and never throws) and the deterministic `hrrAuthorityGate` (`hrr-authority-gate.ts`). The classifier does not retrieve, evaluate applicability, run Bounded Interpretation, or compose an answer.

**CAH-4G.3 (2026-09-10):** Slice 3 shipped the converged pipeline in a new `lib/hrr/` directory: `runHrrResearch()` (PURE — one downstream path for both the topic chip and the free-form classifier+gate), the `researchIntentToBiIntent` / `reviewerClaimToBiResult` adapters, and the `HrrResearchResult` structured internal result. `BiResult` (the minimal result contract) was introduced with **zero CRC call-site / test churn** (`RetrievalResult` structurally satisfies it) and proven byte-for-byte behavior-neutral. Reviewer selection / eligibility / applicability are byte-unchanged; `not_met` claims are excluded from BI and returned separately; the raw reviewer question never enters selection/applicability/BI. No composition, no route, no UI, no audit.

**CAH-4G.3A (2026-09-10) — Slice 3 semantic correction (CONDITIONAL PASS resolved):** deterministic applicability is now a **generic upstream semantic input to Bounded Interpretation** (`BiResult.applicability`, optional — CRC byte-unchanged). A governed proposition with an `unresolved` applicability requirement is interpreted as **`relevant_applicability_unresolved`, never `directly_relevant`** — the proposition stays visible + verbatim, the unresolved requirement is preserved for composition, and it is never a pass/fail or a negative finding. This makes the implementation match §13 / §18-9 of this PRD. No new BI status; no composition workaround; no CRC change. Zero new test failures; `tsc` clean; `next build` exit 0.

**CAH-4G.7 (2026-09-10):** Slice 7 = acceptance / hardening / integration closeout. **Visual review:** with no authenticated preview/local browser path in the build environment, the 7 §19 cases were server-rendered from the real components + the real deterministic pipeline and reviewed for structure/density/wording. **Composition hardening (renderer only, `HrrResearchAnswerView.tsx` — no BI / composition / contract change; `bi_summary_blocks` still verbatim):** the review found the `relevant_applicability_unresolved` answer buried its point behind the BI-joined governed reading and re-stated `jurisdiction`/refs 5–6×. Fix: "what remains unresolved" now leads (right after orientation); the two per-topic provenance disclosures collapse to one; per-claim requirement/ref re-lists dropped; the "Not yet established" rollup group dropped (unresolved lives once). **Legacy retirement:** `GET .../reviewer-lk` + `route-and-audit.test.ts` + `projectReviewerLkResult` + `ReviewerLkLookupResult` deleted (zero runtime consumers; fail-closed audit contract transferred to `hrr-research-route.test.ts`). **`HRR_MAX_RESOLVED_TOPICS` kept at 2.** **Pending:** authenticated visual UAT + live classifier cost/quality eval (need a credentialed environment). Full suite: identical 20-failing / 77-failing set (baseline `0c33910`); `tsc` clean; `next build` exit 0.

**CAH-4G.6 (2026-09-10):** Slice 6 shipped the first user-facing HRR integration — the Living Knowledge tab is now the converged GRI. **One route:** `POST /api/admin/submissions/[id]/reviewer-lk/research` accepts `{ mode: 'topic_pick', topic }` or `{ mode: 'question', question }` (strict input contract — a `messages[]` / `history` / `session_id` shape is rejected 400; length-bounded at `HRR_QUESTION_MAX_LENGTH`); both modes call `runAuditedHrrResearch()`. **One renderer:** `<HrrResearchAnswerView>` presents `HrrResearchAnswer` for both entry modes — no topic/question split, no topic-specific branch, orientation prominent, unresolved before provenance, provenance progressive, the assessment-authority boundary a visually distinct callout, empty sections omitted, neutral styling (no pass/fail, no ✓/✗), no `crc_eligible` / `crc_publication_scope`, no promotion/apply/accept control. **UI:** topic chips run the research on click (0 model calls); a labelled `<textarea>` "Ask HRR" (1 classify-only call, fails closed); one current response replaces the previous; a monotonic request counter prevents a slow earlier response from overwriting a newer one; the raw question lives only in component state + the server-round-tripped `question_text` echo — never `localStorage` / URL / logs; reloading the page clears it. The CAH-4F.1/4F.2 shell, inspector, tab separation, and responsive behaviour are unchanged. The legacy `GET .../reviewer-lk` route is retained (no UI consumer) pending a Slice-7 retirement. Zero new test failures (baseline `c39c85d`); `tsc` clean; `next build` exit 0. **Not deployed.**

**CAH-4G.5 (2026-09-10):** Slice 5 shipped the HRR audit boundary as **Option A — the existing CAH-4E `lk_research` access contract reused UNCHANGED, NO migration** (a source-backed deviation from the frozen Option B; see `HRR_GRI_TECHNICAL_DESIGN.md §K`). An HRR audit record means only *"an authorized Human Reviewer used the governed Living Knowledge research capability, in this authorized submission context, at this time"* — it is an ACCESS fact, never assessment evidence / a finding / a control result / evidence sufficiency / an outcome / a sign-off, and never implies the reviewer relied on any proposition. `projectHrrAuditRecord` (PURE) produces the sanitized record `{ actorUserId, submissionId }` — or `null` when no governed research occurred (authority-only / unsupported → **no event**; multi-topic / mixed → **one row per reviewer action**). `runAuditedHrrResearch` (the one impure boundary) runs the pure pipeline in memory, then `await recordReviewerLkAccess(...)` — **on failure it throws `HrrAuditNotRecordedError` and returns nothing governed** (no proposition, no applicability, no BI summary, no `does_not_apply` content, no claim reference, no answer). The raw reviewer question is never persisted and never hashed. Applicability / BI status / claim ids are deliberately not persisted (stable `claim_id`s already identify governed material; the audit must survive a copy change). No route, no UI. Zero new test failures (baseline `2421749`); `tsc` clean; `next build` exit 0.

**CAH-4G.4 (2026-09-10):** Slice 4 shipped `projectHrrResearchAnswer(HrrResearchResult) → HrrResearchAnswer` (`lib/hrr/project-hrr-research-answer.ts`) — **deterministic, no second LLM call**. It turns the trusted structured pipeline output into a consultant-like reviewer answer: a fixed `orientation` per BI status, the verbatim governed propositions + verbatim `BoundedInterpretation.summary_blocks`, a mechanical deduplicated applicability rollup, the specific `unresolved_inputs` made useful (each assigned to the Human Reviewer), a separate `does_not_apply` block, and a fixed `boundary_note`. The complete authored-prose set is one exported enumerable constant (`HRR_ANSWER_TEMPLATES`); a grounding test proves every rendered substantive string traces to grounding A–E and that a false premise in the question is never echoed as fact. Assessment-authority refusal and governed research are **two structurally separate lanes**. `relevant_applicability_unresolved` is wording-locked away from established/resolved/satisfied/cleared/compliant/sufficient. **Not surfaced in Reviewer Resources yet** (Slice 6). No `rules.ts` / CRC-composition change. Zero new test failures (baseline `1eba7da`); `tsc` clean; `next build` exit 0.
**Date:** 2026-09-10
**Milestone series:** CAH-4x (CRC → Commercial Assurance handoff / Human Reviewer experience). CAH-4E shipped Human Reviewer Living Knowledge V1 (deterministic topic look-up). CAH-4F/4F.1/4F.2 shipped and production-proved the Reviewer Resources inspector. **CAH-4G adds free-form research questions alongside the existing topic look-up, inside the same inspector.**
**Supersedes:** the *intent-only* forward boundary in `PRD_CAH_4F_REVIEWER_RESOURCES.md §11` ("Explicit future boundary — CAH-4G"). That section stays as historical context; this PRD is now the authoritative CAH-4G spec.
**The *how* is:** `08_Platform/implementation/HRR_GRI_TECHNICAL_DESIGN.md`. The durable architectural decision is `ADR-002-governed-research-interface.md`. This PRD is the *what* and the authority/product boundaries.
**Frozen prior specs this PRD does not reopen:** `PRD_CRC_v1.0.md`, `PRD_ASSESSMENT_SERVICE_v1.0.md`, `PRD_REVIEWER_WORKBOOK_UI.md`, `PRD_LIVING_NOTEBOOK.md`, `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md`, `PRD_CAH_4F_REVIEWER_RESOURCES.md` (§§1–10, 12).

---

## 1. Problem

A Human Reviewer conducting a Commercial Assurance Assessment can today consult governed SI8 Living Knowledge only by picking one of five fixed topic chips (`commercial_use`, `copyright_ownership`, `copyrightability`, `likeness`, `third_party_source_rights`) — CAH-4E's deterministic look-up. Real reviewer research is more specific than a topic: *"Does a platform allowing commercial use tell me anything about copyright ownership?"*, *"What should I consider where stock images were used as references?"*, *"What does our Living Knowledge say about likeness when the source image was supplied by the client?"*. The reviewer currently has to translate such a question into a topic themselves, run several look-ups, and synthesize the answer by hand.

CAH-4G lets the reviewer **ask the question in natural language** and get a **bounded, governed, traceable consultative answer** — without the tool becoming an unconstrained legal/research chatbot, and without it ever making the assessment judgment on the reviewer's behalf.

## 2. Product intent

Introduce **HRR — Human Reviewer Research** as a product capability inside the Reviewer Resources → Living Knowledge tab, built on a reusable architecture named **GRI — Governed Research Interface**. HRR V1 supports two peer entry modes into one governed research pipeline:

- **Topic mode**: a chip click is an explicit structured research intent; **no Anthropic/model classification call** is required. Deterministic through retrieval, eligibility, and applicability.
- **Free-form mode** (new): a natural-language question is passed through **one bounded structured LLM interpretation stage** that determines *permitted research intent only* (which governed topic(s) the question asks about, and whether it is a research question or an assessment-authority request). The model never generates the substantive governed answer.

**Both modes converge — before retrieval — into one governed pipeline.** This is an intentional CAH-4G product evolution, not an accidental regression: the topic path no longer ends at CAH-4E's thin claim-list passthrough — it now also flows through Bounded Interpretation and HRR consultative composition, so a topic pick and a free-form question produce the same shape of consultative answer. **What is unchanged for the topic path** (frozen — see `HRR_GRI_TECHNICAL_DESIGN.md §U` and §C of this PRD's freeze):
- topic selection requires **zero LLM classification calls**;
- **reviewer-channel eligibility authority is unchanged** — `evaluateReviewerEligibility` (lifecycle `Adopted` + reviewer-permitted `publication_scope` + not superseded); `crc_eligible` never consulted;
- **governed claim selection authority is unchanged** — `selectReviewerClaims` (topic match + `providerScopeMatches` + `toolScopeMatches` + eligibility), byte-identical calls;
- **deterministic applicability is unchanged** — `evaluateApplicabilityDetailed`; `met` / `unresolved` / `not_met` per requirement, never collapsed;
- **no new project facts are inferred**;
- **no assessment authority is added**;
- **audit-before-content remains required**;
- **the same governed topic identifiers** (`GoalCategory` enum) govern which claims are eligible.
- **What evolves**: the presentation/interpretation layer only — BI status + consultative framing + "what this does not establish" + navigation. Every governed proposition CAH-4E showed is still shown, verbatim, with the same applicability and provenance.

Pipeline:

```
permitted structured research intent
  → governed retrieval (reviewer-eligible governed claims, narrowed by submission structured facts)
  → deterministic applicability (established / unresolved / not_met — never collapsed to pass/fail)
  → Bounded Interpretation (the semantic ceiling)
  → consultative composition (HRR channel policy over shared composition primitives)
  → provenance / projection (verbatim governed propositions + governed-record references)
  → append-only access audit
```

**The invariant (from `ADR-002`):** a natural-language research interface is an *intent-entry mechanism* into governed retrieval + Bounded Interpretation. It is **not an independent answer authority**. No downstream layer may express a stronger conclusion than Bounded Interpretation permits.

**Trust / grounding contract (frozen 2026-09-10 — `ADR-002` is authoritative):** **reviewer-authored text is UNTRUSTED / NON-AUTHORITATIVE INPUT.** It *may* be: displayed as an explicitly attributed question; used by the bounded classifier to determine permitted structured intent; referenced as provenance for *what the reviewer asked*. It *may not*: substantiate an HRR factual proposition; become governed truth through repetition; override Living Knowledge, applicability, or Bounded Interpretation; create project facts, assessment facts, findings, or conclusions. Every HRR **substantive factual proposition** must trace to one of: **(A)** governed Living Knowledge permitted for HRR; **(B)** deterministic applicability / permitted structured submission context, accurately characterized; **(C)** a Bounded Interpretation output derived from permitted governed inputs; **(D)** a fixed authority / limitation / navigation template; **(E)** a mechanical provenance / status enumeration. **Reviewer text grounds INTENT provenance only — never factual authority.**

> Example: reviewer asks *"Since Veo gives us copyright ownership, is this cleared?"* → HRR may echo *"You asked: 'Since Veo gives us copyright ownership, is this cleared?'"*, declines the clearance decision (it is an assessment-authority request), and researches only the explicit `copyright_ownership` portion using governed Living Knowledge. HRR must **not** treat *"Veo gives us copyright ownership"* as factual grounding merely because the reviewer wrote it.

## 3. Terminology (use consistently across all SI8 docs)

| Term | Meaning |
|---|---|
| **GRI — Governed Research Interface** | The reusable architecture/capability: *explicit or natural-language research intent → governed retrieval → applicability → Bounded Interpretation → consultative composition → provenance/projection*. GRI is **not** a customer product and **not** a Commercial Assurance assessment surface. It preserves the rule "no downstream layer strengthens a conclusion beyond Bounded Interpretation." HRR is the first deliberate product surface built on GRI. |
| **CRC — Commercial Readiness Check** | The **customer-facing conversational educational product** for AI-video commercial readiness. CRC is **not** legal advice, **not** a Commercial Assurance Assessment, **not** certification that a project is commercially cleared. **CRC UX is unchanged by CAH-4G** — see §13. |
| **HRR — Human Reviewer Research** | The Human Reviewer governed-research **product capability** inside the Commercial Assurance reviewer workspace. Use "HRR", never "HRC" / "Human Reviewer Check" / "Reviewer Chat". "Reviewer LK" remains valid as an *engineering/internal* term for the existing CAH-4E Reviewer Living Knowledge implementation (`lib/reviewer-lk/**`). HRR **does not** perform the Commercial Assurance Assessment. |

## 4. User

The **SI8 Human Reviewer / admin** (`users.is_admin = true`; access gate `checkReviewerContextAccess()` — `lib/reviewer-context/auth.ts`, designed to swap to a dedicated reviewer grant later) conducting a Commercial Assurance Assessment on an `si8_certified` submission. Not a user: the CRC customer (never sees this surface), the reviewer's client.

## 5. HRR authority boundary (normative — do not weaken)

**HRR *may* answer:** *"What governed SI8 knowledge is relevant to the research question I asked?"* — and *may* explain: governed propositions (verbatim); deterministic applicability to this submission; unresolved applicability requirements; governed project-fact dependencies; evidence limitations; **what the governed knowledge does *not* establish**; provenance (governed-record references).

**HRR *may not* determine:** commercial clearance · whether evidence is sufficient · whether a control passes · whether a finding should be raised · whether a gap exists · whether the assessment should be approved · the assessment outcome · sign-off.

The Human Reviewer remains solely responsible for evidence evaluation, findings, control judgments, gaps, assessment conclusions, outcome, and sign-off. Consulting HRR is an input to that judgment, never a substitute for it, and never a path into workbook state. (Consistent with `ADR-001-reviewer-resources-authority-boundary.md` and SI8 Principles P3 "independent assessment is the product" / P4 "human judgment for commercial clearance cannot be automated".)

**Assessment-authority questions.** If the reviewer asks *"Should I approve this?"* / *"Is this cleared?"* / *"Is the evidence sufficient?"* / *"Can I mark this control passed?"*, HRR **must not answer "yes" or "no"**. HRR:
1. states plainly that HRR does not determine the assessment outcome and the reviewer owns that judgment;
2. **if — and only if — the utterance also contains an explicit governed research clause**, runs governed research on that clause **at that clause's own scope** and surfaces the relevant governed considerations + unresolved applicability;
3. **otherwise** offers the reviewer the available governed research paths (the topic list) — it does **not** invent a "closest topic" to make retrieval run.

**Multiple intents in one utterance (frozen, CAH-4G.1, 2026-09-10).** A single question may carry more than one semantic intent. The authority gate separates them and routes each **independently**:
- The assessment-decision intent (*"Should I approve this?"*) is **declined** — see above.
- Any explicitly-supported research clause (*"what does governed knowledge say about copyright ownership?"*) **survives independently with its own correct scope**. If that clause is informational (the common case), its scope **stays `informational`** → it runs the normal governed retrieval / applicability / Bounded Interpretation / composition path and produces an ordinary governed research answer.
- **A prohibited intent must NOT contaminate the scope of another permitted intent.** The research clause is **not** converted to a determination request merely because the same utterance also asked HRR to make a decision. A research clause becomes a determination request **only** when that clause *itself* asks HRR to decide the topic (e.g. *"should copyright ownership be treated as cleared?"*), judged on its own words.
- The refusal and the research are **visually and structurally separate** in the answer.

## 6. Relationship to Commercial Assurance

HRR is a *research aid inside* the reviewer workspace. It reads two authoritative, non-authority submission columns (`submissions.tools_used`, `submissions.territory_preferences`) to narrow governed-knowledge retrieval — exactly as CAH-4E does — and writes only an append-only access-fact audit. It **never** reads or writes `assessments` / `workbook_*` / evidence / findings / gaps / outcome / sign-off / report / publication state, and it **never** reads Linked CRC Context automatically (§10). The Reviewer Resources ↔ Assessment Workbook ↔ Linked CRC Context authority separation (`ADR-001`) is preserved.

## 7. Topic-based mode (unchanged from CAH-4E)

The five topic chips remain. A chip click is `research_mode = 'topic_pick'`: the exact CAH-4E deterministic path (`GET /api/admin/submissions/[id]/reviewer-lk?topic=<GoalCategory>` → `selectReviewerClaims` → verbatim projection). **No Anthropic call.** No change to CAH-4E behavior, contract, audit, or presentation. The topic path must not be made deliberately inferior because it is cheaper — both modes produce useful, submission-aware governed research.

**Topic coverage (source-backed, verified at `origin/main` = `238670c`; supersedes the prior diagnostic's error — see §16):**

| Topic | Reviewer-eligible governed `TopicClaim`s in `TOPIC_CLAIMS_FIXTURE` |
|---|---|
| `commercial_use` | 11 (Synthesia, Storyblocks, Adobe Stock, Kling ×2, Runway, Pika ×4, Stability AI) |
| `third_party_source_rights` | 17 (stock editorial ×7, Artlist music ×6, Envato/Epidemic music ×3, Pond5) |
| `copyrightability` | 3 (`CLAIM-COPY-001/002/003-v1` — all `Adopted`, `publication_scope: 'Reviewer/Commercial Assurance'`, not superseded) |
| `copyright_ownership` | 1 (`CLAIM-COPY-004-v1` — same eligibility; this is what CAH-4F.2 UAT returned) |
| `likeness` | **0** in `TOPIC_CLAIMS_FIXTURE`. The one `likeness` claim (`elevenlabs-voice-consent`) lives in `MATRIX_FIXTURE` (tool-scoped, a different retrieval path not used by Reviewer LK) and is **withheld under CRC Publication Policy Principle 3** regardless of verification status. So a `likeness` topic pick / question returns *no governed proposition* today — an honest `outside_current_coverage` answer, not an error. |

## 8. Free-form mode (new)

`research_mode = 'question'`. Flow: reviewer types a question → **one bounded structured LLM interpretation call** → `PermittedResearchIntent` → the same governed pipeline as topic mode.

**The interpretation call classifies + maps only** (SHIPPED CAH-4G.2, `lib/reviewer-lk/interpret-research-intent.*`). Its structured output carries: `research_intents: Array<{ topic: ReviewerResearchTopic; scope: 'informational' | 'determination_request' }>` (each research clause the *question* explicitly names, **each with its own scope** — enum-only, never a fabricated "closest topic", deduped, capped at 2); `assessment_decision_requested: boolean` (the utterance also asks HRR to make the assessment decision); `unresolved_ambiguity: <fixed enum phrases>`. It has **no free-text field** (`additionalProperties: false`) and **structurally cannot carry an answer, a claim, a legal statement, or a paraphrase of governed knowledge**; a deterministic normalizer then drops any non-enum entry and re-caps regardless of the model. On any provider error, unrecoverable structured-output miss, or normalizer rejection the adapter **fails closed — returns `{ research_intents: [], assessment_decision_requested: false, unresolved_ambiguity: ['no_governed_topic_matched'] }` and never throws** (→ a future UI shows fixed "try a topic" copy; no retrieval). A per-clause `scope` defaults to `informational`; it is `determination_request` only when that clause's own wording asks HRR to decide the topic. **A prohibited intent in the same utterance never sets another clause's scope.**

**May free-form resolve multiple topics?** Yes — a question can legitimately name two governed topics ("does commercial-use permission tell me anything about copyright ownership?" resolves `commercial_use` + `copyright_ownership`). Each research clause runs the governed pipeline at its own scope; the answer groups by topic. **Capped at `HRR_MAX_RESOLVED_TOPICS = 2`** (schema `maxItems` + deterministic re-cap by governed enum order + `multiple_unrelated_topics` flag); the exact value is the one genuinely-open item pending a bounded internal experiment (§T-4).

## 9. Cost-aware deterministic-intent principle (design property, not the authority mechanism)

Where the reviewer has already supplied sufficient structured intent through a deterministic UI action (a topic chip), **do not invoke an LLM to rediscover it**. Therefore: topic mode → **0 model calls**; free-form mode → **exactly 1 bounded model call** (interpretation only); retrieval, applicability, Bounded Interpretation, and composition → **0 model calls in V1**. This is a cost/latency property; the *authority* protection comes from the schema, the fail-closed gate, and Bounded Interpretation — not from "it's cheaper".

## 10. Linked CRC Context — excluded automatically in V1

HRR V1 **does not** feed Linked CRC transcript or Linked CRC structured project context into research retrieval, automatically or by default. Reasons: CRC context is customer-provided and unverified (CAH-4B); UI adjacency (both in the inspector) is not retrieval authority; the Reviewer LK ↔ Linked CRC Context separation is authoritative and independently audited (`lk_research` vs `transcript`). Any future explicit contextual inclusion is a **separate architecture decision** requiring its own provenance + evidence-boundary analysis. Not in CAH-4G.

## 11. Single-turn V1 (strong approved bias)

Each HRR question — topic or free-form — is **independently interpreted against the current permitted submission context**. Prior HRR questions/answers **do not** silently become model context for the next question. The UI may retain previous results locally for usability (client state, like today's look-up result surviving inspector close/reopen); that is "history you can scroll", not multi-turn semantic memory. Rationale: simpler provenance, simpler correction semantics, less stale context, smaller prompt-injection surface, easier auditing, lower token use, clearer reviewer expectations, easier fail-closed behavior. The design keeps future multi-turn compatibility (§R of the design doc) but V1 does not implement it.

## 12. Applicability & Bounded Interpretation semantics (must hold)

- **Deterministic applicability remains authoritative.** Retrieval runs before applicability, as today. Per-requirement status is the verbatim value the generic `evaluateApplicabilityDetailed` primitive returns: `met` / `unresolved` / `not_met`. These are **never collapsed into pass/fail**. `unresolved` (fact unknown) and `not_met` (fact known-false) stay distinct — a `not_met` claim genuinely does not apply and composition says so; an `unresolved` requirement is shown verbatim and is **never a negative finding**.
- **Free-form interpretation may not infer a missing submission fact**, may not turn a missing project fact into an assumed fact, and may not convert an **evidence-only fact** (stock editorial designation, likeness/voice consent, release status, rights-and-clearance status — the set CRC's `dependency-askability.ts` classifies as *"requires documentary evidence, never askable"*) into a reviewer self-attestation question. Fail closed: unknown → `unresolved` → shown, never guessed.
- **Bounded Interpretation is the semantic ceiling.** For a research intent it may represent: the explicit research intent + provenance; directly-responsive governed propositions (verbatim); applicability state; unresolved requirements/dependencies; evidence limitations; **what the governed material does not establish**; an authority-limitation note. It **may not output**: an assessment finding · control pass/fail · commercial clearance · evidence-sufficiency verdict · a fabricated legal conclusion · any project-specific conclusion stronger than a claim's own applicability permits.

## 13. CRC pilot boundary (do not violate)

**CAH-4G does not change CRC.** No CRC topic selectors, no CRC topic shortcuts, no CRC input redesign, no change to CRC pilot questioning, no CRC composition change "for symmetry with HRR". **CRC stays free-form during the pilot** deliberately, so SI8 can observe what customers naturally ask, how they phrase it, which concepts confuse them, which goals recur, and what pathways emerge without UI prompting — *before* designing evidence-based CRC topic shortcuts. Introducing CRC selectors now would bias that dataset. The design doc may *document* GRI convergence opportunities between CRC and HRR; CAH-4G *implementation scope* must not include any CRC change.

## 14. UX — as-built (CAH-4G.6)

Inside the existing Reviewer Resources inspector → **Living Knowledge** tab (no shell/page-tree change; CAH-4F.1/4F.2 layout intact):

```
Research SI8's governed Living Knowledge for this submission — pick a topic
shortcut, or ask a research question.

TOPIC SHORTCUTS
[ Commercial use ] [ Copyright ownership ] [ Copyrightability ]
[ Likeness ] [ Third-party source rights ]                       ← a click runs the research (0 model calls)

ASK HRR
┌───────────────────────────────────────────────────────────┐
│ What would you like to research about this submission?     │   ← <textarea>, real <label>, Cmd/Ctrl+Enter
└───────────────────────────────────────────────────────────┘
[ Ask ]   HRR searches and interprets governed SI8 Living Knowledge for this
          submission. Not legal advice; not a commercial-clearance determination.
────────────────────────────────────────────────────────────
GOVERNED RESEARCH RESPONSE   (one <HrrResearchAnswerView>; one current response)
   [assessment-authority boundary callout — only when a decision was asked]
   per topic:  orientation → what governed knowledge says → for this submission →
               what remains unresolved → does not apply → research boundary →
               [Governed claims — applicability & provenance ▸]  [Provenance & governance ▸]
   [reviewer-responsibility footer]
```

- Topic shortcuts and Ask HRR are **peers** into ONE research capability, rendered through ONE answer component. The input does **not** look like a chatbot — no avatar, no "AI is typing", no chat bubbles, no model branding.
- **Answer priority order (as-built):** (1) orientation / direct bounded response; (2) what governed knowledge says (verbatim BI reading + verbatim propositions behind a disclosure); (3) applicability to the current submission; (4) what remains unresolved (before provenance); (5) does-not-apply (neutral); (6) research / authority boundary; (7) provenance / governed records (progressive disclosure). Empty sections are omitted.
- Assessment-authority questions open with the §5 authority note, then either the explicit-topic research (if named) or the offered research paths.
- Explicit-question results render before any (future) discovered-relevance results, under a clear label.
- No "copy to evidence" / "apply" / "accept" / "summarize" / "approve" affordance anywhere.

## 15. Provenance expectations

Every governed proposition in an HRR answer carries its verbatim `statement`, its `claim_id`, and a `governed_claims_reference` pointer into the canonical ledger (`06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md`) — identical to CAH-4E. The reviewer's **original action is preserved in provenance**: `research_mode` (`topic_pick` | `question`), the resolved topic(s), and (for free-form) that the topics were *interpreted* from a question, not directly selected. Explicit reviewer intent is never silently merged with system-expanded relevance.

## 16. Topic-coverage reconciliation (corrects the prior diagnostic)

The CAH-4G *discovery* report stated `copyright_ownership` and `copyrightability` had "zero governed `TopicClaim` coverage". **That is false at current `origin/main` (`238670c`).** Source-backed truth:

- `TOPIC_CLAIMS_FIXTURE` (`lib/retrieval-engine/topic-claims-fixture.ts`) contains `CLAIM-COPY-004-v1` (`topic: 'copyright_ownership'`) and `CLAIM-COPY-001/002/003-v1` (`topic: 'copyrightability'`), all `lifecycle: 'Adopted'`, all `publication_scope: 'Reviewer/Commercial Assurance'`, all `superseded_by: null` → all **reviewer-eligible** via `evaluateReviewerEligibility`. The CAH-4F.2 UAT returned `CLAIM-COPY-004-v1` exactly.
- **Root cause of the error:** the discovery quoted a **stale doc-comment** in `lib/bounded-interpretation/types.ts` (dated CRC Milestone 2, 2026-08-15) — *"zero governed coverage for either"* — which predates the addition/publication of `CLAIM-COPY-001..004` (fixture header: "CLAIM-COPY-004-v1 published 2026-08-17"; "CLAIM-COPY-001-v1/-002-v1/-003-v1 are now ALSO crc_eligible: Yes"). It also conflated `MATRIX_FIXTURE` (tool-scoped) with `TOPIC_CLAIMS_FIXTURE` (topic-scoped).
- **The one genuine V1 coverage gap is `likeness`** (§7) — 0 reviewer-eligible topic claims. This is documented honestly as a limitation, not treated as a blocker.

## 17. Failure behavior (fail closed at every boundary)

| Boundary | Failure | Behavior |
|---|---|---|
| Access gate | not admin / lookup error | deny (401/403), no audit, no content |
| Free-form interpretation | schema-nonconforming after bounded retry, empty `resolved_topics` for `research`, low confidence, model/provider error | treat as `unsupported` → fixed "try a topic" copy → **no retrieval, no composition, no answer** |
| Topic validation | topic ∉ `GOAL_CATEGORIES \ 'unknown'` | 400, no audit |
| Submission read | submission not found | 404, no audit |
| Governed selection | any read/selection error | 500, no audit |
| Audit persistence | insert fails | 503, **zero governed content** (audit-before-content, as CAH-4E/CAH-4C) |
| Applicability | required fact unknown | requirement shown as `unresolved` — never guessed, never a finding |
| Assessment-authority intent | reviewer asked for a determination | decline the determination; research only the explicit named topic if any; else offer research paths |

## 18. Explicit non-goals (V1)

- No multi-turn conversation / server session / question history influencing retrieval.
- No automatic use of Linked CRC Context (structured or transcript).
- No evidence promotion / workbook write / assessment-state mutation / findings / gaps / control results / outcome / sign-off / report / publication change.
- No project-specific conclusion, clearance, pass/fail, evidence-sufficiency verdict, or legal statement not verbatim in a governed claim.
- No inferring missing project facts; no self-attestation of evidence-only facts.
- No synthetic CRC `UserGoal` objects (§H of the design doc gives the honest adaptation boundary).
- No fabricated "closest topic" to make retrieval run.
- No inert discovered-relevance machinery built just to claim Track A support (architectural compatibility preserved; execution deferred).
- No new `access_kind`; no migration; no audit-schema change; no persistence of raw free-form questions by default.
- No second LLM call anywhere in the pipeline; no LLM call in the topic path.
- **No CRC change of any kind** (§13).
- No generic GRI runtime extraction / repository-wide composer refactor "for symmetry".

## 19. UAT / acceptance criteria (for the eventual implementation — manual, no render harness in repo)

Environment: a deploy of the CAH-4G branch; authenticated admin; internal synthetic `CA-RLK-2a PROD SMOKE` / `ASSESS-007-2026-09-07`; ~1440px.

1. **Topic selection.** Click "Copyright ownership" → **zero classification model calls** (confirmed via absence of an `hrr_intent` telemetry event); the same reviewer-eligibility + `selectReviewerClaims` + deterministic-applicability authority as CAH-4E; the result now passes through the frozen HRR/GRI answer pipeline (BI + consultative composition) and renders as an `HrrResearchAnswer` — every governed proposition CAH-4F.2 UAT (§17a) recorded is still shown verbatim with the same applicability + provenance; `lk_research` audit row written before content.
2. **Free-form single-topic research.** Type *"What does Living Knowledge say about copyright ownership for this submission?"* → `CLAIM-COPY-004-v1` rendered with Applicability + limitations + provenance; question echoed as an attributed quotation; **no factual proposition traces to the question text** (grounding A–E only).
3. **Free-form bounded multi-topic research.** Type *"Does a platform allowing commercial use tell me anything about copyright ownership?"* → answer groups governed propositions under `commercial_use` and `copyright_ownership`; **at most `HRR_MAX_RESOLVED_TOPICS` (frozen default 2)** topics researched; the classifier never invents a topic absent from permitted interpretation.
4. **Unsupported / over-general.** Type *"What does the law say about everything relevant here?"* → fixed "HRR answers narrower governed questions — try one of these topics" + chips; no retrieval, no model answer.
5. **Assessment-judgment.** Type *"Should I approve this assessment?"* → HRR states it does not determine the outcome, the reviewer owns it; offers the research topic list; **no yes/no**; **no invented topic**; no retrieval, no BI.
6. **Mixed judgment + research.** Type *"Should I approve this, and what does governed knowledge say about copyright ownership?"* → **two independent intents.** The approval decision is declined + Human Reviewer authority preserved. The `copyright_ownership` clause is **informational** → it runs the ordinary governed pipeline and produces a normal governed research answer (`directly_relevant` / `outside_current_coverage` / `relevant_applicability_unresolved` per the Matrix) — **not `determination_declined`**. Assert the `copyright_ownership` research intent carries `scope: informational` (the approval request did not flip it). The refusal and the research are visually and structurally separate; **never yes/no**.
   - **6b.** *"Should I approve this, and should copyright ownership be treated as cleared?"* → **both** declined: the approval decision, and the `copyright_ownership` clause — the latter because that clause *itself* asks for a determination (`scope: determination_request` → `determination_declined`), on its own merits.
7. **False premise embedded.** Type *"Since Veo gives us copyright ownership, is this cleared?"* → *"Veo gives us copyright ownership"* is **not** repeated as factual authority anywhere in the answer; the clearance decision is declined; only governed Living Knowledge (grounding A–E) may substantiate the `copyright_ownership` research portion.
8. **Likeness — honest coverage limitation.** Type a `likeness` question → the bounded equivalent of "outside current governed coverage" (no reviewer-eligible `TopicClaim` for `likeness` today); not an error, not an invented answer.
9. **Applicability unresolved.** A result with an `unresolved` requirement shows it verbatim with the "not a negative finding" note and is **never** silently assumed met and **never** rendered as pass/fail; a `not_met` requirement reads "does not apply to this submission", distinct from `unresolved`.
10. **Audit failure → fail closed.** If the `lk_research` access record cannot be persisted → **no governed claim content and no HRR substantive answer** is returned (503 / bounded error); zero audit rows from typing / editing / re-rendering / resize.
11. **Linked CRC Context — no automatic participation.** No transcript, no CRC conversation history, no CRC structured context enters HRR retrieval; a submission *with* a linked CRC conversation produces an identical HRR answer to one without.
12. **Workbook untouched.** `workbook_data` + `assessments` row byte-unchanged by any HRR interaction; no evidence / finding / gap / control-result / outcome / sign-off / report / publication mutation; no spurious PATCH.
13. **CRC — zero behavior/UI change.** No change to `/crc` runtime, CRC input, CRC topic selectors (there are none — must stay none), CRC composition, or CRC pilot questioning.
14. **No CRC-channel metadata / no promotion affordance.** `crc_eligible` / "CRC channel: Yes" / raw `crc_publication_scope` "CRC may state…" prose never appear; no copy-to-evidence / apply / accept / approve control anywhere in HRR.

## 20. Future learning loop

HRR is SI8's first deliberate **GRI design laboratory**: SI8 reviewers directly observe what reviewers research, which topic shortcuts are useful, when free-form is necessary, what follow-ups recur, what answer structures help, what is noise, where applicability explanations confuse, where authority boundaries need stronger presentation, and what provenance reviewers actually inspect. HRR usage informs future GRI design. **This does not imply every successful HRR pattern is copied into CRC** — CRC is a different product/channel, and its topic paths (if any) will be designed from *CRC* usage evidence, separately.

## 21. GRI as intentional SI8 design capability (no IP/marketing/legal claims)

The design pattern SI8 is honing is **not** "put an LLM behind a text box". It is the governed interaction architecture that: accepts structured *or* natural-language intent; preserves explicit provenance; retrieves only governed knowledge; evaluates applicability deterministically; preserves unresolved dependencies; bounds what may be concluded; separates *research* from *decision authority*; composes a useful consultative explanation; preserves traceability; and supports multiple channels with different authority policies. The PRD + design doc make this legible to future agents and engineers. No patentability, marketing, or legal-IP claim is made or implied.

---

**See also:** `08_Platform/implementation/HRR_GRI_TECHNICAL_DESIGN.md` (the *how*), `08_Platform/app/lib/reviewer-lk/ADR-002-governed-research-interface.md` (the durable decision), `ADR-001-reviewer-resources-authority-boundary.md` (the authority firewall CAH-4G inherits), `PRD_CAH_4F_REVIEWER_RESOURCES.md §11` (the superseded intent-only boundary), `PRD_CRC_v1.0.md` (the frozen CRC spec CAH-4G does not touch), `COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md`.
