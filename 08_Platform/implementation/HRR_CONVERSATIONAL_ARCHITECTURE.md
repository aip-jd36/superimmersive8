# HRR Conversational Research — Architecture & Design (CAH-4G.9)

**Status:** `CAH-4G.10 SLICE A — CLOSED / PRODUCTION-PROVEN` — `CAH-4G CONVERSATIONAL HRR — VISIBLE THREAD PRODUCTION-PROVEN / BOUNDED CONVERSATIONAL CONTEXT NOT STARTED` (CAH-4G.10C, 2026-09-11). A PM-performed authenticated production UAT against the internal synthetic fixture `CA-RLK-2a PROD SMOKE` / `ASSESS-007-2026-09-07` **passed all 10 acceptance checks** (§FF) — production is confirmed serving the Slice-A append-only conversational thread (`origin/main` = `2d648d3`, unchanged since CAH-4G.10I; source contract re-verified — §GG). **What is closed:** the VISIBLE conversational thread only — successive research turns append, retain history, and the composer clears on submit, as designed. **What remains open:** bounded conversational context / follow-up referent resolution (Slice B) is a **separate, still-`NOT STARTED` / not-PM-authorized** milestone; each question today is still researched fully independently. Non-blocking product observations from this UAT are recorded in §HH (thread density, duplicate question rendering, a navigation-persistence product question for a future decision) — **none are Slice-A defects and none are fixed in this milestone.** As-built: §BB. Deployment-gap reconciliation: §CC. Integration/deployment record: §DD. PM UAT script (now executed): §EE. Production UAT evidence: §FF. Post-UAT source reconciliation: §GG. Non-blocking observations: §HH.

**Companion docs:** `PRD_CAH_4G_HRR.md` (the *what*), `HRR_GRI_TECHNICAL_DESIGN.md` (§N single-turn model — **amended by this doc**, §R future GRI reuse), `ADR-002` (intent entry ≠ answer authority), `ADR-003-hrr-conversation-context.md` (the decision recorded below), `REVIEWER_RESOURCES_ARCHITECTURE.md` §15/§18.

---

## A. The production-UAT finding this addresses

CAH-4G is **production-deployed** (`main` = `0413291`, `app.superimmersive8.com`) and **semantically safe**. PM production UAT confirmed PASS on: the initial HRR / Living Knowledge surface; the topic-shortcut path; the `copyright_ownership` governed response; the unresolved-`copyrightability` behaviour; free-form natural-language classification into the governed pipeline; the semantic / authority boundaries exercised so far.

**Material finding (not a defect, not a rollback):** the single-turn model is *too visible* to the Human Reviewer. After a free-form question and its correct governed response, asking a second question **replaces / clears** the first interaction. A reviewer doing research expects a **conversational research thread** (interaction model similar to CRC):

```
Reviewer:  What does governed knowledge say about copyright ownership here?
HRR:       [bounded governed research response]
Reviewer:  What about copyrightability?
HRR:       [bounded governed research response]
Reviewer:  Why does that matter?
HRR:       [bounded governed response if safely resolvable]
Reviewer:  Does that mean I should approve this?
HRR:       [assessment-authority boundary response]
```

Therefore CAH-4G is **not yet `CLOSED / PRODUCTION-PROVEN`**. The deployed system stays; this milestone designs the conversational research experience.

---

## B. The distinction that governs this design

Two concepts that must **never** be collapsed:

| | |
|---|---|
| **CONVERSATION UX** | what turns the reviewer sees in a thread. A UI construct. |
| **REASONING CONTEXT** | what prior information the classifier / retrieval / interpretation pipeline is *permitted* to use when resolving a new question. A governance construct. |

A visible thread does **not** authorize sending the transcript to an LLM. Prior HRR answer prose must **never** silently become: project fact · evidence · assessment state · governed knowledge · applicability input · authority · a new `UserGoal` · a stronger conclusion.

The whole design keeps the visible thread as UX and gives the reasoning pipeline **only a bounded, enum-only structured referent** (§J).

---

## C. Current HRR turn architecture (as-built, traced from source)

### C.1 Call / data flow — free-form path

```
ReviewerLkLookup.tsx  (client, 'use client')
  useState<State>  state: idle | loading | {answer} | error   ← ONE current response
  useState(question)                                          ← composer text
  useRef seqRef = 0                                           ← monotonic race guard
        │  submitQuestion() / TopicShortcuts onClick
        ▼
  research(payload)  (useCallback [submissionId])
    const mine = ++seqRef.current
    setState({kind:'loading'})
    fetch POST /api/admin/submissions/{id}/reviewer-lk/research
          body: {mode:'topic_pick',topic} | {mode:'question',question}
          cache:'no-store'
    if (mine !== seqRef.current) return           ← stale-drop (no AbortController)
    → setState({kind:'answer', answer})           ← REPLACES prior answer  (line ~141)
        │
        ▼
  app/api/admin/submissions/[id]/reviewer-lk/research/route.ts   (POST, force-dynamic)
    1. checkReviewerContextAccess()               → 401/403 (server-resolved identity only)
    2. request.json() → parseBody()
         rejects: non-object/array; messages|history|conversation|session_id|sessionId;
                  bad topic enum; blank; > HRR_QUESTION_MAX_LENGTH (1000)
    3. resolve intent:
         topic_pick → topicSelectionGateResult(topic)              [0 model calls]
         question   → createAnthropicResearchIntentInterpreter()(question)   [≤1 classify call]
                        · messages: [{role:'user', content: reviewerQuestion}]   ← SINGLE string
                        · system: RESEARCH_INTENT_SYSTEM_PROMPT (static)
                        · enum/boolean-only schema (RESEARCH_INTENT_CLASSIFIER_SCHEMA)
                        · thinking disabled; 1 recovery retry; FAILS CLOSED, never throws
                    → hrrAuthorityGate(classified, {sourceTextRef:null})   (deterministic)
    4. getSubmissionFactsForReviewerLk(id)  → buildReviewerLkContext(facts)   ← FRESH, in memory
         null → 404
    5. runAuditedHrrResearch({gate, reviewerContext, topicClaims: TOPIC_CLAIMS_FIXTURE,
                              attributedQuestion, actorUserId: access.userId, submissionId})
         │
         ├─ runHrrResearch(input)                 PURE — no I/O, no model, no DB
         │    per permitted ExplicitResearchIntent:
         │      selectReviewerClaims({topic, topicClaims, assetProviderIds,
         │                            activeToolIds, applicabilityFacts})
         │      partition: any not_met requirement → does_not_apply[]  (NOT fed to BI)
         │                 met / unresolved       → governed_claims[]  (fed to BI)
         │      researchIntentToBiIntent(intent)   → BiIntent  (intent_text = FIXED topic label,
         │                                                       never the raw question)
         │      governed_claims.map(reviewerClaimToBiResult)  → BiResult[]
         │            applicability: unresolved ≥1 → {status:'unresolved', unresolved_requirements}
         │                                  else   → {status:'established'}
         │      buildBoundedInterpretations([biIntent], biResults, [], {state:'unknown'})
         │    → HrrResearchResult { authority_note, attributed_question, per_topic[],
         │                          offered_research_paths, unresolved_ambiguity }
         │
         ├─ projectHrrResearchAnswer(result)      PURE, deterministic, NO model call
         │    → HrrResearchAnswer { research_mode, question_text, authority_note,
         │        assessment_authority_note, scope_note, topics[], offered_research_paths,
         │        reviewer_responsibility_note }
         │    every substantive string = grounding A–E (verbatim governed statement / deterministic
         │    applicability / verbatim BI summary_blocks / fixed HRR_ANSWER_TEMPLATES / mechanical
         │    enumeration). question_text = verbatim quotation, NEVER a grounding source.
         │
         ├─ projectHrrAuditRecord({actorUserId, submissionId}, result)   PURE
         │    → {actorUserId, submissionId}  iff  result.per_topic.length > 0  else null
         │
         └─ if (auditRecord !== null): await recordReviewerLkAccess(auditRecord)
                 throw → HrrAuditNotRecordedError   → route 503, ZERO governed content
         → return HrrResearchAnswer
        │
        ▼
  route: NextResponse.json(answer)     (503 audit-fail / 503 classifier-ctor / 404 no submission / 500 other)
        │
        ▼
  HrrResearchAnswerView  (the ONE renderer, both modes; Slice-7 consultative order:
     orientation → What remains unresolved → verbatim BI reading → Applicability settled →
     does-not-apply → boundary_note → one <details> "Provenance & governance details" → footer)
```

### C.2 What is CURRENTLY STATEFUL vs STATELESS

| Layer | State |
|---|---|
| `runHrrResearch` | **STATELESS** — pure function, rebuilt per call, no memory of prior calls. |
| classifier call | **STATELESS** — sees only the one question string. No transcript, no prior question, no submission facts, no prior resolved topic. |
| authority gate | **STATELESS** — deterministic function of one `PermittedResearchIntent`. |
| route | **STATELESS** — every value (auth, facts, context, claims) resolved fresh per request. |
| audit | **STATELESS / append-only** — one `lk_research` row per research action; `{actor_user_id, submission_id, access_kind, created_at}` only. No dedup, no conversation id. |
| `ReviewerLkLookup` (client) | **STATEFUL (client only):** `state` (ONE current answer), `question` (composer), `seqRef` (monotonic race guard). |
| persistence | **NONE** — no `localStorage` / `sessionStorage` / IndexedDB / cookie / DB. Page refresh → empty surface. |

### C.3 Where "one question → one answer → replace" is created

Exactly one place: `ReviewerLkLookup.tsx` holds a **single** `state` slot, and every `research()` call ends with `setState({ kind: 'answer', answer })` (≈ line 141) — the new answer **overwrites** the previous one. `Clear` (≈ line 229) does `seqRef.current++; setState({ kind: 'idle' }); setQuestion('')`. There is no turn list. Nothing server-side enforces single-turn — the server was already built turn-agnostic.

### C.4 Abort / race / storage

- **Race:** monotonic `seqRef`; a slower earlier response with `mine !== seqRef.current` is discarded. No `AbortController` — the in-flight `fetch` completes; only its result is dropped.
- **Storage:** none. Survives inspector tab-switch and inspector close/reopen because both are **hidden, not unmounted** (`ReviewerResourcesInspector` toggles `block`/`hidden`; `ReviewerShell` renders the aside with `${open ? 'flex' : 'hidden'}`). Only a React remount (page refresh / navigation) clears it.

---

## D. Current CRC conversation architecture (traced from source — NOT inferred)

### D.1 Call / data flow

```
app/crc/page.tsx  (client, 'use client')
  useState messages: Message[]  {role:'user'|'assistant', text}      ← scrollback only
  useState projection / teaser / resultsEmail / phase / inputText …
  useRef pendingRequestRef  ← exact last POST body, for Retry
  NO localStorage / sessionStorage — server-side session via httpOnly cookie
        │  GET /api/crc/turn on mount  → {status:'new'|'active'|'complete'|'session_not_found'}
        │      status:'active'  → setMessages(data.transcript)
        │  GET ?restart=true            → clears the cookie
        │  POST /api/crc/turn  { message } | { declineAction } | { email } | { resendResultEmail }
        ▼
  app/api/crc/turn/route.ts  (POST)
    httpOnly cookie `crc_session` (opaque; client JS never reads the raw value)
    resolve/create session:
      isNewSession → token = randomUUID(); turnNumber = 1; transcript = []
      else → sessionStore.load(token)  (Supabase)  → engineState : CRCSessionState | null (404 if null)
             productState = loadCrcSessionProductState(token)  → turn_count, transcript, email, …
    abuse key + traffic classification + rate limits (session-creation / burst / turn-ceiling)
    (email / resend branches: no runTurn, no model cost — deliverCrcResultsEmail)
        │
        ▼
    runTurn({ token, turnNumber, userText, declineAction }, deps)      ← userText = ONE new message
      deps = { extractor: createAnthropicExtractor(),
               generator: createAnthropicCandidateQuestionGenerator(),
               decider:   createAnthropicConstraintADecider(),
               sessionStore, matrix, topicClaims, relationships }
        │
        ├─ suLoaded = engineState.structured_understanding        ← the ACCUMULATOR
        │  if suLoaded.completion_reason !== null → short-circuit: runCRCConversation(suLoaded, …)
        │
        ├─ rawTurn: RawUserTurn = {
        │     turn, text: userText,
        │     pending_clarification: loaded?.pending_clarification ?? null,
        │     current_human_contribution_description: <confirmed value | null>,
        │     answering_jurisdiction_question: boundaryState.jurisdiction_clarification_pending_answer
        │  }
        ├─ runExtractionPipeline(suLoaded, rawTurn, deps.extractor)
        │    deps.extractor(turn):
        │      client.messages.parse({
        │        system: SYSTEM_PROMPT,                              ← static
        │        thinking: { type: 'disabled' },
        │        messages: [{ role:'user', content: buildUserMessageContent(turn) }],
        │        output_config: jsonSchemaOutputFormat(CANDIDATE_RESPONSE_SCHEMA)  ← enum/hint-only
        │      })
        │      buildUserMessageContent(turn) =
        │         turn.text
        │         + ≤4 FIXED-TEMPLATE `[Context: …]` lines derived from BOUNDED STRUCTURED state:
        │              pending_clarification.unresolved_summary   (pure fn of SU — never a live model's prose)
        │              current_human_contribution_description     (a confirmed structured fact value)
        │              answering_jurisdiction_question            (boolean → fixed template)
        │              answering_content_presence_question        (boolean → fixed template; no prod setter yet)
        │         ── NO transcript. NO prior-turn prose. NO full structured_understanding dump.
        │    → CandidateObservation[]  (candidates: tool_mention / scoped_observation / project_fact /
        │                               user_goal / asset_provider_mention / …; is_correction?, supersedes_*_id?)
        │    → attestCandidate + supersede*  → DETERMINISTIC merge into a new StructuredUnderstanding
        │       (old records kept with superseded_by set — APPEND-ONLY, history never rewritten)
        │
        ├─ evaluateGate1 / evaluateGate2 / computePhase / checkCompletion   (deterministic)
        ├─ candidate-question generation (deps.generator) / Constraint A decider (deps.decider)  as needed
        ├─ buildPendingClarification(proposal, SU)  → next turn's deterministic templated referent
        └─ sessionStore.save(token, { structured_understanding, boundary_state,
                                      pending_clarification, pending_commercial_readiness_takeaway })
             ── LAST step on every path — persist-only-after-success
        │
        ▼
    route: saveCrcSessionProductState(token, { turn_count, transcript: updatedTranscript })
             updatedTranscript = [...transcript, {role:'user',text,timestamp,message_kind},
                                  (precedingTakeaway?), {role:'assistant',text,timestamp,message_kind}]
           setSessionCookie(response); return minimum browser-safe body (never internal phase/gate ids)
```

### D.2 CRC facts that matter for CAH-4G.9

| Concern | CRC as-built |
|---|---|
| **Durable engine state** | `CRCSessionState` = `structured_understanding` + `boundary_state` + `pending_clarification` + `pending_commercial_readiness_takeaway`. **Deliberately excludes raw `conversation_history`** — its own type header calls that "a UI-only, append-only concern". |
| **Transcript** | a **separate** product-state column (`transcript: TranscriptEntry[]`), written after a successful turn, **for UI scrollback / page-refresh rehydration only**. **Never fed to the model.** |
| **Model context** | `buildUserMessageContent(turn)` = the ONE new `userText` + ≤4 fixed-template `[Context:]` lines from **bounded structured state**. The prior `structured_understanding` is merged **deterministically after** extraction, not sent to the model. **CRC never sends a transcript to an LLM.** |
| **Referent resolution** | `pending_clarification.unresolved_summary` — a pure, deterministic, templated function of `StructuredUnderstanding` (explicitly *not* a different subsystem's non-deterministic phrasing). At most one pending at a time. |
| **Corrections** | append-only supersession: a correction candidate carries `is_correction` / `supersedes_*_id`; `supersedeUserGoal` / `supersedeToolMention` / … set `superseded_by` on the old record (kept) and add the new one. History is never rewritten. |
| **Track A** | generic discovered relevance from structured project facts; **never mutates or fabricates a `UserGoal`**; produces an additive `DiscoveredTopicOccurrence`. |
| **Track B** | generic governed-knowledge readiness / dependency askability. |
| **Track C** | discovered-topic `RetrievalResult`s **preserve the originating explicit goal** (`identifier: sourceGoalCategory`) so governed knowledge can contribute to that user's answer without fabricating another `UserGoal`. Explicit goal always wins provenance over a discovered occurrence of the same topic. |
| **Session identity** | httpOnly cookie `crc_session` (opaque; client JS never reads it). |
| **Client state** | `messages: Message[]` (role/text) for scrollback; hydrated from `data.transcript` on GET; no browser storage; `?restart=true` clears; optimistic display + retry-exact-body via `pendingRequestRef`. |
| **Reload / resume** | GET rehydrates: `active` → returns `transcript`; `complete` → re-runs `runCRCConversation` (pure) to rebuild the result view + returns `transcript`. |
| **Concurrency** | server-side rate limits (burst via `updated_at`, turn ceiling); client `pendingRequestRef` + a single in-flight request. |
| **Persistence backend** | `createSupabaseSessionStore` bound to `crc_sessions` + the `CRCSessionState` shape; deeply entangled with the Interview Engine (`run-turn.ts` ≈ 1180 lines: gates, phases, boundary state, completion). Frozen, revenue-path. |

---

## E. CRC vs HRR architecture matrix

| Concern | CRC today | HRR today | Generic? | Must stay product-specific? |
|---|---|---|---|---|
| Thread UI (stacked turns) | yes (`messages`) | **no** (one slot) | **YES** — a turn list is domain-free | — |
| Message primitives (role, text, id, timestamp) | `TranscriptEntry` | — | **YES** | — |
| Turn identity | transcript index / timestamp | — | **YES** (add explicit turn id) | — |
| Conversation identity | httpOnly cookie → Supabase session | — | LATER (only if HRR ever persists) | CRC's `crc_session`/`crc_sessions` binding is CRC-specific |
| Local client state | `messages`, `pendingRequestRef` | `state`, `question`, `seqRef` | **YES** — one-in-flight + stale-drop + append is generic | — |
| Persistence | Supabase (`CRCSessionState` + `transcript`) | none | **DO NOT SHARE** | CRC needs cross-refresh resumability for a gated deliverable; HRR does not |
| Reload / resume | GET rehydrates from DB | empty on refresh | product-specific | HRR V1 = ephemeral (§H) |
| Transcript rendering | `messages.map` | `HrrResearchAnswerView` (one answer) | **YES** — a `<ThreadView>` taking opaque per-turn slots | the per-turn *content* renderer stays product-specific |
| Composer / input | `<Textarea>` + submit | `<textarea>` + Ask + Cmd/Ctrl+Enter | **YES** | — |
| Loading turn | phase `loading` | `state.kind==='loading'` | **YES** | — |
| Error turns | `retry` / `rate_limited` status | `state.kind==='error'` | **YES** | error *copy* + which statuses map stays product-specific |
| Retry | resend exact last body (`pendingRequestRef`) | re-click / re-submit | **YES** | — |
| Race handling | single in-flight + rate limits | monotonic `seqRef` | **YES** | — |
| Corrections | append-only supersession in SU | none | pattern is **generic**; mechanism is SU-specific | HRR corrections = new turn + referent advance (§L) |
| Model context | `buildUserMessageContent` (bounded `[Context:]` lines) | one question string | pattern **generic**; HRR's is far smaller | each product's context fields are its own |
| Referent resolution | `pending_clarification.unresolved_summary` | none | pattern **generic** | HRR referent = `{topic, scope, bi_status}` (§J) |
| `UserGoal` semantics | Interview Engine | n/a (HRR uses `ExplicitResearchIntent`) | **DO NOT SHARE** | — |
| Retrieval | `retrieve()` + Track A/B/C | `selectReviewerClaims` (reviewer channel) | **DO NOT SHARE** (parallel selectors; a shared *interface* is §R-3, post-HRR) | — |
| Applicability | deterministic, over `StructuredUnderstanding` facts | deterministic, over submission facts | same engine family; **inputs are product-specific** | — |
| Bounded Interpretation | `buildBoundedInterpretations` | same fn, via `BiIntent`/`BiResult` adapters | **ALREADY SHARED** (`BiIntent`, CAH-4G.1) | — |
| Composition | `buildConsultativeAnswerPlan` + realization | `projectHrrResearchAnswer` + `HRR_ANSWER_TEMPLATES` | primitives LATER (§R); realization stays separate | audience / authority stance differ |
| Authority | none (CRC has no "assessment decision") | `hrrAuthorityGate` + `assessment_decision_requested` | **DO NOT SHARE** | HRR-only |
| Audit | pilot events / analytics / transcript column | `lk_research` access row (bounded) | **DO NOT SHARE** | different meaning |
| Privacy | server session; transcript persisted (product); raw msgs to model | client-only; nothing persisted; one question to model | HRR is stricter — keep it | — |
| Evidence boundary | workflow evidence → readiness | reviewer prose ≠ evidence, ≠ project fact (§M) | **product-specific, both strict** | — |
| Project-state mutation | extraction updates SU (that IS the point for CRC) | **HRR must never mutate assessment facts** (§M) | opposite stances by design | — |

**Nothing is labelled "shared" merely because both have a text box.** The genuinely generic surface is the *visible conversation shell* (turn list, rendering slots, composer, in-flight guard, clear). Everything that reasons is product-specific.

---

## F. Recommended GRI boundary

After repository inspection, **"GRI as one shared conversational engine" is the wrong abstraction.** CRC's conversational core is inseparable from the Interview Engine (frozen, production, revenue-path, ≈1180-line `run-turn.ts`). Extracting a shared orchestrator would be a broad refactor with high regression risk for near-zero near-term benefit.

**The right abstraction is: shared client-shell primitives + fully separate orchestration.**

### F.1 What belongs in shared infrastructure (`components/conversation/` — NEW client-only code)

- `ConversationTurn` type: `{ id: string; role: 'user' | 'assistant'; created_at: string; kind: string; payload: unknown }` — `kind`/`payload` are opaque to the shell.
- `useConversationThread()` hook: ordered append-only `turns[]`; `submit()` that appends a `user` turn + a pending `assistant` turn; one-request-in-flight guard + monotonic sequence (generalises `seqRef`); `resolvePending(turnId, payload)` / `failPending(turnId, message)` with stale-drop; `clear()`.
- `<ThreadView turns renderTurn />` — renders the ordered list; `renderTurn(turn)` is a product-supplied slot.
- `<ThreadComposer onSubmit disabled submitLabel placeholder />` — textarea + submit + Cmd/Ctrl+Enter.

### F.2 What the shared layer MUST NOT own

legal / domain conclusions · applicability semantics · authority policy · assessment decisions · CRC `UserGoal` semantics · HRR research-intent semantics · governed claim selection · Bounded Interpretation · product-specific audit meaning · persistence.

### F.3 Naming

Per the file-naming convention (`_ARCHITECTURE.md` = how a subsystem processes state given a frozen PRD), the shared code is a **UI primitive set**, not a subsystem — `components/conversation/` is the honest home. "GRI" stays a *conceptual* label (the pattern *structured-or-NL intent → governed retrieval → applicability → BI → consultative composition → provenance*), formalised in §T, not a shared module.

---

## G. HRR visible-thread contract (V1)

| # | Question | Answer |
|---|---|---|
| 1 | **What is a turn?** | A `user` turn (a reviewer action) or an `assistant` turn (one `HrrResearchAnswer` rendered by `HrrResearchAnswerView`, or an error). Append-only. |
| 2 | **Does a topic shortcut create a visible reviewer turn?** | **Yes.** |
| 3 | **What does that turn say?** | A fixed label: **`Research: <reviewerTopicLabel(topic)>`** (e.g. "Research: Copyright ownership"). It is **not** rendered as if the reviewer typed a sentence. `entry_mode: 'topic'`; the assistant turn keeps `question_text: null` / `intent_origin: 'topic_selection'`. |
| 4 | **How is an Ask HRR question represented?** | A `user` turn showing the **verbatim** question; `entry_mode: 'free_form'`. |
| 5 | **How is an HRR answer represented?** | An `assistant` turn = one `<HrrResearchAnswerView answer={…} />` (unchanged renderer). |
| 6 | **How are authority-only responses represented?** | Same `assistant` turn: `HrrResearchAnswerView` already renders `assessment_authority_note` + `offered_research_paths` for `authority_note === 'assessment_judgment_redirected'`. Not a system error. |
| 7 | **How are errors represented?** | An `assistant` turn in an error state (fixed copy per status: 400 validation / 503 audit / 503 classifier-ctor / network). The thread is preserved; the reviewer can ask again. |
| 8 | **How does Clear behave?** | **`Clear conversation`** — resets the whole thread to empty (`turns = []`, `priorContext = null`, `seq++`). One control. |
| 9 | **Do we need Clear-answer / Start-new-research / Clear-conversation?** | **Just one: `Clear conversation`.** No per-turn delete (append-only). "Start new research" is redundant — the reviewer just asks the next question. |
| 10 | **Switch to Linked CRC Context and back?** | Thread is **preserved** — the inspector tab slots are hidden, not unmounted (as today). No network call, no audit event on switch. |
| 11 | **Reviewer Resources closed / reopened?** | Thread is **preserved** — the shell aside is hidden, not unmounted (as today). |
| 12 | **Page refresh?** | Thread is **cleared** (client React memory only — §H). This is the honest representation of "not a persisted conversation". |

---

## H. Persistence decision

**V1 = Option A: client React memory only.** Recorded in `ADR-003`.

| Option | Verdict | Why |
|---|---|---|
| **A. client React memory** | **CHOSEN** | The thread already survives tab-switch + inspector close (hidden-not-unmounted). It lives inside an already-persistent workbook session. Zero privacy / retention / governance / schema / migration cost. No raw-question retention surface beyond the one classify call that already exists. No risk of a persisted old answer being mistaken for authority. Refresh-clears matches the frozen "not stateful, no conversation history" product stance (§N). |
| B. `sessionStorage` (per-submission key) | defer | Adds a **raw-question retention surface in the browser** for a marginal "survives refresh" nicety. Not worth it for V1. |
| C. server / DB HRR conversation | **reject** | Needs a schema + migration (**forbidden**). Creates a raw-question / answer-prose retention surface the frozen audit contract deliberately avoids. Risks "old answer prose = governed record" confusion. Entangles HRR with a persistence layer it does not need. |
| D. reuse CRC persistence (`supabase-session-store`) | **reject** | `CRCSessionState` / `crc_sessions` is Interview-Engine-shaped and CRC-specific. Bending it to HRR couples two products and drags in gate/phase/boundary machinery HRR has no use for. CRC persists because it needs cross-refresh resumability for a **gated deliverable**; HRR is a lookup tool. |

CRC ≠ precedent for persistence here: different product shape, different need. "Not stateful" is a design choice HRR keeps.

---

## I. Follow-up / referent resolution — how each question is resolved safely

Context needed, minimally, per question type (referent = the **most recent** research turn's resolved topic(s)):

| Reviewer utterance | Type | Minimal context | Resolution |
|---|---|---|---|
| "What about **copyrightability**?" | explicit new topic | none required (the noun *is* the topic); prior topic helps only for an elliptical scope | classifier resolves `copyrightability`; **fresh** full pipeline. |
| "Why does **that** matter?" | inherited referent | `prior_resolved_topics` | classifier maps to the prior topic(s) at `informational` scope; **fresh** research re-run; `orientation` + `boundary_note` + `unresolved_inputs` (all fixed templates / grounded) carry "why it matters". No new prose. |
| "What evidence would establish **that**?" | inherited referent + unresolved-input query | `prior_resolved_topics` | fresh re-run; `HrrUnresolvedInput.note` (fixed template: what the input is + whose job) already answers this deterministically. |
| "What about **New York**?" | inherited referent + jurisdiction qualifier | `prior_resolved_topics` | **V1:** fresh re-run of the prior topic against **current authoritative submission facts**; the jurisdiction qualifier is **not** applied as an applicability input (§M). The answer's `unresolved_inputs` / `boundary_note` already state that jurisdiction is an input the assessment controls, plus a fixed line: *"To change how governed guidance applies, update the assessment's own field; HRR does not modify assessment facts."* Hypothetical evaluation = §N, deferred. |
| "How is **that** different from **commercial use**?" | inherited + explicit, comparative | `prior_resolved_topics` | classifier resolves both topics (≤ `HRR_MAX_RESOLVED_TOPICS`); both researched fresh; **both governed readings presented** — **no synthesised comparison prose** (no second LLM call). |
| "Does **that** mean I should approve this?" | authority | `prior_resolved_topics` (to resolve "that") | classifier: `assessment_decision_requested: true`; gate → `assessment_judgment_redirected`; `assessment_authority_note` (fixed template, **"never references the research findings"**). The bounded context carries **no conclusion**, so none can be inherited. |
| "What about **that**?" (2+ prior topics, no disambiguator) | ambiguous referent | `prior_resolved_topics` | classifier cannot resolve → `no_governed_topic_matched` / offered paths; assistant turn asks the reviewer to name the topic. **Never auto-pick.** |

**Chosen approach: D — bounded conversation state containing permitted semantic referents.** Rejected: A (fully stateless — breaks "why does that matter?"), B/C alone (too weak for authority + comparative), E (full transcript — unbounded, injection surface, cost, privacy; and **CRC proves it is avoidable**), F (CRC's `structured_understanding` accumulator — overkill; HRR has no multi-fact understanding to accumulate, only a referent).

---

## J. Structured conversational context — proposed contract

```
HrrThreadContext {                         // client-held; sent as `prior_context` on
                                           // free-form follow-ups only (never the first turn,
                                           // never a topic shortcut)
  prior_turn_id: string                    // provenance — which turn a referent points at
  prior_entry_mode: 'topic' | 'free_form'
  prior_resolved_topics: Array<{
    topic:  ReviewerResearchTopic           // enum only
    scope:  'informational' | 'determination_request'
    bi_status: InterpretationStatus         // enum only — directly_relevant | relevant_applicability_unresolved
                                            //   | outside_current_coverage | determination_declined
  }>
}
```

**Every field challenged:**

| Candidate field | V1? | Reason |
|---|---|---|
| `prior_turn_id` | **yes** | provenance / traceability of an inherited referent. |
| `prior_entry_mode` | **yes** | lets the classifier weight an elliptical follow-up after a topic click. |
| `prior_resolved_topics: [{topic, scope, bi_status}]` | **yes** | the safe referent — enum-only, no prose. |
| `explicit_reviewer_question?` (prior raw text) | **no** | carrying prior raw prose into the next classify call adds injection surface for zero benefit; the resolved topic is the safe referent. |
| `authority_scope[]` | **no** | `bi_status === 'determination_declined'` already encodes it. |
| `referenced_claim_ids[]` | **no** | a follow-up re-runs retrieval fresh; pinning claim ids risks staleness (§V) and adds nothing. |
| `unresolved_requirement_keys[]` | **no** | re-derived fresh from current applicability every turn. |
| `project_fact_keys_used[]` | **no** | project facts come from the submission, fresh, every turn — never from conversation. |

**Provenance rules the contract enforces:**

| What | Where it lives | Rule |
|---|---|---|
| what the reviewer explicitly asked | this turn's `question_text` (verbatim, display only) | never a grounding source (unchanged) |
| what the classifier inferred | `intent_origin: 'interpreted_question'`, `interpreted: true` | — |
| an inherited referent | traceable to `prior_turn_id`; topic still traces to an **explicit reviewer utterance** (this turn's or a prior turn's) — **never to an HRR answer's mention of a topic** | Track-C parallel (§K) |
| what retrieval selected | `supporting_claim_ids` (fresh, this turn) | — |
| what BI permitted | `bi_status` (fresh, this turn) | the semantic ceiling — unchanged |
| what HRR displayed | the assistant turn's `HrrResearchAnswer` | a **record**, never re-fed as context |

---

## K. Explicit vs inherited intent — relationship to Track C

"What about copyrightability?" — the noun **is** explicit; this is an explicit reviewer utterance. "What about that?" — "that" is **inherited**, resolving to the **prior turn's explicitly-raised topic**. Either way the topic traces to an explicit reviewer utterance.

This mirrors **Track C**: CRC's discovered-topic retrieval preserves *which explicit `UserGoal` authorized it*; HRR's inherited referent preserves *which explicit prior reviewer turn raised it*. The prohibition is identical: **never fabricate a research topic because a previous *answer* mentioned it.** If the `copyright_ownership` answer's `boundary_note` says "copyrightability is a separate question" and the reviewer says "tell me about that" — "that" resolves to the reviewer's own prior *question's* topic, not the answer's mention. If genuinely ambiguous → ask / offer paths; never auto-expand.

Explicit intent (this turn's typed topic) always wins provenance over an inherited referent for the same topic — exactly Track C's "explicit goal wins over a discovered occurrence".

---

## L. Correction semantics

CRC = append-only supersession. HRR V1 mirrors the *principle*, not the mechanism (HRR has no `StructuredUnderstanding` to supersede):

| Reviewer correction | HRR V1 behaviour |
|---|---|
| "No, I meant copyright ownership." | **New turn.** Prior assistant turn stays visible (a record of what HRR returned). New turn researches `copyright_ownership`. `HrrThreadContext` advances — the correction turn becomes the referent source for the *next* turn. |
| "I wasn't asking whether it applies; I just want the general rule." | New turn; classifier maps scope → `informational`; gate carries scope verbatim. The prior determination-scoped turn stays visible. |
| "I meant New York, not globally." | New turn on the same topic against **current authoritative facts**; the jurisdiction qualifier is **not** applied (§M); shown as an unresolved-input note. |
| "Ignore that last question." | New turn; prior turns stay visible (append-only, **no deletion**); `HrrThreadContext` advances so the ignored turn is no longer the referent. |

- Corrections **create new turns**; they never mutate a prior turn.
- The structured conversational context is **superseded by advancing** (newest research turn = referent); old context is not erased, just no longer the referent.
- Prior displayed answers **remain visible**, never silently rewritten.
- Corrected context influences **future** referents only (never retroactively a displayed answer).

---

## M. Project-fact firewall — CRITICAL

**Default and V1 rule: NO.** HRR must never use reviewer conversational text to establish project facts, applicability inputs, or assessment state.

- The **only** applicability inputs are the submission's authoritative fields (jurisdiction, tools, providers, human-contribution), read **fresh** from `getSubmissionFactsForReviewerLk` → `buildReviewerLkContext` **every turn**. This is already true today; the classifier never sees facts.
- A reviewer saying "this ran in New York" inside HRR:
  - does **not** mutate `submission.jurisdiction` or any assessment field;
  - is **not** entered into `HrrThreadContext` (which is enum-only `{topic, scope, bi_status}` — structurally incapable of carrying an asserted fact);
  - V1 response: research proceeds on current authoritative facts; a fixed template line directs the reviewer to update the assessment's own field to change applicability.
- The classifier system prompt **already** enforces this for a single turn ("A reviewer premise stated as fact … is the reviewer's assertion, not something you know or repeat … it never becomes an output fact"). CAH-4G.9 extends the same rule across turns by keeping asserted facts out of the thread context entirely.
- Protects evidence-only stock governance: research conversation is **not** assessment evidence entry — same principle.

---

## N. Hypothetical research

**V1: NOT SUPPORTED.** ("What if this were running in New York?" / "Assume the creator only wrote prompts." / "If there were substantial human editing, what would change?")

- The deterministic applicability engine evaluates against **authoritative** project facts. A hypothetical fact would require a parallel "hypothetical applicability" path — **new applicability semantics** (forbidden: "do not weaken deterministic applicability").
- Risk: a hypothetical answer read as a real determination, or persisting as an established fact.
- **V1 safe behaviour:** the classifier resolves the topic; research runs on real facts; the hypothetical qualifier is acknowledged by a fixed template (*"You asked about a hypothetical [New York] scenario. HRR researches governed knowledge against this submission's recorded facts only; it does not model hypothetical project states."*) and `unresolved_inputs` already show which inputs would matter.
- **Future (documented, not V1, PM + applicability-architecture review required):** a turn-scoped `research_qualifiers` field feeding a clearly-labelled hypothetical BI pass — never persisted, never assessment evidence, output always identifies the assumption. Flagged in §AA as a PM decision, not a blocker.

---

## O. Authority firewall in a conversation

- "Does that mean I should approve it?" after research → classifier gets `prior_resolved_topics` so it *understands* "that"; still emits `assessment_decision_requested: true` (the system prompt covers "say whether the reviewer 'should' reach a conclusion"). Gate → `assessment_judgment_redirected`.
- `HrrResearchAnswer.assessment_authority_note` is a fixed template that **never references the research findings** (already contractual).
- "Is that enough evidence?" / "Does that satisfy the control?" / "So we're clear?" → all `assessment_decision_requested: true` (evidence sufficiency / control satisfaction / commercial clearance are all in the system prompt's list) → all `assessment_judgment_redirected`.
- **Structural invariant:** `HrrThreadContext` carries only `{topic, scope, bi_status}` — it *cannot* carry "the research concluded X", so an authority turn cannot inherit a conclusion. The referent lets the model resolve "that" without letting it borrow authority.

---

## P. Model-call budget

| Path | Anthropic calls | vs today |
|---|---|---|
| topic shortcut (any turn) | **0** | unchanged — `topicSelectionGateResult` is deterministic |
| self-contained free-form (first turn / no referent) | **≤1** classify-only (≤2 HTTP if the one recovery retry fires) | unchanged |
| contextual follow-up (free-form with `prior_context`) | **≤1** classify-only — the **same call**, with a slightly longer user message (question + a fixed-template `[Context:]` line built from enum values) | +0 calls |
| retrieval / applicability / BI / composition (every turn) | **0** | unchanged |

**Feasible: YES.** No second conversational or composition LLM call is introduced. The follow-up reuses `createAnthropicResearchIntentInterpreter` verbatim; only `buildFollowupClassifierInput(question, prior_context)` (a tiny pure function, exactly CRC's `buildUserMessageContent` shape) and a short system-prompt paragraph on elliptical follow-ups are added.

---

## Q. CRC reuse — SHARE NOW / SHARE LATER / DO NOT SHARE

| Item | Current module | CRC responsibility | Proposed generic responsibility | HRR use | Migration risk | Verdict |
|---|---|---|---|---|---|---|
| Visible thread shell | `app/crc/page.tsx` (inline) | scrollback `messages`, optimistic, retry | NEW `components/conversation/` — turn list, `useConversationThread`, `<ThreadView>`, `<ThreadComposer>` | HRR adopts in Slice A; CRC adopts opportunistically **later / never** | **LOW** — new code; CRC untouched | **SHARE NOW** (as new code) |
| Structured-output reliability | `lib/interview-engine/anthropic-structured-output-retry.ts` | recovery retry for `messages.parse` | — | **already imported** by `interpret-research-intent.anthropic.ts` | none | already shared — no action |
| Bounded `[Context:]` pattern | `buildUserMessageContent` (Interview Engine) | prior-state hints for extraction | a convention, not code | HRR gets its own tiny `buildFollowupClassifierInput` | none | **SHARE LATER** (extract a helper only if a 3rd consumer appears) |
| `BiIntent` / BI input | `lib/bounded-interpretation/` | via `userGoalsToBiIntents` | the minimal BI input | via `researchIntentToBiIntent` | none | **already shared** (CAH-4G.1) |
| Composition primitives | `consultative-answer-plan.ts` / `consultative-realization.ts` | CRC answer plan + realization | a shared `ConsultativeAnswerPlan` *shape* only | `projectHrrResearchAnswer` + `HRR_ANSWER_TEMPLATES` | medium (both are real, live) | **SHARE LATER** (§R-2; not this milestone) |
| Transcript persistence | `supabase-session-store.ts` + `transcript` column | cross-refresh resume for a gated deliverable | — | none | high | **DO NOT SHARE** |
| `run-turn.ts` orchestration | `lib/crc-engine/run-turn.ts` (≈1180 lines) | gates / phases / boundary / completion | — | none | very high | **DO NOT SHARE** |
| `CRCSessionState` / session store | `lib/crc-engine/session-store.ts`, `types.ts` | Interview-Engine-shaped durable state | — | none | high | **DO NOT SHARE** |
| `run-crc-conversation.ts` glue | retrieval → BI → projection | CRC pipeline | — | HRR has `runHrrResearch` + `runAuditedHrrResearch` | high | **DO NOT SHARE** |
| Authority gate / research-intent classifier | `lib/reviewer-lk/hrr-authority-gate.ts`, `interpret-research-intent.*` | n/a (CRC has no analog) | — | HRR-only | n/a | **DO NOT SHARE** |
| `lk_research` audit | `lib/reviewer-lk/repository.ts`, `lib/hrr/project-hrr-audit-record.ts` | n/a | — | HRR/reviewer-only | n/a | **DO NOT SHARE** |
| Retrieval selectors | `retrieve()` vs `selectReviewerClaims` | CRC vs reviewer channel | a shared *selector interface* (§R-3) | — | medium | **SHARE LATER**, evidence-driven, post-HRR |

**Smallest correct architecture: shared client thread primitives + fully separate orchestration.** No CRC refactor.

---

## R. Composition-consultation implications

CRC (`buildConsultativeAnswerPlan` + realization) and HRR (`projectHrrResearchAnswer` + `HRR_ANSWER_TEMPLATES`) both express: orientation · resolved / unresolved · boundary · provenance · next useful direction.

- **Do NOT build a universal composer.** The two answers differ in audience (customer vs Human Reviewer), authority stance, grounding sources (CRC: `UserGoal`s + workflow evidence; HRR: governed claims + BI), and templates.
- Duplication is prevented by keeping composition **deterministic + template-driven in both**, each product owning its template constant. A future refactor (§R-2) would share the *plan shape* (`{ orientation, resolved_points, unresolved_points, boundary, provenance, next_directions }`), **not** the realization.
- **CAH-4G.9 touches neither composer.** The conversational layer wraps existing `projectHrrResearchAnswer` output as a thread turn — composition is unchanged.

---

## S. Topic-shortcut + thread integration

- Clicking "Copyright ownership" → a `user` turn rendered **`Research: Copyright ownership`** (chip/label treatment). `entry_mode: 'topic'`. The assistant turn keeps `question_text: null` / `intent_origin: 'topic_selection'` / `attributed_question: null` — provenance unchanged, **no fabricated reviewer sentence**.
- The assistant turn is the same `<HrrResearchAnswerView>`.
- A subsequent free-form "why does that matter?" → `HrrThreadContext = { prior_entry_mode: 'topic', prior_resolved_topics: [{topic: 'copyright_ownership', scope: 'informational', bi_status}] }`. Still **0 model calls for the topic turn, ≤1 for the follow-up.**

---

## T. Audit semantics

**NO audit schema change.** The thread is a UI construct.

- Each research **action** (topic click or Ask, including a follow-up that performs governed research) → exactly one `lk_research` row via the unchanged `runAuditedHrrResearch` → `recordReviewerLkAccess`. Append-only, same contract as "three lookups → three rows".
- An authority-only follow-turn → **zero** rows (unchanged — `hrrGovernedResearchOccurred` false).
- Turn ids → client-only, **not** in audit. Conversation ids → not needed (no server conversation), **not** in audit. Raw questions → **not** in audit (unchanged). Answer prose → **not** in audit (unchanged).
- Research-access audit stays **separate** from any conversation persistence. If conversation persistence is ever proposed, it must be a distinct store, distinctly reviewed — **never** bolted onto `crc_context_access_events`.

---

## U. Privacy / retention

| Question | Answer | Evidence |
|---|---|---|
| Do raw HRR questions exist only client-side? | **Yes**, except the one classify call. | `ReviewerLkLookup` state; route logs only `err.name`. |
| Do they reach Anthropic? | Yes — the one classify call's user message (question + a fixed-template `[Context:]` line built from enum values in Slice B). No transcript. | `interpret-research-intent.anthropic.ts` `messages: [{role:'user', content: reviewerQuestion}]`. |
| Can server logs contain them? | The route's `console.error` calls log fixed strings / `err.name` only — **no** question or answer. | route.ts. |
| Are they persisted? | **No.** Nothing new. Client React memory only; lost on refresh (§H). | §H decision. |
| Retention implications | None new. | — |
| Are generated answers persisted? | **No.** Client state only. | — |
| **Unknown / flagged** | Whether the Anthropic SDK / platform infra logs request bodies, and the provider's data-retention terms, are **not verifiable from this repo**. This is the *same* pre-existing unknown that already applies to the current HRR classify call and to CRC. CAH-4G.9 does not change it (no new call, no transcript). | no repo/config evidence either way |

---

## V. Freshness / failure semantics

**Every new turn ALWAYS:** (1) reads current authoritative submission facts; (2) runs current `selectReviewerClaims` over current `TOPIC_CLAIMS_FIXTURE`; (3) runs current deterministic applicability; (4) runs current BI; (5) uses **only** the bounded referential context `{prior_turn_id, prior_resolved_topics:[{topic,scope,bi_status}], prior_entry_mode}` from prior turns — never their facts, claims, or prose. **Strong preference: YES — and the current architecture already supports it** (`runHrrResearch` is pure, rebuilt per call).

| Failure mode | Behaviour |
|---|---|
| classifier failure on a follow-up | fail closed → `unsupportedResearchIntent()` (unchanged); assistant turn: "couldn't resolve — try one of these topics" + offered paths; thread preserved. |
| ambiguous referent ("what about that?" with 2 prior topics) | classifier can't resolve → offered paths; assistant turn asks the reviewer to name the topic. **Never auto-pick.** |
| referent to an old / superseded turn | `HrrThreadContext` only ever points at the **most recent** research turn; older turns are display records, not referents. |
| project facts changed after an earlier answer | each new turn reads facts fresh → reflects current state. Old turns stay as displayed (timestamped record of "what HRR returned then"), **not** re-fed. |
| Living Knowledge superseded after an earlier answer | same — new turn retrieves current governed claims; old turn unchanged as a record. |
| conversation open across a deployment | client state is ephemeral; a deploy affects only *new* turns; on refresh the thread is gone anyway; **no server state to migrate.** |
| audit failure on a follow-up | 503; that turn shows the fixed "access could not be recorded" error, **zero governed content** (unchanged `HrrAuditNotRecordedError` path); thread preserved; retry allowed. |
| network race / duplicate submission | one-in-flight guard + monotonic seq (generalised from `seqRef`); stale response dropped, not appended. |
| user corrects themselves while a request is in flight | the in-flight result is dropped (stale seq); the correction becomes the new in-flight request; no partial turn shown. |

**Fail closed. Old conversational state never overrides current governed state** — structurally guaranteed: the context carries no facts / claims / applicability, and every turn re-runs the full fresh pipeline.

---

## W. Recommended V1 architecture

```
Reviewer action  (topic click | Ask submit | follow-up submit)
      │
      ├─ append a `user` turn to the client thread   (entry_mode: 'topic' | 'free_form')
      │     useConversationThread: one-in-flight guard + monotonic seq (generic)
      │
      ▼
POST /api/admin/submissions/[id]/reviewer-lk/research        ← route + pipeline UNCHANGED
   body:  { mode:'topic_pick', topic }
        | { mode:'question', question }
        | { mode:'question', question,
            prior_context: {                                   ← NEW optional, enum-only
              prior_turn_id, prior_entry_mode,
              prior_resolved_topics: [{topic, scope, bi_status}] } }
      │
      ├─ 1. checkReviewerContextAccess()                        (unchanged)
      ├─ 2. parseBody() — extended: accept optional `prior_context`;
      │        REJECT if it carries prose / claim ids / facts / applicability / raw question
      ├─ 3. resolve intent:
      │        topic_pick → topicSelectionGateResult(topic)             [0 model calls]
      │        question   → createAnthropicResearchIntentInterpreter()(
      │                       buildFollowupClassifierInput(question, prior_context) )   [≤1 classify call]
      │                   → hrrAuthorityGate(...)
      ├─ 4. getSubmissionFactsForReviewerLk(id) → buildReviewerLkContext   ← FRESH every turn
      └─ 5. runAuditedHrrResearch(...)  → lk_research audit → HrrResearchAnswer   [0 model calls]
      │
      ▼
   response: HrrResearchAnswer
      │   (client derives the next `prior_context` from `answer.topics[].{topic, bi_status}`
      │    + the resolved scope — no new response field strictly required)
      ▼
   client: resolve the pending `assistant` turn → <HrrResearchAnswerView answer={…} />
           advance thread.priorContext
      │
      ▼
   <ThreadView turns renderTurn> :  reviewer turns  +  assistant turns (one HrrResearchAnswerView each)
```

**Component responsibilities:**

1. **Shared generic (`components/conversation/`, NEW, client-only):** `ConversationTurn` type; `useConversationThread()` (append-only turns, one-in-flight, stale-drop, `clear()`); `<ThreadView>` (opaque per-turn slots); `<ThreadComposer>`.
2. **HRR orchestration:** `ReviewerLkLookup` rewritten onto the thread hook; `buildFollowupClassifierInput(question, prior_context)` (tiny, pure, HRR-only); a short system-prompt paragraph on elliptical follow-ups; route `parseBody` extension (optional `prior_context`, enum-only, validated).
3. **CRC orchestration:** UNCHANGED.
4. **Visible-thread state:** client React memory (the hook's `turns[]` + `priorContext`).
5. **Persistence:** none.
6. **Structured conversational context:** `HrrThreadContext` (§J) — client-held, sent as `prior_context` on free-form follow-ups only.
7. **Follow-up classification:** the existing one classify call, richer user message.
8. **Current-state retrieval / applicability / BI:** unchanged, fresh every turn.
9. **Composition:** `projectHrrResearchAnswer`, unchanged.
10. **Audit:** unchanged — one `lk_research` per governed-research action.
11. **Rendering:** `<ThreadView>` of `<HrrResearchAnswerView>` turns.

---

## X. Implementation slices (do NOT implement in CAH-4G.9)

Each slice is independently testable and reversible. No big-bang CRC refactor.

### Slice A — generic conversation primitives + HRR visible thread; ZERO reasoning-context change
- Add `components/conversation/` (type + `useConversationThread` + `<ThreadView>` + `<ThreadComposer>`).
- Rewrite `ReviewerLkLookup` to render an append-only thread instead of one-slot-replace. Each action still sends `{mode, topic|question}` with **no** `prior_context`; every classify call is **byte-identical to today**.
- `Clear` → `Clear conversation` (resets the thread). Nothing else added.
- **Acceptance:** topic→answer→free-form→answer render as stacked turns; a new question no longer erases the prior answer; tab-switch / inspector-close preserve the thread; refresh clears it; `lk_research` rows unchanged (one per action); `tsc` clean; full suite green (baseline failing set byte-identical); `hrr-research-route.test.ts` + `authority-firewall.test.ts` + CRC `subsystem-boundaries.test.ts` unchanged; CRC untouched.

### Slice B — bounded structured follow-up context
- `buildFollowupClassifierInput(question, prior_context)` + system-prompt paragraph on elliptical follow-ups.
- Route `parseBody` accepts + validates optional `prior_context` (enum-only; reject prose / ids / facts / applicability / raw question).
- Client derives `prior_context` from the previous answer's `topics[]` and sends it on free-form turns after the first.
- **Acceptance:** "why does that matter?" / "what evidence would establish that?" resolve to the prior topic; "what about copyrightability?" resolves the new explicit topic; "does that mean I should approve this?" → `assessment_judgment_redirected` (prior research **not** inherited as authority); ambiguous "what about that?" (2 prior topics) → offered paths, no auto-pick; classify-call count still ≤1 per free-form turn, 0 per topic; grounding tests (`hrr-projection.test.ts`) extended for the referent path; `prior_context` firewall test (route rejects a `prior_context` carrying prose / claim ids / facts).

### Slice C — correction + freshness hardening (only if UAT proves a gap)
- "No, I meant X" / "ignore that" → new turn, prior turns preserved, referent advances.
- Explicit staleness affordance on older turns (timestamp / "returned earlier").
- **Acceptance:** changed submission fact between turns → new turn reflects it, old turn unchanged; superseded LK → same; current retrieval always wins.

### Slice D — hypothetical / jurisdiction-qualifier research
**Design placeholder only. NOT V1.** Requires PM + applicability-architecture review (§N).

---

## Y. Migration / production safety

- The current `POST .../reviewer-lk/research` route + pipeline is **preserved**. `prior_context` (Slice B) is an **optional additive** field — the first turn, topic shortcuts, and any old client omit it; behaviour is then byte-identical.
- **No DB migration. No audit schema change. No CRC change** in any slice. Slice A is pure client + a new component; Slice B touches only the HRR route + classifier input.
- Production HRR is upgraded incrementally: Slice A is a client-only swap of the render model; the route is untouched until Slice B's additive optional field.
- Firewall / boundary tests gate every slice (`hrr-research-route.test.ts`, `authority-firewall.test.ts`, `reviewer-context/authority-firewall.test.ts`, `hrr-classifier-firewall.test.ts`, CRC `subsystem-boundaries.test.ts`, `crc-assurance-handoff/boundaries.test.ts`).

---

## Z. Test plan

**VISIBLE THREAD:** topic→answer→free-form→answer; multiple free-form turns stack; authority response renders in-thread (not an error); `Clear conversation` empties the thread; inspector tab-switch + close/reopen preserve it; refresh clears it (per §H).

**CONTEXT:** "What about copyrightability?" (explicit new topic); "Why does that matter?" (inherited referent → prior topic, informational); "What about New York?" (qualifier not applied as fact; unresolved-input note); "Does that mean I should approve this?" (`assessment_judgment_redirected`, no inherited conclusion); ambiguous "what about that?" with 2 prior topics (offered paths, no auto-pick); correction ("No, I meant X") → new turn, referent advances.

**PROVENANCE:** topic entry rendered as `Research: <label>`, `question_text: null` (not fabricated reviewer text); explicit follow-up stays `intent_origin: 'interpreted_question'`; inherited referent traceable to `prior_turn_id`; a previous *answer's* topic mention never becomes a research topic; `prior_context` firewall — route rejects prose / claim ids / facts.

**FRESHNESS:** changed submission fact between turns → new turn reflects it, old turn unchanged; superseded Living Knowledge → new turn retrieves current; current retrieval always wins.

**AUTHORITY:** approval; evidence sufficiency; control satisfaction; commercial clearance — all bounded, `assessment_authority_note` never references findings.

**PRIVACY:** raw questions never added to audit; `lk_research` payload still `{actor, submission, access_kind, created_at}`; no new persistence beyond §H.

**MODEL-CALL BUDGET:** topic = 0; self-contained free-form = ≤1; contextual follow-up = ≤1 (assert the classifier mock is invoked exactly once and `buildFollowupClassifierInput` output contains no prose beyond the fixed template + question).

**CRC REGRESSION:** zero behaviour change — `subsystem-boundaries.test.ts`, `crc-assurance-handoff/boundaries.test.ts`, full CRC suite failing set byte-identical to baseline.

---

## AA. GRI / CRC / HRR — formalised architectural relationship

Derived from the repository (not assumed):

- **GRI (Governed Research Interface)** is a **pattern**, not a shared module: *structured-or-NL intent → governed retrieval → deterministic applicability → Bounded Interpretation → deterministic consultative composition → provenance*, with no downstream layer expressing a conclusion stronger than BI permits.
- **CRC (Commercial Readiness Check)** and **HRR (Human Reviewer Research)** are two **independent orchestrations** that both instantiate the GRI pattern for different audiences and authority stances:
  - CRC — customer profile; conversational acquisition + education; `StructuredUnderstanding` accumulator; `crc_sessions` persistence; no assessment-authority concept.
  - HRR — Human Reviewer profile; governed research inside the Commercial Assurance workspace; stateless pipeline + (V1) client-only visible thread; `hrrAuthorityGate` declines assessment decisions.
- **What is genuinely shared today:** `BiIntent` (the minimal BI input, CAH-4G.1) and the structured-output reliability helper. **What CAH-4G.9 adds to the shared surface:** a generic *visible-conversation client shell* (`components/conversation/`) — UX only, no reasoning.
- **What must never be shared:** persistence, `run-turn.ts` orchestration, `CRCSessionState`, `UserGoal` / research-intent semantics, retrieval selectors, authority policy, audit meaning, composition realization.
- **The contract each keeps:** CRC — Track A/B/C provenance, explicit-vs-discovered distinction, no fabricated `UserGoal`, correction supersession, bounded questioning. HRR — reviewer text is intent entry only (`ADR-002`), BI is the semantic ceiling, deterministic applicability, audit-before-content, `lk_research` bounded, **reviewer conversation is not a project fact and not evidence** (§M), one-model-call ceiling (§P).

**This amends `HRR_GRI_TECHNICAL_DESIGN.md` §N (OQ-6, "single-turn semantic model"):** the visible thread is still client-only and non-semantic; the **only** new reasoning context is a bounded enum-only `{topic, scope, bi_status}` referent (`HrrThreadContext`) — never prior answers, never prose, never facts. `ExplicitResearchIntent` and `HrrResearchAnswer` remain self-contained; the thread wrapper does not change them.

---

## BB. Slice A as-built (CAH-4G.10, 2026-09-11)

**Implemented:** the VISIBLE conversational thread. **Not implemented:** any reasoning context (Slice B).

### Abstraction decision — LOCAL HRR MECHANICS, not a generic framework

CAH-4G.9 §F/§Q floated a generic `components/conversation/` primitive set. Applying the PM's Phase-4 test (product-agnostic? needed now? simplifies rather than enlarges? avoids HRR semantics? CRC-adoptable later without CRC change today?): a `components/conversation/` package would be 3–4 new files of framework for **one** consumer, which *enlarges* rather than simplifies. Chosen instead: **one small local module `app/admin/submissions/[id]/review/hrr-thread.ts`** (~110 lines) — a pure append-only reducer + two turn-builders, imports only types (`@/types/interview-engine`, `@/lib/hrr/types`), no React. It is unit-tested directly (`__tests__/reviewer-lk/hrr-thread.test.ts`, 30 cases) since the repo has no React render harness. **CRC runtime was not touched.** If Slice B or a real second consumer proves the need, extract to a shared primitive then.

### Files

| File | Change |
|---|---|
| `app/admin/submissions/[id]/review/hrr-thread.ts` | **NEW** — `HrrThreadTurn` / `HrrThreadState` / `EMPTY_HRR_THREAD` / `hrrThreadReducer` (`begin` / `settle` / `clear`) + `topicReviewerTurn` / `questionReviewerTurn`. Append-only; one request in flight (a hard reducer invariant); a stale `settle` (`seq !== inFlight`, or after `clear`) is inert. Presentation/session state only — no persistence, no network, no audit. |
| `app/admin/submissions/[id]/review/ReviewerLkLookup.tsx` | **REWRITTEN** — `useReducer(hrrThreadReducer, EMPTY_HRR_THREAD)` replaces the single `state` slot. `research()` dispatches `begin` (appends a truthful reviewer turn + a pending HRR turn), then `settle` on resolve/fail, guarded by the monotonic `seqRef`. `runTopic` / `submitQuestion` both gate on `thread.inFlight`. `submitQuestion` clears the composer on submit; `runTopic` never touches the composer. `clearConversation` bumps `seqRef` + dispatches `clear`. The thread renders as an `<ol>` of `<ThreadTurn>`; the answer turn is the unchanged `<HrrResearchAnswerView>`. Still exactly one `fetch`, still inside the `research` `useCallback`, still no `useEffect`. Request body byte-unchanged: `JSON.stringify(payload)` where `payload` is only `{ mode, topic }` / `{ mode, question }`. |
| `__tests__/reviewer-lk/hrr-thread.test.ts` | **NEW** — reducer logic (initial empty; append; one-in-flight; settle→answer/error; stale-drop; settle-after-clear inert; 2nd/3rd turn preserves earlier; clear→empty; topic turn carries no `question`) + `ReviewerLkLookup` source scans (no `setState({kind:'answer'})`; `useReducer`+`hrrThreadReducer`; `thread.turns.map`; one `HrrResearchAnswerView`; `Research:`/`You asked:` not a fabricated question; composer clears on submit; topic never populates composer; `thread.inFlight` gate; one `fetch`; no `useEffect`; body has no `prior_context`/transcript/messages/history/prior-answer; no storage APIs; disclaimers present; no auto-scroll). |
| `__tests__/reviewer-lk/hrr-research-route.test.ts` | **+2 tests** — an extra conversational field in the body is ignored and never reaches the classifier; three successive questions each send only their own text (no server-side accumulation). |
| `__tests__/reviewer-lk/authority-firewall.test.ts` | `hrr-thread.ts` added to `REVIEWER_LK_ALL` (firewall coverage — imports nothing from `lib/assessments` / `crc-sales` / `retrieve` / BI / composition). |

### Behaviour

- **Topic shortcut:** appends a reviewer turn rendered `Research: <reviewerTopicLabel(topic)>` — the canonical enum + label, never a synthesised sentence. **0 model calls** (unchanged). Then the HRR answer turn via `HrrResearchAnswerView`.
- **Free-form:** appends the verbatim question as a `You asked:` reviewer turn, then the answer turn. **≤1 classify-only call** per question, each classified from that question's own text alone (route tests prove the classifier receives one string and never `prior_context`).
- **Successive turns:** append-only. A new question never replaces or recomposes an earlier turn. `settle` only ever resolves the pending turn whose `seq` matches the current in-flight request.
- **Loading / error:** the pending HRR turn (`role="status"`) appears immediately below the reviewer turn; a failure resolves it to a bounded error turn (`role="alert"`) — earlier turns are untouched. Audit-before-content unchanged: a 503 from an audit failure yields zero governed content for that turn.
- **Clear conversation:** one control (replaces "Clear current response"). Empties `thread.turns`, clears the composer, invalidates any in-flight response (`seqRef` bump + reducer `clear`). No server call, no audit change, no assessment/project mutation, no effect on Linked CRC Context.
- **Lifetime:** the thread lives in `useReducer` state. It survives a Living Knowledge ↔ Linked CRC tab switch and an inspector close/reopen (both are `block`/`hidden` visibility toggles — the component stays mounted). A full page refresh clears it (React remount → `EMPTY_HRR_THREAD`). No `localStorage` / `sessionStorage` / IndexedDB / cookie / URL state.
- **Accessibility:** topic chips (radiogroup + roving tabindex + arrow keys), `<textarea id="hrr-question">` + `<label htmlFor>`, `Ask` button, Cmd/Ctrl+Enter, `Clear conversation` button, and the `<details>` provenance disclosures inside `HrrResearchAnswerView` are all unchanged and keyboard-operable. **No auto-scroll** in Slice A (no `scrollIntoView`, no scroll ref, no effect) — no disruptive focus jumps; the tab panel's own `overflow-y-auto` scrolls.

### Not solved here (recorded, deliberately out of scope)

- The known **multi-claim `bi_summary_blocks` density** in the narrow rail — unchanged; still a composition-layer backlog item.
- **Bounded conversational context / follow-up referent resolution** ("why does that matter?", "does that mean I should approve this?") — Slice B. In Slice A those either resolve as independent questions if the stateless classifier happens to, or fall through to the existing fail-closed / offered-paths behaviour. No pronoun heuristics, no topic inheritance, no domain-specific rules were added.

### Verification

`tsc --noEmit` exit 0 · `next build` "✓ Compiled successfully" exit 0 (HRR route present) · full Jest: 20 failed suites / 77 failed tests / 3697 passed — the failing-test-name set is **byte-identical** to a fresh `origin/main` (`08f20e9`) baseline (77 = 77, `comm` both directions empty); **zero new failures**; +36 passing (30 new `hrr-thread` cases + 2 route cases + firewall `test.each` expansion) · CRC `subsystem-boundaries.test.ts` / `crc-assurance-handoff/boundaries.test.ts` in the unchanged set.

---

## CC. Deployed-source reconciliation (CAH-4G.10P, 2026-09-11)

An authenticated production UAT at `app.superimmersive8.com` ran the CAH-4G.10 thread scenario and observed the **pre-Slice-A** single-turn behaviour: a second free-form question replaced the first exchange; the composer kept its submitted text; the surface showed the "GOVERNED RESEARCH RESPONSE" heading and a "Clear" action, not an append-only thread. CAH-4G.10P reconciled *local reviewed source* vs *`origin/main`* vs *production*.

### Evidence

| Check | Result |
|---|---|
| CAH-4G.10 implementation commit | **`bea6f2d`** `feat(cah-4g): add visible HRR research thread` — `ReviewerLkLookup.tsx` (rewritten), `hrr-thread.ts` (NEW), + 3 test files |
| CAH-4G.10 docs commit | **`f4d33ec`** `docs(cah-4g): record conversational thread slice` |
| `bea6f2d` / `f4d33ec` ancestor of local HEAD? | **YES** (`work/cah-4f-reviewer-resources`) |
| `bea6f2d` / `f4d33ec` ancestor of `origin/main`? | **NO** |
| `bea6f2d` / `f4d33ec` on any origin ref? | **NO** — `git branch -r --contains` empty; `git ls-remote origin \| grep` empty. Local-only. |
| `origin/main` HEAD | `f8a4a12` `fix(crc): widen commercial_use goal classification…` — `08f20e9` (CAH-4G.8 docs) + one CRC-only commit (`anthropic-extractor.ts` +1 line + a test). **Touches no HRR / reviewer-lk / review-dir file.** |
| `origin/main:ReviewerLkLookup.tsx` vs `bea6f2d^:ReviewerLkLookup.tsx` | **byte-identical** (`git diff --quiet` → identical) — `origin/main` has the pre-Slice-A component verbatim |
| `origin/main:hrr-thread.ts` | **ABSENT** (`git cat-file -e` fails) |
| Production deployment SHA | **cannot be independently proven** (no Vercel auth / `.vercel` link / token in this environment; `VERCEL_GIT_COMMIT_SHA` is server-only, never exposed publicly). **But bounded:** Vercel `si8-creator-portal` deploys `main`; every commit reachable from `main` (`f8a4a12`) predates Slice A. Deployed buildId `40sGNlM5ZqyZbvfRFy8ed` (changed since CAH-4G.8's `Ar_zjQ9CmNNqabrmSsQcW` → a real redeploy of a `main` commit happened; `main-app` client chunk hash `b768503421f535d6` unchanged, consistent with `f8a4a12`'s server-only change). |

### Runtime fingerprint

| Behaviour | pre-Slice-A / `origin/main` | Slice A (`bea6f2d`) | production observed |
|---|---|---|---|
| retained prior turns | no — one `state` slot, `setState({ kind: 'answer', answer })` replaces | yes — `useReducer` append-only `turns[]` | **no (replaced)** ✓ pre-Slice-A |
| composer clears on submit | no — `setQuestion('')` only in `Clear` | yes — `setQuestion('')` in `submitQuestion` | **no (kept text)** ✓ pre-Slice-A |
| heading | "Governed research response" | "Research conversation" | **"Governed research response"** ✓ pre-Slice-A |
| clear control | "Clear" (`setState({ kind: 'idle' })`) | "Clear conversation" (`dispatch({ type: 'clear' })`) | **"Clear"** ✓ pre-Slice-A |
| request body | `{ mode, topic }` / `{ mode, question }` | identical (byte-unchanged) | — (Slice A didn't change it) |

**All five observed characteristics match the pre-Slice-A source exactly; none match Slice A.**

### Root cause: DEPLOYMENT GAP

Slice A was implemented and reviewed **GO for integration**, then never pushed / merged / deployed (the CAH-4G.10 report's own git section said "Pushed = NO / Deployed = NO"; the commit boundary said "DO NOT push / merge / deploy"). The production UAT ran ahead of the integration step. **Not an implementation defect, not a partial integration, not an alias mismatch, not a test-coverage gap** — the reviewed code is simply not on `main`.

### Tests reconciled

The CAH-4G.10 tests (`hrr-thread.test.ts` 30 cases + 2 `hrr-research-route.test.ts` cases) **do** prove append-only retention, composer-clear, and "request 2 contains only question 2 / no `prior_context` / no transcript". They source-scan the real `ReviewerLkLookup.tsx` and unit-test the real `hrr-thread.ts` reducer. The component path is unambiguous and single: `page.tsx` → `ReviewerShell` → `ReviewerResources` → `ReviewerLkPanel` → `<ReviewerLkLookup>`. There is no alternate production component. The tests are valid; they validate the local branch, which is not deployed. **58/58 pass on HEAD.**

### Next step (do NOT execute in CAH-4G.10P)

Integrate the reviewed commits to `main` via the repo's normal method. Drift is one CRC-only commit (`f8a4a12`) with **zero file overlap** with the CAH-4G.9/.10 work, so a rebase of `work/cah-4f-reviewer-resources` (`b4ba0e0` + `bea6f2d` + `f4d33ec`) onto `f8a4a12` is clean:

```
git fetch origin --prune
git rebase f8a4a12                     # onto current origin/main (from work/cah-4f-reviewer-resources)
git range-diff f8a4a12...ORIG_HEAD f8a4a12...HEAD   # expect all '=' (patch-identical)
npx tsc --noEmit && npx next build && npx jest      # re-verify; failing set vs a fresh f8a4a12 baseline
git push origin HEAD:main              # fast-forward, no force  (PM-authorized integration milestone only)
# then Vercel auto-deploys main; re-run REVIEWER_RESOURCES_ARCHITECTURE.md §18 + thread addendum
```

This is a **CAH-4G.10I — Slice A integration + production deployment** milestone, PM-authorized, not part of this investigation.

---

## DD. Integration + production deployment record (CAH-4G.10I, 2026-09-11)

### Rebase / integration

| | |
|---|---|
| Backup branch | `cah-4g-10-pre-integration-backup` → `af42002` (the pre-integration lineage, retained) |
| Drift since CAH-4G.10P | 2 commits on `origin/main`: `f8a4a12` (`fix(crc): widen commercial_use goal classification…`) + `d06c668` (`fix(crc): discover likeness from synthetic person presence`) — both CRC-only (`lib/interview-engine/anthropic-extractor.ts`, `lib/crc-engine/discovered-relevance.ts` + tests). **Zero file overlap** with `ReviewerLkLookup.tsx` / `hrr-thread.ts` / Reviewer Resources / `lib/hrr/**` / `lib/reviewer-lk/**` / audit / CRC shell. |
| Rebase | `git rebase d06c668` — **no conflicts** |
| SHA map | `b4ba0e0→92cb06b` (CAH-4G.9 docs) · `bea6f2d→73eef5c` (CAH-4G.10 feat) · `f4d33ec→0a06809` (CAH-4G.10 docs) · `af42002→4b9ee5a` (CAH-4G.10P docs) |
| `git range-diff` | all 4 commits **`=`** (patch-identical) — Slice-A runtime semantics unchanged by the rebase |
| Pre-push re-fetch | `origin/main` re-confirmed `d06c668` (unmoved) immediately before push |
| Push | `git push origin HEAD:main` → **`d06c668..4b9ee5a HEAD -> main`** (fast-forward, no force) |
| Post-push | `origin/main` == local `HEAD` == `4b9ee5a` (`git fetch` + `git rev-parse` both sides) |

### Pre-push regression (rebased lineage vs a fresh `d06c668` baseline worktree)

| | fresh `d06c668` baseline | rebased branch |
|---|---|---|
| `tsc --noEmit` | — | exit 0 |
| `next build` | — | "✓ Compiled successfully", exit 0, HRR route present |
| failed suites / tests | 20 / 77 | 20 / 77 |
| passed | 3694 | 3730 (+36 — CAH-4G.10 additions) |
| failing-test-name diff (`comm`) | — | **EMPTY both directions — zero new failures** |

### Production deployment — evidence and its limits

- Vercel `si8-creator-portal` is configured to auto-deploy `main` (established, working mechanism across every prior CAH-4x milestone).
- `app.superimmersive8.com` served buildId `40sGNlM5ZqyZbvfRFy8ed` during CAH-4G.10P; ~3 minutes after this session's push it served **`fVUuRleeVuLDH0dcDILmD`** — a different build, stable across repeated polls over ~6 minutes with cache-busting query params.
- **This is consistent with a new deployment having completed**, but it is **not conclusive proof that the live build is `4b9ee5a` specifically** rather than the intervening `d06c668` (pushed to `main` earlier by JD directly, which Vercel may have already built before this session began) — this environment has no Vercel authentication (`vercel whoami` fails, no `.vercel` link, no token), so the deployment's source-SHA metadata cannot be read directly.
- The review page (`/admin/submissions/[id]/review`) is auth-gated (307 → login) and its client bundle is not reachable without an authenticated session, so the "Research conversation" / "Clear conversation" runtime fingerprint (§EE) **cannot be checked from this environment**. `list_connected_browsers` → `[]` — no Claude Chrome extension connection available.
- **Per this milestone's own instruction:** a minified bundle's absence of a literal source string is not evidence of deployment failure, and the authenticated UI check being unreachable from CLI is an acceptable, disclosed handoff to PM — not a gate failure.

**Conclusion:** integration to `main` is fully proven by git evidence. Deployment very likely occurred and is very likely current (auto-deploy pipeline + observed build change), but is **not independently certified to the exact SHA** from this environment. The authenticated visual UAT is the actual proof, and it is PM's to perform (§EE).

## EE. PM authenticated visual UAT script

1. Open an authenticated Commercial Assurance review.
2. Open Reviewer Resources → Living Knowledge.
3. Confirm heading reads: **Research conversation**
4. Confirm action reads: **Clear conversation**
5. Click: **Copyright ownership**
6. Confirm a truthful topic research action ("Research: Copyright ownership") + governed answer appear.
7. Ask: *"What does governed knowledge say about copyrightability here?"*
8. Confirm: composer clears after submission · the Copyright ownership exchange remains visible · the Copyrightability exchange appends below it.
9. Ask: *"What does governed knowledge say about commercial use?"*
10. Confirm: composer clears · both prior exchanges remain · the Commercial use exchange appends.
11. Switch Living Knowledge → Linked CRC Context → Living Knowledge. Confirm the thread remains.
12. Close Reviewer Resources and reopen it. Confirm the thread remains (component stays mounted).
13. Click **Clear conversation**. Confirm the visible HRR thread clears without changing any assessment state.
14. Create one new exchange.
15. Refresh the browser page. Confirm the HRR thread clears.

Also visually judge: scrolling behaviour; whether new turns are easy to find; the visual distinction between reviewer actions and HRR responses; narrow-rail readability; and whether the interface now feels like ongoing Human Reviewer Research rather than repeated lookup.

**Do not mark CAH-4G `CLOSED` / `PRODUCTION-PROVEN` until this script passes.**

---

## FF. Production UAT evidence (CAH-4G.10C, 2026-09-11)

PM performed the §EE script as an authenticated Commercial Assurance reviewer against the internal synthetic fixture **"CA-RLK-2a PROD SMOKE - internal synthetic, delete after"** / **ASSESS-007-2026-09-07** on production (app.superimmersive8.com). This is the first authenticated human visual confirmation of the deployment §DD could only infer from git evidence + a buildId change.

| # | Check | Observed | Result |
|---|---|---|---|
| 1 | Slice-A fingerprint | After refresh: heading "Research conversation", action "Clear conversation", supporting copy "Each question is researched independently." — the pre-Slice-A "Governed research response" / "Clear" surface is gone. | PASS |
| 2 | Topic shortcut | Clicked "Copyright ownership" → truthful reviewer action "Research: Copyright ownership" (no fabricated sentence) → governed HRR response followed; topic path stayed zero-model; HrrResearchAnswerView presentation intact. | PASS |
| 3 | First free-form turn appends | Asked "What does governed knowledge say about copyrightability here?" → appended as a new reviewer turn; the Copyright ownership exchange stayed visible; the Copyrightability answer appended below it; composer cleared on success. | PASS |
| 4 | Third turn appends | Asked "What does governed knowledge say about commercial use?" → composer cleared; Copyright ownership + Copyrightability both remained; Commercial use appended — all three exchanges visible in one conversation. This is the core Slice-A acceptance proof: successive research actions append rather than replace. | PASS |
| 5 | Tab-switch retention | Living Knowledge → Linked CRC Context → Living Knowledge: all three HRR exchanges remained. | PASS |
| 6 | Inspector close/reopen retention | Closed Reviewer Resources, reopened it: the HRR thread remained (confirms the intended current-page component-lifetime behaviour). | PASS |
| 7 | Workbook-navigation lifecycle | Navigated away to the parent submission page and back into the reviewer workbook: the HRR thread was gone; Living Knowledge returned to its initial state. This matches the V1 contract exactly (client React memory only; no DB, no localStorage/sessionStorage, no server-side HRR conversation persistence) — not a defect. | PASS against current contract |
| 8 | Clear conversation | Created a new Likeness exchange, then clicked "Clear conversation": the visible HRR conversation cleared; topic shortcuts and Ask HRR remained; Reviewer Resources remained available; no reported assessment/workbook state change. | PASS |
| 9 | Composer clear (cross-checked in #3/#4) | Composer cleared after every successful free-form submission. | PASS |
| 10 | Assessment state unaffected | No check in this UAT reported any change to assessment/workbook/finding/outcome/sign-off state. | PASS |

**Engineering evidence (from CAH-4G.10 / .10I, reconfirmed unchanged in §GG) vs. production UAT evidence (this section) are kept distinct:**

| | Engineering evidence | Production UAT evidence |
|---|---|---|
| append-only behaviour | `hrrThreadReducer` unit tests (begin/settle invariants) | items 3 to 4 above (real successive turns retained) |
| independent request semantics | route tests — 3 questions, 3 single-string classifier calls | item 4 (three real distinct governed answers, no cross-contamination observed) |
| no prior_context / no transcript | source scan + route test (extra field ignored) | not independently re-provable via UAT (no network inspection performed); relies on the engineering proof |
| no persistence | source scan (no storage APIs) | item 7 (workbook navigation cleared the thread, live) |
| audit unchanged | no audit file in the diff; lk_research contract tests unchanged | not re-checked in this UAT (no audit-DB access reported); relies on the engineering proof |
| tests/regression | tsc clean, next build exit 0, zero new failures vs a fresh baseline | (n/a) |
| composer clears | submitQuestion source (setQuestion) + test | items 3, 4, 9 (real composer observed clearing) |
| topic action is truthful | source (topicReviewerTurn, no question field) | item 2 ("Research: Copyright ownership", not a fabricated question) |

## GG. Post-UAT source reconciliation (CAH-4G.10C)

Re-verified directly against origin/main = `2d648d3` (unchanged since CAH-4G.10I — 0 commits of drift):

- `useReducer(hrrThreadReducer, EMPTY_HRR_THREAD)` present (ReviewerLkLookup.tsx); the begin / settle / clear cases present (hrr-thread.ts).
- `setQuestion('')` present in submitQuestion (composer clears on submit).
- topicReviewerTurn carries {topic, label}, no question field; render prefix "Research:".
- Headings: "Research conversation", "Clear conversation", "Each question is researched independently." all present verbatim.
- `<HrrResearchAnswerView>` — one render site, canonical, unforked.
- ResearchPayload = {mode:'topic_pick', topic} or {mode:'question', question} — unchanged.
- prior_context / transcript / localStorage / sessionStorage / indexedDB appear only inside comments asserting their absence — zero code usage.
- No audit file (lib/reviewer-lk/repository.ts, lib/hrr-audit, any migration) in the CAH-4G.9/.10/.10I/.10C diff.
- No lib/crc-engine / app/crc / app/api/crc file in the diff.
- tsc --noEmit exit 0.

The tested-in-production implementation is exactly the implementation currently on main. No STOP condition triggered — the source contract has not drifted since the UAT.

## HH. Non-blocking production observations (backlog evidence, not Slice-A defects)

1. Thread density / navigation. Long governed answers — especially Copyrightability — make the narrow Reviewer Resources rail vertically dense as the conversation grows; topic shortcuts and the Ask HRR composer can end up far above the current reading position. Prior turns are retained correctly — this is a readability/navigation observation, not a correctness defect. No solution is prescribed here. Candidate future solution classes (not chosen, not authorized): progressive disclosure, collapsing prior turns, compact turn summaries, improved in-thread navigation, generic consultative-composition chunking. This is the same density observation already tracked from Slice 7 (unresolved) and is not solved in this milestone.
2. Duplicate question rendering. A free-form question currently appears twice: once as the visible reviewer turn ("You asked: ...") and again inside HrrResearchAnswerView's own "You asked: ..." echo. Redundant visual weight. Recorded as non-blocking presentation/composition polish. HrrResearchAnswerView is not changed in this milestone.
3. Navigation persistence — a future product question, not a decision. Closing/reopening Reviewer Resources preserves the thread (component stays mounted); leaving the workbook and re-entering clears it (React remount). This matches the V1 client-memory architecture exactly and is not a defect. Real reviewer usage during this UAT suggests research-session continuity across ordinary workbook navigation may deserve a future product decision. Open question for a future architecture/product review: should HRR research survive navigation away from and back into the workbook? Answering yes would require a deliberate persistence/lifecycle decision (client vs. server, retention, audit implications) — not an incidental client-state change, and not authorized or scoped here.

## II. Architecture reconciliation (CAH-4G.9 principles, reconfirmed after real UAT)

- Client-memory V1 persistence decision (§H) remains valid for Slice A. Nothing in this UAT required DB/session persistence for correctness — item 7 is the V1 contract working exactly as designed, not a gap that correctness needs closed. (Observation 3 is a distinct, future product question, not a correctness requirement.)
- Bounded conversational context (Slice B) remains a distinct, not-started, not-authorized future milestone. No UAT evidence changes this.
- Full transcript must still never be sent to Anthropic. Unchanged; not touched by this UAT or this milestone.
- Project facts remain authoritative outside HRR conversation. Unchanged; item 10 (no assessment/workbook state change observed) is consistent with this.
- Audit semantics remain unchanged. No audit file touched since CAH-4G.10; UAT did not exercise or require any audit-schema change.
- Hypothetical research remains out of V1 unless separately authorized. Not touched.

No settled architecture is reopened by this closeout; the production-UAT polish observations (§HH) are recorded as backlog evidence for a future decision, not as a reason to revisit CAH-4G.9.
