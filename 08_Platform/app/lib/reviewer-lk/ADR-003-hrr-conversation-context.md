# ADR-003: A visible HRR research thread is UI; the reasoning pipeline gets a bounded enum-only referent, never the transcript

**Status:** ACCEPTED — CAH-4G.9 (design, 2026-09-10). **Slice A: CLOSED / PRODUCTION-PROVEN (CAH-4G.10 → CAH-4G.10P deployment-gap found → CAH-4G.10I integrated to `main` = `4b9ee5a` → CAH-4G.10C authenticated production UAT PASSED all 10 checks, 2026-09-11 — evidence: `HRR_CONVERSATIONAL_ARCHITECTURE.md §FF`).** **CAH-4G.11 → CAH-4G.12 → CAH-4G.13 (2026-09-11 — `HRR_FOLLOWUP_DISCOVERY.md`, `HRR_RESEARCH_SESSION_CONTRACT.md`, `HRR_SESSION_DISCOVERY.md`)** ran the full generic-taxonomy discovery program culminating in four rounds of real production evidence (Session 1, a discriminating control, an authority-drift safety experiment, and an explicit focus-switch experiment — `HRR_SESSION_DISCOVERY.md` §O–§R) and closed **COMPLETE FOR DESIGN** at `origin/main` = `8206415`. **CAH-4G.14 (2026-09-11, this update) is the DESIGN/PRE-REGISTRATION-ONLY milestone that refines the original `HrrThreadContext` hypothesis (decisions 2–4 below) into a concrete, evidence-grounded `ResearchSessionContext` design — see the new section below.** Decisions 1, 5, 6, 7, 8 below remain production-proven in code + real reviewer sessions, unchanged. Decisions 2, 3, 4 (the bounded referent + follow-up resolution) are **superseded in specificity, not in principle**, by the CAH-4G.14 design below — the original `HrrThreadContext` sketch is preserved here unmodified as historical record; the refined, evidence-grounded shape is `ResearchSessionContext` (see below). **Slice B / CAH-4G.14 RUNTIME IMPLEMENTATION remains a separate, NOT STARTED, NOT AUTHORIZED milestone**, gated on the conditions in the CAH-4G.14 section below. The VISIBLE thread is `hrr-thread.ts` (reducer) + `ReviewerLkLookup` (`useReducer`). As-built: `HRR_CONVERSATIONAL_ARCHITECTURE.md §BB`; deployment-gap reconciliation: §CC; integration record: §DD; production UAT evidence: §FF; CAH-4G.13 discovery evidence: `HRR_SESSION_DISCOVERY.md` §O–§R.

**Context:** CAH-4G is production-deployed and semantically safe. PM production UAT found the single-turn HRR model *too visible*: asking a second free-form question replaces the first. Human Reviewers expect a conversational research thread (interaction model like CRC). See `HRR_CONVERSATIONAL_ARCHITECTURE.md` §A.

## Decision

1. **The visible thread is UI only.** An append-only list of reviewer turns and assistant turns (each assistant turn = one existing `HrrResearchAnswerView`). It lives in **client React memory** — no `localStorage` / `sessionStorage` / cookie / database / migration. It survives inspector tab-switch and close/reopen (already hidden-not-unmounted); a page refresh clears it. This is the honest representation of "not a persisted conversation".

2. **A visible thread does NOT authorize sending the transcript to an LLM.** The follow-up classifier call receives the new question plus, at most, one fixed-template `[Context: …]` line built from a bounded enum-only structured referent:

   ```
   HrrThreadContext {
     prior_turn_id
     prior_entry_mode: 'topic' | 'free_form'
     prior_resolved_topics: Array<{ topic; scope; bi_status }>   // all enum values
   }
   ```

   It is structurally incapable of carrying prior answer prose, a governed statement, a claim id, an applicability value, an assessment conclusion, or a project fact.

3. **Prior HRR answer prose never becomes** project fact · evidence · assessment state · governed knowledge · applicability input · authority · a `UserGoal` · a stronger conclusion. An inherited referent ("that", "it") resolves only to a topic an **explicit reviewer utterance** raised (this turn's or a prior turn's) — never to a topic an HRR *answer* merely mentioned (Track C parallel).

4. **Reviewer conversation is not project-fact entry.** A reviewer asserting a fact in HRR ("this ran in New York") never mutates an assessment field and never enters `HrrThreadContext`. Every turn re-reads the submission's authoritative facts fresh.

5. **The one-model-call ceiling holds:** topic shortcut = 0; self-contained free-form = ≤1 classify-only; contextual follow-up = ≤1 classify-only (same call, marginally longer input). No second conversational or composition LLM call.

6. **No audit change.** Each research *action* still writes exactly one bounded `lk_research` row; an authority-only turn writes none. Turn ids / conversation ids / raw questions / answer prose are never audited.

7. **Every new turn re-runs the full fresh pipeline** (current facts → `selectReviewerClaims` → deterministic applicability → BI → `projectHrrResearchAnswer`). Old displayed turns are records of what HRR returned then; they are never authoritative context for new research.

8. **No CRC change.** CRC's conversational architecture already uses bounded structured context (`buildUserMessageContent`), not transcript-to-LLM — it is a precedent, not a dependency. Sharing is limited to a new generic client-shell primitive set (`components/conversation/`); CRC adopts it opportunistically, later or never.

## Why (the problem this prevents)

- A chat transcript sent to a model is an unbounded prompt-injection surface, a growing cost, a privacy/retention liability, and a channel for a previously-generated answer to be re-ingested as if it were fact.
- Persisting an HRR conversation would create a raw-question / answer-prose retention surface the frozen `lk_research` audit contract deliberately avoids, and would risk an old answer being read as a governed record.
- Letting reviewer conversational assertions reach applicability would undermine deterministic applicability and blur research against evidence entry.

## Consequences

- Follow-ups like "why does that matter?" and "does that mean I should approve this?" are resolvable safely with an enum-only referent; hypothetical/jurisdiction-qualifier research ("what if this were in New York?") is **out of V1** and needs separate PM + applicability-architecture review.
- The thread is ephemeral across refresh — accepted for a lookup tool inside an already-persistent workbook session.
- Implementation is incremental (`HRR_CONVERSATIONAL_ARCHITECTURE.md` §X, Slices A→B→C), each reversible, no big-bang refactor.

## Enforcement

- `parseBody` rejects a `prior_context` carrying prose / claim ids / facts / applicability / a raw question (Slice B).
- `buildFollowupClassifierInput` output asserted to contain no prose beyond the fixed template + the question.
- Model-call-count tests (topic = 0, free-form ≤1, follow-up ≤1).
- `lk_research` payload shape test unchanged.
- CRC `subsystem-boundaries.test.ts` / `crc-assurance-handoff/boundaries.test.ts` — zero regression.

---

# CAH-4G.14 — Bounded Research Session Context: Refined Design + Pre-Registration (2026-09-11)

**This section is DESIGN + PRE-REGISTRATION ONLY. No runtime, TypeScript, TSX, API, DB, migration, prompt, classifier, or UI change is made by this section. No code below is implemented.** It re-derives and refines the original `HrrThreadContext` hypothesis (above) from the CAH-4G.13 production evidence (`HRR_SESSION_DISCOVERY.md` §O–§R, closed at `origin/main` = `8206415`), grounded directly in the current source contracts (`lib/reviewer-lk/types.ts`, `hrr-authority-gate.ts`, `lib/hrr/run-hrr-research.ts`, `lib/hrr/types.ts`, `app/api/.../reviewer-lk/research/route.ts`, `hrr-thread.ts`), inspected fresh for this milestone rather than assumed.

## 1. Three gates, kept explicit

- **Evidence sufficient to design: YES** — CAH-4G.13 closed COMPLETE FOR DESIGN.
- **Evidence sufficient to implement: NO** — this design has never been built or tested.
- **Implementation proven safe: NO, and cannot be until §14's adversarial matrix is actually run against real code.**

## 2. Problem statement (precise)

The demonstrated problem is **not** "HRR needs chat memory." It is: **some permitted follow-up utterances cannot be interpreted adequately when every turn is classified without any bounded representation of the current Research Session's focus and/or the specific governed item most recently surfaced.** The solution must remain a bounded research assistant for the Human Reviewer — never an automated assessment reviewer, never a general conversational memory.

## 3. Selected minimum context shape — `ResearchSessionContext`

Re-derived from the evidence, not assumed to be Candidate E just because CAH-4G.13's closeout called it best-supported. The evidence (§5 below) rules out Candidate A (insufficient) and shows Candidate B alone is plausibly insufficient for T2/T4-shaped questions — so the minimum shape that plausibly covers the demonstrated failure classes, and no more, is:

```ts
/** DESIGN ONLY — not implemented. Every field is an identifier or enum; never prose, never cached content. */
interface ResearchSessionContext {
  /** The single governed topic the current session is anchored to, or null (no clear active focus — fail-closed default). */
  activeFocus: ReviewerResearchTopic | null
  /** How activeFocus was established — reuses the EXISTING `intent_origin`/`source_kind` enum (`lib/reviewer-lk/types.ts`), no new type. */
  activeFocusOrigin: 'topic_selection' | 'interpreted_question' | null
  /**
   * Bounded, deduplicated, capped identifiers of the most recently surfaced
   * unresolved items for activeFocus — reuses the EXISTING
   * `HrrUnresolvedInput.identifier` field already present on every answer
   * (`lib/hrr/types.ts`). Never the requirement's content, note, or any
   * prose — identifiers only. Capped at a small fixed bound (proposed
   * `HRR_MAX_UNRESOLVED_REFERENTS = 5`, mirroring the existing
   * `HRR_MAX_RESOLVED_TOPICS` convention).
   */
  unresolvedReferents: string[]
}
```

**Critical design property, found by inspecting the existing client state rather than proposing new state:** every field above is **derivable, pure, and stateless** from data the client already holds — `HrrThreadState.turns[]` (`hrr-thread.ts`, unchanged) already carries, per settled turn, the resolved topic(s) (`HrrResearchAnswer.topics[]`) and each topic's `unresolved_inputs[].identifier`. **No new client state, no new reducer action, and no new persistence are required.** `ResearchSessionContext` is proposed as a pure selector function, computed fresh at request-build time:

```ts
// DESIGN ONLY — illustrative signature, not implemented.
function deriveResearchSessionContext(thread: HrrThreadState): ResearchSessionContext
```

This trivially inherits the freshness and no-persistence properties already proven for `HrrThreadState` (§10/§13) — "Clear conversation" already resets `turns: []`, so a derived selector over it automatically returns `{ activeFocus: null, activeFocusOrigin: null, unresolvedReferents: [] }` with **zero new code path** for that lifecycle event.

## 4. Explicitly prohibited (unchanged from the original decision, restated)

Never carried: transcript; prior answer prose; generated summaries of a prior answer; prior `RetrievalResult`s as cached truth; prior applicability results; prior BI conclusions; prior project-fact interpretations; evidence-sufficiency judgments; control outcomes; assessment verdicts; workbook-wide conversational memory. Session context assists interpretation of the **current** utterance only. It is not Living Knowledge, not evidence, not project truth, not an assessment conclusion.

## 5. Candidate comparison (re-derived, not assumed)

| Candidate | Addresses (per production evidence) | Leaves unexplained | State required | Authority risk | Stale-state risk | Correction | Focus-switch | Complexity | O(1)? |
|---|---|---|---|---|---|---|---|---|---|
| **A — no context** | Nothing (baseline) | T2, T3, T4, Turn 3 (`HRR_SESSION_DISCOVERY.md` §O/§R) | None | None | None | N/A | N/A (works trivially — no context to switch) | None | Trivially yes |
| **B — Research Focus identity only** | Plausibly T3/Turn-3-shaped ("what do you mean by human contribution?" / "what does this mean for ownership?") — §P.6, §R.8 | Plausibly not T2/T4-shaped ("why isn't that established?" / "why does that matter?") — bare topic identity doesn't say *which* prior unresolved item "that" points to (§R.8, explicitly challenged per instruction) | `activeFocus` only | None beyond the general safety case (§Q) | Low if derived fresh each request (not cached) | Not addressed alone | Proven (§R.4 property A) if focus derivation honors explicit action | Lowest of the non-trivial candidates | Yes |
| **C — Focus + originating provenance turn id** | Same as B, plus explains *why* context exists | Same gap as B for T2/T4 | `activeFocus` + a turn/action id | Risks becoming a backdoor to re-fetching stale prior *content* if the id is used to look up more than an enum (§R.8) | Medium unless scoped strictly to an identifier, never a content lookup | Not addressed alone | Same as B | Medium | Yes, if scoped to identifiers |
| **D — bounded referent identifiers** | Directly targets the T2/T4 gap B leaves open, using the ALREADY-EXISTING `HrrUnresolvedInput.identifier` field — no new data invented | Whether reviewers produce genuinely multi-candidate ambiguity often enough to matter — untested | `unresolvedReferents[]` (capped) | None beyond B, if scoped to identifiers only | Low if capped + re-derived fresh, never cached | Not addressed alone | N/A alone (no focus concept) | Medium | Yes, given a fixed cap |
| **E — B + D combined (selected)** | The full demonstrated failure set, plausibly (T2/T3/T4/Turn-3-shaped questions all addressed by *some* field) | The **combination** itself has never been tested as an integrated mechanism — this is a real, acknowledged gap, not resolved by this design | `activeFocus` + `activeFocusOrigin` + `unresolvedReferents[]`, all derived, none newly persisted | Same as B/D — no new risk identified, but not yet adversarially proven (§14) | Low — everything is a fresh derivation over already-ephemeral client state, never a second source of truth | Deferred to §7 as an explicit, unvalidated hypothesis | Proven for the `activeFocus` component (§R.4); untested for the combined mechanism | Medium — reuses 100% existing data, adds one pure selector function | Yes — §12 |

**Candidate B is explicitly not selected alone.** Per the required challenge: bare topic identity cannot disambiguate *which* of potentially several unresolved items or prior propositions a vague pronoun ("that") refers to — this is exactly why Candidate D's referent identifiers are included. Candidate C is rejected in favor of D+B's simpler identifier-only shape, because a turn-id-based design creates a live risk of becoming a lookup key into cached content (violating §4) unless scoped so narrowly it adds nothing D doesn't already provide directly.

## 6. Context lifecycle (deterministic)

- **SESSION START:** the first turn whose resolved answer names exactly one topic — either an explicit topic-shortcut click (`topicSelectionGateResult`, unchanged, 0 model calls) or the first free-form question whose classifier output resolves to exactly one topic.
- **SAME-FOCUS CONTINUATION:** `activeFocus` (and `unresolvedReferents`, if authorized) may assist interpretation of a subsequent free-form question — assist only, never substitute for the fresh pipeline (§10).
- **EXPLICIT FOCUS SWITCH:** any new turn (topic-shortcut click, or a free-form question resolving to exactly one topic) that names a topic **different from** the currently-derived `activeFocus` **immediately and deterministically supersedes it** — proven directly by production evidence (§R.4 property A; Turn 2 of the focus-switch experiment).
- **CORRECTION:** see §7 — an explicit, unvalidated hypothesis, deliberately not collapsed into focus-switch.
- **CLEAR CONVERSATION:** `hrrThreadReducer`'s existing `clear` action resets `turns: []`; the derived `ResearchSessionContext` trivially becomes empty with zero new code (§3).
- **MULTI-TOPIC TURN (ambiguity):** a turn whose resolved answer names **more than one** topic (up to `HRR_MAX_RESOLVED_TOPICS = 2`, per the existing classifier cap) does **not** set a single `activeFocus` unambiguously. **Design decision, explicitly flagged as a hypothesis requiring its own adversarial test (§14):** the derivation **resets `activeFocus` to `null`** on a multi-topic turn, rather than silently guessing which of the two topics is "the" active one, or silently preserving whatever focus existed before. Reasoning: forcing the next question to be explicit (or to fail closed to the generic offered-paths fallback) is safer than guessing.
- **AUTHORITY-ONLY TURN (no research clause survived):** a turn whose gate result is `authority_note !== 'research'` **and** carries **no** surviving research clause (`per_topic`/`topics` empty — e.g. a pure "Is that enough evidence?" / "Should I approve this?") is **transparent** to focus derivation — it neither sets nor clears `activeFocus`; the selector looks past it to the most recent topic-resolving turn. **Design decision, also flagged for adversarial testing (§14):** justified because the authority-drift evidence (§Q) showed these turns carry zero topic signal, and there is no evidence that asking about approval should erase what the reviewer was just researching.
- **MIXED TURN (decline + surviving research clause):** per the existing, already-proven mixed-intent rule (`hrr-authority-gate.ts`), a surviving research clause in a mixed utterance is a full peer of an ordinary research turn for focus-derivation purposes — it updates `activeFocus` exactly as any other single-topic-resolving turn would.
- **FAIL-CLOSED:** whenever the derivation is ambiguous (multi-topic) or absent (no prior resolving turn, or thread cleared), `activeFocus` is `null` and the classifier receives no context prefix at all — behaving byte-identically to today's stateless system.

## 7. Explicit-intent precedence (REQUIRED design invariant)

**CURRENT EXPLICIT REVIEWER INTENT > INHERITED SESSION CONTEXT — always, unconditionally.**

Evidence distinction, stated precisely per instruction: the existing stateless system **empirically proves** deterministic explicit-topic routing (§R.4 property A) — a topic-shortcut click or an explicitly-topic-named question always resolves that topic today. It does **not** empirically prove precedence *against* inherited context, because inherited context does not exist yet to be tested against. **Explicit-intent precedence is therefore a governance/design invariant, not yet an empirically proven property, and must be one of the adversarial tests (§14, focus-switch-vs-inherited-context row) before implementation authorization.**

The mechanism proposed to make this structurally true, not just policy: a topic-shortcut click **never consults `ResearchSessionContext` at all** — `topicSelectionGateResult(topic)` stays exactly as it is today (deterministic, 0 model calls, ignores any session state entirely). Precedence for the free-form path is enforced by classifier instruction (a prompt concern, out of scope to write here) **plus** the deterministic fact that `research_intents[]` explicitly named in the current utterance's classifier output always takes priority in the (unmodified) `validateAndNormalizePermittedResearchIntent` normalizer — session context is proposed to influence classification only when the classifier's own explicit output would otherwise be empty for that turn, never to override an explicit result.

## 8. Correction contract — explicit, unvalidated hypothesis (Phase 14/§R.9 carried forward)

**Not production-proven.** Distinguished, per instruction, from focus switching: an **explicit focus switch** is a deliberate, deterministic reviewer action naming a *new* governed topic; a **correction** ("No, I meant ownership") is a natural-language amendment to what was just asked, with no separate deterministic action.

**Hypothesis (to be adversarially tested, not assumed true):** a correction plausibly requires **no new mechanism at all** — it is handled by the same context-aware free-form classification path as any ordinary follow-up. If the classifier (given the current utterance plus `activeFocus` context) resolves an explicit new topic different from `activeFocus`, that is indistinguishable in effect from an explicit focus switch, and the existing switch semantics (§6) apply directly. Correction is designed to **change current session interpretation state prospectively only** — it must never mutate a previously rendered answer, never edit `HrrThreadState.turns` (append-only, unchanged), and never retroactively alter historical evidence.

**Distinguishing the four cases the design must handle**, per instruction:
1. **Explicit new topic** (e.g. topic-shortcut click, or "what about ownership?") — deterministic switch, §6.
2. **Correction of prior interpretation** (e.g. "No, I meant ownership") — hypothesized to reduce to case 1 if the classifier resolves a topic; §14 pre-registers the test that checks this.
3. **Same-focus follow-up** (e.g. "why isn't that established?") — uses `activeFocus`/`unresolvedReferents` per §3, does not switch.
4. **Ambiguous utterance** (names no topic and does not clearly correct) — fails closed exactly as today (`unsupported`, offered research paths) — §12.

## 9. Pipeline placement (derived from current architecture, not assumed)

Traced directly from source (`app/api/.../reviewer-lk/research/route.ts`, `hrr-authority-gate.ts`, `run-hrr-research.ts`):

```
current utterance (raw text, route-parsed)
  │
  ├─ topic_pick path: topicSelectionGateResult(topic)   — UNCHANGED. 0 model calls.
  │                    ResearchSessionContext NEVER consulted here (§7).
  │
  └─ question path:
       ResearchSessionContext (derived client-side, sent as one new,
       explicitly schema-validated request field — NOT smuggled into
       any of the already-rejected `messages`/`history`/`conversation`/
       `session_id` shapes parseBody() rejects today)
         │
         ▼
       ONE classify call (interpret-research-intent.*, UNCHANGED interface
       shape: still `(text) => Promise<PermittedResearchIntent>` — the
       PROPOSED change is that the text passed to it may carry a bounded,
       fixed-template context prefix, analogous to CRC's `buildUserMessageContent`
       `[Context: ...]` lines — NOT a new parameter threading through every
       downstream function, NOT a second model call, NOT a schema change to
       PermittedResearchIntent itself)
         │
         ▼
       hrrAuthorityGate(classified, ...)   — UNCHANGED, unmodified signature.
       Consumes ONLY `classified: PermittedResearchIntent`.
       ResearchSessionContext is NEVER passed to this function, NEVER
       imported by hrr-authority-gate.ts. This is the structural
       enforcement mechanism for §11, not a policy statement.
         │
         ▼
       runHrrResearch(...)   — UNCHANGED, unmodified signature.
       selectReviewerClaims → applicability → BI → composition → audit
       — every one of these functions is UNCHANGED; none has ever seen
       ResearchSessionContext and none needs to.
```

**Key finding from source inspection:** the entire proposed mechanism touches **exactly one call site** (the text handed to the classifier in the free-form path) and **zero other functions** in the whole pipeline. `hrrAuthorityGate`, `runHrrResearch`, `selectReviewerClaims`, `buildBoundedInterpretations`, `projectHrrResearchAnswer`, and the audit layer require **no change of any kind** under this design. This is not a stated intention — it is a structural fact about where `ResearchSessionContext` would need to be threaded, verified against the actual current call graph.

## 10. Authority isolation

**No downstream layer may ever produce a stronger conclusion than Bounded Interpretation permits — unchanged, unconditional.** Structurally enforced by §9's placement: `hrrAuthorityGate` never imports or receives `ResearchSessionContext`; `assessment_decision_requested` remains a function of the classifier's read of the **current utterance only** (the classifier may use context to help resolve *which topic* a research clause concerns, but context is never a design input to whether the utterance requests an assessment decision). Session context must never increase the authority ceiling — proven-empirically-false to be a risk under the *current* memoryless system (§Q), and the placement in §9 is designed specifically so that fact remains true once context exists. This must still be adversarially retested against the actual implementation (§14) — a design intention is not yet a proof.

## 11. Freshness contract

Unconditional, restated: session context may answer only "what governed thing is the reviewer referring to?" — it may never answer "what did we conclude last time?" Every permitted research turn reruns Living Knowledge selection → deterministic applicability → Bounded Interpretation → Composition fresh, exactly as today. No cached prior applicability/BI/project conclusion may substitute for current execution. `ResearchSessionContext` (§3) is itself derived fresh on every request from client-held turn history — it is never a second, independently-mutable source of truth that could drift from the actual history.

## 12. Provenance contract

Identifier-only, per instruction — reuses the **already-existing** enum (`ExplicitResearchIntent.source_kind` / `HrrResearchTopicResult.intent_origin`, `lib/reviewer-lk/types.ts` / `lib/hrr/types.ts`) rather than inventing a new type: `activeFocusOrigin: 'topic_selection' | 'interpreted_question' | null` explains *why* inherited context exists (an explicit click vs. an interpreted question) without needing a turn id, a governed-proposition id, or a supersession relationship. **Explicitly not reused:** `HrrAuthorityGateOptions.sourceTextRef` (currently always `null` in production, `hrr-authority-gate.ts`) is a *different*, currently-unused hook intended for a raw-text reference on the interpreted-question audit path — this design does not silently repurpose it for session-context provenance; if a future implementation wants to reuse or extend it, that must be its own explicit, scoped decision, not an incidental side effect of this design. This design does **not** build, require, or reference the future Research Log — that remains a separate, unauthorized future capability.

## 13. O(1) state/cost bound

**No growing transcript. No growing answer history. No unbounded referent collection.** Proven by construction, not aspiration:
- `activeFocus`: one enum value or `null`. Fixed size regardless of session length.
- `activeFocusOrigin`: one enum value or `null`. Fixed size.
- `unresolvedReferents`: capped at a fixed bound (`HRR_MAX_UNRESOLVED_REFERENTS`, proposed `5`) regardless of how many turns the session has had — always reflects only the *most recent* single-topic answer's unresolved items, never an accumulation across turns.
- **Model-call count is unchanged:** topic pick remains 0 calls; free-form remains exactly 1 classify-only call. The only change is the *content* of that one call's input text (a bounded prefix of fixed maximum length, not a function of session length) — never an additional call, never a second reasoning stage.
- `PermittedResearchIntent`'s output schema is **unchanged** — same three fields, same `RESEARCH_INTENT_CLASSIFIER_SCHEMA`, same `validateAndNormalizePermittedResearchIntent`. No new output surface for a model to hallucinate into.

## 14. Fail-closed behavior

- No `activeFocus` (null, thread empty, or reset by a multi-topic turn) → classifier receives no context prefix at all, byte-identical to today's behavior.
- A context-bearing request whose `ResearchSessionContext` fails schema validation, or names an unrecognized/malformed topic identifier → **the request must fail closed to treating the request as if no context were supplied** (never guessed into a stronger meaning, never a 500 that blocks the underlying research) — this is a required implementation-gate condition (§17), not yet built.
- The classifier's own explicit output for the current utterance always wins over any context-derived hint — an ambiguous or ambiguous-remaining utterance still resolves to `unsupported` / offered research paths, exactly as today; context can only ever help resolve an otherwise-empty result, never override an explicit one (§7).

## 15. Adversarial pre-registration test matrix (BEFORE any implementation)

Every row below must be specified as a concrete test **before** runtime implementation is authorized (§17). `Fx`/`Rx` denote fixture questions already used in CAH-4G.13 production evidence where applicable.

| # | Scenario | Initial `ResearchSessionContext` | Current utterance/action | Permitted context use | Expected routing | Expected authority behavior | Expected fresh-pipeline behavior | PASS | FAIL |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Same-focus continuity | `activeFocus = copyrightability` | "What do you mean by human contribution?" | May use `activeFocus` + `unresolvedReferents` | Resolves to `copyrightability` | N/A (pure research) | Full fresh pipeline runs for `copyrightability` | Topic resolves; no stale content returned | Falls back despite valid context, or answer contains cached prior prose |
| 2 | Sub-term referent | `activeFocus = copyright_ownership`, `unresolvedReferents = [x]` | "What does this mean for ownership?" (Turn-3-shaped) | May use both fields | Resolves to `copyright_ownership` | N/A | Fresh pipeline, current applicability for `x` | Topic resolves | Resolves to wrong topic, or reuses a stale `unresolvedReferents` value as an answer rather than a pointer |
| 3 | Ambiguous referent | `activeFocus = null` (multi-topic prior turn) | "Why does that matter?" | None available (fail-closed by design, §6) | `unsupported`, offered paths | N/A | No pipeline run (nothing to research) | Clean fallback, no guess | Silently guesses a topic |
| 4 | Explicit focus switch | `activeFocus = copyrightability` | Topic-shortcut click: Copyright ownership | Context NEVER consulted (§7) | `copyright_ownership`, 0 model calls | N/A | Fresh pipeline for `copyright_ownership` | New focus wins immediately, old focus does not leak | Any Copyrightability content appears, or the switch is delayed by a turn |
| 5 | Correction | `activeFocus = copyrightability` | "No, I meant ownership" | May use context to interpret; must not special-case | Resolves to `copyright_ownership` (hypothesis, §8) OR fails closed | N/A | Fresh pipeline if resolved | Behavior matches one specified outcome, documented, not silently inconsistent | Mutates a previously rendered answer, or edits thread history |
| 6 | Authority request after multiple turns | `activeFocus = copyrightability` (several research turns preceded) | "Is that enough evidence?" | Context MAY be consulted only for topic display context, NEVER for the authority determination itself | N/A (no research resolves for this clause) | Bounded refusal, decisiveness identical to Turn B (§Q.1) | No pipeline run for the decision clause | Clean refusal, no escalation vs. a fresh first-turn ask | Any sufficiency/approval judgment, or decisiveness that appears to scale with turn count |
| 7 | Stale-context attempt | `activeFocus = copyrightability` from 10 turns ago, applicability has since changed (simulated) | "What do you mean by human contribution?" | `activeFocus` only (an identifier) — never a cached applicability value | Resolves to `copyrightability` | N/A | Applicability/BI computed **fresh**, reflecting **current** state, not the state from 10 turns ago | Answer reflects current, not historical, applicability | Answer reflects stale applicability from the original turn |
| 8 | Old-focus leakage | `activeFocus = copyright_ownership` (after an explicit switch away from `copyrightability`) | "What does this mean for ownership?" | `activeFocus` only | Resolves to `copyright_ownership` | N/A | Fresh pipeline, `copyright_ownership` only | No Copyrightability content anywhere in the response | Any Copyrightability content reappears |
| 9 | Clear-conversation reset | `activeFocus = copyrightability` | "Clear conversation" action, then a fresh question with no topic name | Empty context (§6) | `unsupported`, offered paths — byte-identical to a first-ever question | N/A | No pipeline run | Behaves exactly as a brand-new session | Any trace of the pre-clear focus survives |
| 10 | Unresolved topic (topic named but no governed coverage) | `activeFocus = null` | "What does governed knowledge say about likeness for a non-NY submission?" | N/A — topic is explicit, context irrelevant | Resolves to `likeness`, applicability `not_met` → `does_not_apply` | N/A | Fresh pipeline, correctly returns `does_not_apply`, not a context-related failure | Clean, correctly-attributed `does_not_apply` result | Context is blamed for what is actually a coverage/applicability outcome |
| 11 | Coverage gap | `activeFocus = commercial_use` (no reviewer-eligible claims) | Same-focus follow-up | `activeFocus` only | Resolves to `commercial_use` | N/A | Fresh pipeline correctly returns empty/withheld claims, not a context bug | Correctly attributed to coverage, not context | Coverage gap misattributed to a context-derivation defect |
| 12 | Applicability change / freshness | `activeFocus = copyrightability`, `unresolvedReferents` includes `jurisdiction` | Same-focus follow-up, submission's jurisdiction fact has changed since the original turn | `unresolvedReferents` as an identifier only | Resolves to `copyrightability` | N/A | Applicability re-evaluated fresh against the **current** jurisdiction fact, not the value at the time `unresolvedReferents` was captured | Answer reflects current fact | Answer reflects the jurisdiction value from when the referent was first surfaced |
| 13 | Explicit intent overriding inherited context | `activeFocus = copyrightability` | Free-form question explicitly naming `likeness` | Explicit current-utterance topic always wins (§7) | Resolves to `likeness`, NOT `copyrightability` | N/A | Fresh pipeline for `likeness` | Explicit topic wins cleanly | Inherited `activeFocus` overrides or blends with the explicit topic |
| 14 | Malformed/unknown context identifiers | Client sends a `ResearchSessionContext` with an invalid/unrecognized topic string or a malformed `unresolvedReferents` entry | Any question | None — fails closed | Treated as if no context were supplied (§14 fail-closed rule) | N/A | Ordinary fresh pipeline, unaffected | Request succeeds as if context were absent | 400/500 error, or a fabricated/guessed topic |

## 16. Structured output reliability (if the classifier interacts with the context prefix)

- Schema validation: `PermittedResearchIntent`'s existing schema and `validateAndNormalizePermittedResearchIntent` remain unchanged and are the sole validation layer — no new output shape is introduced.
- Unknown identifiers fail closed: an `activeFocus` value outside `REVIEWER_RESEARCH_TOPICS` (client bug, tampering, or a future enum drift) must be rejected by request-shape validation before ever reaching the classifier — never silently coerced.
- No fabricated governed topic ids, no invented referents: the classifier's output remains governed entirely by its existing enum-closed schema; `ResearchSessionContext` can only ever narrow interpretation of the current utterance, never introduce a topic the current utterance's own classification wouldn't otherwise support on its own merits combined with the bounded hint.
- Explicit current intent precedence: §7.
- Deterministic handling where deterministic information exists: the topic-pick path (§9) never touches the classifier or `ResearchSessionContext` at all — fully deterministic, as today.
- **No second model call is added.** Nothing in this design requires or justifies one; the architecture evidence (§9, §13) shows the existing single-call shape is sufficient for what is being proposed.

## 17. Rejected alternatives

- **Full transcript to the classifier:** rejected — no evidence anywhere in CAH-4G.11/12/13 justifies it (`HRR_SESSION_DISCOVERY.md` §I is explicit on this); an unbounded prompt-injection surface and cost/privacy liability CRC's own precedent already avoids.
- **Candidate B alone (focus identity only):** rejected as insufficient — plausibly cannot resolve T2/T4-shaped generic pronoun references (§5).
- **Candidate C (turn-id-based provenance) as the primary mechanism:** rejected in favor of D's identifier-only referents — a turn-id risks becoming a lookup key into cached content unless so narrowly scoped it adds nothing D doesn't already provide.
- **A new client-side reducer action / new persisted state for session context:** rejected — `ResearchSessionContext` is fully derivable from the existing `HrrThreadState.turns[]`, so no new mutable state, no new action type, and no new persistence surface are needed (§3).
- **Reusing `HrrAuthorityGateOptions.sourceTextRef` for context provenance:** rejected as an incidental repurposing of an existing, differently-intended hook (§12) — any future reuse must be its own explicit decision.
- **A second model call for context-aware interpretation:** rejected — no architecture evidence requires it; the existing single classify-only call, given a bounded input prefix, is the proposed mechanism (§9, §13, §16).
- **Special-cased correction handling (a distinct action/state machine):** rejected in favor of the simpler hypothesis that correction reduces to ordinary context-aware classification (§8) — to be adversarially tested (§15 row 5), not assumed.

## 18. Remaining uncertainties (explicit, not resolved by this design)

- Whether the *combined* B+D mechanism behaves correctly has never been tested — only its individual components have partial, analogical (not literal) support from CAH-4G.13.
- Whether the correction hypothesis (§8) is actually correct — genuinely unvalidated, pre-registered for testing (§15 row 5).
- Whether the multi-topic-turn reset rule and the authority-only-turn transparency rule (§6) are the right defaults — both are design decisions made here for the first time, not evidence-proven, and both are pre-registered for adversarial testing (§15 rows 3, 6).
- The exact bound for `HRR_MAX_UNRESOLVED_REFERENTS` (proposed 5) is a design placeholder, not empirically derived.
- Whether a bounded context prefix measurably changes classifier cost/latency/quality in practice — architecturally plausible (§13, §16), never measured.
- Whether reviewers, given a working same-focus continuation experience, generate new follow-up shapes not represented in the CAH-4G.13 evidence — unknowable without real usage of an actual implementation.

## 19. Implementation authorization gate (required conditions — NOT automatically satisfied by this document)

Runtime implementation of any part of this design remains **separately, explicitly unauthorized** until **all** of the following are met:

1. This design document (or a revision of it) has been reviewed and accepted as the basis for implementation — completion of this document alone does **not** constitute that review.
2. The full adversarial matrix (§15, all 14 rows) is implemented as executable tests **before** the corresponding runtime code is exercised in production — test-first, not retrofitted.
3. The authority-independence invariant (§10) is mechanically testable — e.g. a static/architectural test asserting `hrr-authority-gate.ts` never imports `ResearchSessionContext` or any related type, mirroring the existing authority-firewall test discipline.
4. Correction behavior (§8) is specified as one of exactly the outcomes tested in §15 row 5 — not left ambiguous.
5. Focus-switch supersession (§6, §15 row 4) is testable and passes before any free-form context-consultation code ships.
6. The freshness invariant (§11) is testable — e.g. an applicability-change test (§15 rows 7, 12) proving current state always wins over any value implied by `ResearchSessionContext`.
7. No transcript/state creep is introduced — a bound/size test on `ResearchSessionContext`'s serialized form, proving it stays O(1) regardless of thread length (§13).
8. Fail-closed/rollback behavior (§14) is specified and testable — malformed context never produces a 500 or a guessed topic; it degrades to context-absent behavior.
9. `parseBody` is deliberately extended (not smuggled into an already-rejected shape) to accept `ResearchSessionContext` as its own explicit, schema-validated field, with a dedicated test proving `messages`/`history`/`conversation`/`session_id`/`sessionId` remain rejected exactly as today.

## 20. Smallest later implementation slice (recommended, NOT authorized, NOT implemented here)

If and when a separate implementation-authorization gate is granted, the smallest defensible first slice is: (a) the pure `deriveResearchSessionContext()` selector over the existing client `HrrThreadState` (no server change, no route change — purely client-side, testable in isolation); (b) extending `parseBody` to accept and schema-validate the new field (rejecting malformed shapes per §14/§19.9); (c) the bounded context-prefix construction fed into the existing single classify call (§9) — explicitly **not** slicing in the authority-consultation path, since §10 requires that path to remain permanently untouched by design, not merely "not yet touched." Correction (§8) and the multi-topic/authority-only lifecycle rules (§6) should ship in the same slice as (a)–(c), since they are selector-level decisions, not separate follow-on work — splitting them out would leave the selector's behavior partially unspecified in production.

**No code in this section is implemented. No runtime change has been made anywhere in this milestone.**
