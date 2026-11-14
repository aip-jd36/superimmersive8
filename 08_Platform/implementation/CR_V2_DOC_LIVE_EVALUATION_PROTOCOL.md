# Creator Record V2: First Real-Document Evaluation Protocol (CR-V2-DOC-LIVE-1B, updated in 1C-A, 1C-B1 and 1C-B2B)

**Status: PROPOSED. NOT AUTHORIZED. No real-document evaluation has been authorized, and nothing in this document has been run.**

> **Context, 2026-11-15.** This status concerns only the operator-run evaluation described here. Customer live examination of real documents is a separate path: it is enabled in Production as part of the released Creator Record v2 MVP. See `08_Platform/app/lib/creator-record/README.md` ("Current state").

It specifies a bounded first evaluation of the document examination on real documents, and lists what must be decided and built first. Approving this document does not authorize a run.

Every limit below is labelled. **Implemented** means the code does it today, behind the disabled lock. **Proposed** means it does not exist yet, or has not been approved.

This repository is public. Evaluation documents, ground truth, observations, excerpts and per-document results must never be committed.

## 0. Readiness (1C-B1)

No operational prerequisite is complete. Code alone completes none of them.

**Implemented and tested** (local code, mocks, stubbed network, disposable local PostgreSQL only):

| Safeguard | Where |
|---|---|
| Fixed-composition runner and operator CLI, locked | `lib/creator-record-flow/live-evaluation-runner.ts`, `scripts/creator-record-live-evaluation.ts` |
| Project identity from the connected Supabase URL, matched to a declared reference, Production refused | the runner |
| Verified operator token, durable authorization, current prepared version, stored document, read audit before read | 1C-A entry point and schema |
| Pre-call input bound, checked before the reservation and again on every request's content | `live-examination/controls.ts`, `real-executor.ts` |
| Durable reservation that must cover the input bound, under a lock; ledger that cannot be reset | entry point and schema |
| SDK environment hardening; PDF page-tree validation | adapter, `pdf-text-layer.ts` |
| Install guard, read-only verification and guarded rollback for the evaluation schema | `supabase/evaluation-only/`, `CR_V2_DOC_LIVE_EVALUATION_ENVIRONMENT.md` |
| Synthetic compatibility workflow (1C-B2B): the existing synthetic tool's live mode uses the live pin, the dedicated key and the live timeout, refuses unsafe SDK variables, records every provider request, stops on a model, stop-reason or authentication incompatibility, and reports each fixture's live input bound | `lib/creator-record/eval/run-receipt-eval.ts` (section 1) |

**Not yet established:**

| Prerequisite | State |
|---|---|
| Dedicated remote environment | No project exists. Procedure only (`CR_V2_DOC_LIVE_EVALUATION_ENVIRONMENT.md`) |
| Approved operator authorization | None written or approved |
| Document-owner consent | None obtained. The code checks only that a reference exists |
| Provider data terms | Not confirmed |
| Model compatibility | Not confirmed by any live call. The pinned model's earlier evaluation is not evidenced. The synthetic tool can now record the model each response names (1C-B2B), but has not been run against the provider |
| Current pricing | Not confirmed. The code uses a table cached on 2026-10-06 |
| The input-bound assumptions | Not confirmed: that a PDF page costs no more than one image at the model's limit, and the framing allowance. Needs a token count on synthetic documents. Offline (1C-B2B): all 45 committed synthetic fixtures are admitted, with bounds of 24,540 to 25,540 tokens; no provider count exists to compare them with |
| External spending cap | No workspace, key or spending limit exists |
| Retention and deletion policy | None |
| Ground-truth documents | None prepared |
| Real Supabase integration | The production ports and the runner have run only against mocks |

## 1. What is ready, and what is not

Prepared and disabled:

| Part | Where | State |
|---|---|---|
| Real executor | `lib/creator-record/live-examination/real-executor.ts` | Throws on its first line while the code lock is false. Imported only by the entry point (`evaluation.ts`), which a boundary test enforces. |
| Limits, authorization format, spend estimate | `live-examination/controls.ts` | Code lock `LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD` is false. |
| Document binding (user, prepared version, tool, bytes, stored state) | `live-examination/document-access.ts` | Used only by tests. |
| Storage and evaluation ports | `lib/creator-record-flow/live-examination-production.ts` | Loaded only by the fixed runner, after its lock and identity checks. Builds no executor. |
| **Entry point (1C-A)** | `live-examination/evaluation.ts`, `runAuthorizedEvaluation` | Refuses on its first line while the code lock is false. Imported only by the fixed runner and, for types, the ports file. |
| **Fixed runner and CLI (1C-B1)** | `lib/creator-record-flow/live-evaluation-runner.ts`, `scripts/creator-record-live-evaluation.ts` | Refuse at the lock, before reading the environment or loading any client. The CLI takes one request file and no flags. No route, page or job imports either. |
| **Durable authority, cost ledger and live result store (1C-A)** | `supabase/evaluation-only/20261109000000_creator_record_v2_live_evaluation.sql` | **Not a migration.** Applied only to disposable local test databases. |

Deliberately not built:

- **A route or job.** The only caller is the locked operator CLI. Nothing on a command line can enable a model call.
- **Live persistence anywhere real.** The deployed migration `20261108000000` still refuses to store `live_model` results. The evaluation-only schema can store them, but it exists in no deployed database, and applying it to an isolated project is a separate decision (section 7).
- **A way to load a real document.** `EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED` stays false.

### What stops a model call today

| Control | Type | What it does and does not do |
|---|---|---|
| `LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD` | Compile-time | **The principal execution barrier**, together with the absence of any runner or route |
| Operator identity (1C-A) | Runtime | `runAuthorizedEvaluation` takes a credential, never an id. The production port asks Supabase Auth whose token it is |
| Durable authorization (1C-A) | Database | One row per evaluation, which the service role can read but not write: operator, environment, expiry (7 days at most, server-timed), model, profile, attempt and spend ceilings, and each permitted document by digest with an authority reference. Revocation only narrows. The entry point reads it through the preflight and checks it again |
| Authority reference | Database, written by the operator | Required, and checked for format. **The consent it refers to is not validated by any code** |
| `CREATOR_RECORD_LIVE_EVALUATION` and the dedicated key | Runtime | Must be present and match the evaluation id |
| SDK environment (1C-A) | Runtime | The adapter fixes the endpoint, turns SDK logging off and sends no auth token. A real executor is not built at all while `ANTHROPIC_BASE_URL`, `ANTHROPIC_LOG`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_PROFILE` or `ANTHROPIC_CUSTOM_HEADERS` is set |
| Persistence preflight and durable reservation (1C-A) | Database | Checked before anything is read, and again under a lock just before the first request. A model request without an admitted reservation is refused by the executor itself |
| Fixed composition (1C-B1) | Code, test-enforced | `runFixedEvaluation` takes one request of exactly four fields and passes the production ports, the one registered profile, the fixture registry and no adapter seam. Its only seam is module replacement, used by tests |
| Pre-call input bound (1C-B1) | Code | Section 8. Bounded before the reservation, from the document, and again on each request's content; anything unbounded is refused before any request |
| Injected dependencies (1C-A-FIX) | **Trusted, not verified, below the runner** | `runAuthorizedEvaluation` still accepts every dependency from its caller; only the runner and tests call it, which a boundary test enforces: evaluation, document and prepared-version ports, profiles, fixture check, environment, clock and adapter loader. Everything in this table holds only with the reviewed production ports, the registered receipt profile and the real adapter. A caller's own evaluation port could skip the durable preflight and reservation and still reach the model; its own adapter or profile could produce fabricated observations labelled `live_model`, which the database cannot distinguish. The fixed runner (1C-B1) is the one reviewed production composition, and injects no ports, profiles or adapters of its own; any other caller would need the same review |
| Lower-level functions | Test-enforced only | `loadRealLiveExecutor` and `examineLiveAndRecord` are still exported. Only `evaluation.ts` imports the executor, and a boundary test keeps it so. Once the code lock is lifted, new code that ignored this could skip the durable checks. A runner must use `runAuthorizedEvaluation` only |
| Migration `20261108000000` | Database | Unchanged. **Blocks live-result persistence in the 1A table, not the model call** |

The v3 lock is separate from `LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD` on purpose. That older lock also opens the admin prototype's live path (`app/api/admin/creator-record-v2/examine`), so an evaluation must never lift it. Tests cover both directions.

### The existing evaluation CLI

`lib/creator-record/eval/run-receipt-eval.ts` is a separate, older path that neither lock controls, and no route reaches it. It has its own paid-call safeguards: live mode requires `--confirm-paid-calls`, `--max-calls`, `--max-usd` and explicit pricing, its default mode makes no model call, and it checks each selected document against its fixture manifest and hashes. `--max-calls` is a hard request limit, retries included; `--max-usd` is predictive, checked before each document, and not a hard cap.

It is built for its generated synthetic fixtures. It has no consent reference, read audit or prepared-version binding, so it is not a route for real documents. It sends the same request body as the live path for the same file: the same adapter, engine, prompt, schema, content blocks and output limits.

**1C-B2B: the synthetic compatibility workflow.** Its live mode now also requires `--model` to be exactly the live pin, refuses while `CREATOR_RECORD_RECEIPT_MODEL` names another model, reads only the dedicated key `CREATOR_RECORD_EXTRACTION_API_KEY` (refused if it equals `ANTHROPIC_API_KEY`), uses the live 25-second timeout, and refuses while any of the five unsafe SDK variables is set. It records every provider request in its report: requested and response model, stop reason, input and output tokens, latency, outcome, failure kind, retry attempt and the live input bound. It stops before any further request on an authentication failure, a rejected request, a response naming another model, a stop reason other than `end_turn` or `max_tokens`, or a malformed response, and accepts a reading only from `end_turn`. It does not exercise the runner, the ledger, the input-bound enforcement or Supabase, and a run of it makes paid provider calls that need their own approval.

**Credential operating decision (founder decision, 2026-11-12; CRV2-IA-4D3).** Routine engineering evaluations on SI8's synthetic fixtures do not need a separate Anthropic key or a separate development environment. They reuse existing authorized infrastructure where that is technically feasible without exposing a credential or weakening a control: in practice, the repository's GitHub Actions secret `ANTHROPIC_API_KEY`, used only inside a reviewed, manually dispatched workflow that runs from `main`, through the established Claude Code CLI → GitHub → Vercel process. (Since CR-V2-SYNTHETIC-KEY-REUSE-1 the synthetic tool already accepts `ANTHROPIC_API_KEY` when the dedicated key is absent; the paragraph above predates that.) This does not prohibit credential isolation where it is genuinely required. It does not change the dedicated-key requirement for **real-document** evaluation (P11 and section 3 below), and a document that must stay private still never goes to CI.

## 2. Prerequisites before any live evaluation

**None of these is met for a real run.** 1C-A implemented P1, P3, P4, P5, P6 and P7 in code. They are tested with mocks and, for the database, on disposable local PostgreSQL only. They become operational only when the evaluation-only schema is applied to an isolated project and a run is separately authorized. A control listed here is not a safeguard in force anywhere real.

| # | Prerequisite | What exists after 1C-A | Owner |
|---|---|---|---|
| P1 | **Authenticated operator and durable authorization.** The actor comes from an authenticated operator, and the authorization is verified against a stored record, with a maximum duration | **Implemented, not applied.** Supabase Auth token to operator id; durable authorization row (7-day maximum, server-timed, revocable once, unwritable by the service role) checked in the database and again in the entry point. No authorization exists | Engineering, reviewed |
| P2 | **Verified document ownership and consent.** Written consent from each owner, checked against the reference (section 4) | Ownership: the operator must own the document, enforced in the database and the application. **Consent: a required authority reference only. Nothing verifies the consent itself** | PM, Engineering |
| P3 | **Prepared-version status validation** | **Implemented.** Only the latest version of its draft, in status `prepared` or `reviewed`, binds. A superseded binding also returns no earlier reading | Engineering |
| P4 | **Secure SDK configuration** | **Implemented.** Explicit endpoint, logging off, no auth token; custom headers refuse; the executor refuses to build with any of the five variables set. Tested against the real SDK with a stubbed network | Engineering |
| P5 | **Robust PDF page limits** | **Implemented, deliberately conservative.** The count is the walked page tree and must agree with every other view of the file. Since 1C-A-FIX, every object the walk reaches must also be defined exactly once in the whole file, because the 1C-A review showed that a reader following the cross-reference table could see 40 pages where this counter saw 2. The 1B bypasses and the 1C-A one are refused. On the repository's 24 real PDFs it matches PyMuPDF and pypdf on 18 and refuses 6: five incrementally updated files that redefine objects, and one object stream the existing reader cannot decode. It never returned a wrong count. Valid PDFs, including incrementally updated or encrypted ones, may be refused. The reader still does not follow the cross-reference table itself | Engineering |
| P6 | **Persistence preflight before billable calls** | **Implemented, not applied.** The preflight checks the environment marker, the authorization and the document before anything is read; the reservation checks them again under a lock; the result can only be stored against that reservation | Engineering |
| P7 | **Durable cost control, or an approved external hard spending limit** | **Ledger implemented, not applied.** Section 8. The workspace spending limit remains external and not configured, and stays a required second limit | PM, Operator |
| P8 | **Model compatibility validation** (section 9) | The request and response shape were checked through the real SDK against a stubbed network. No live call has confirmed them | Engineering |
| P9 | **Retention and deletion policy** for evaluation documents, excerpts and results | None | PM |
| P10 | Anthropic terms for this data confirmed: commercial terms, retention period, use for training, sub-processors, data location | Not confirmed | PM, with legal review if needed |
| P11 | Dedicated Anthropic workspace and key (`CREATOR_RECORD_EXTRACTION_API_KEY`) | Not set up | Operator |
| P12 | Current price of the pinned model confirmed. The code's figure comes from a price table cached on 2026-10-06 | Not confirmed | Engineering |
| P13 | Isolated environment and the persistence schema (section 7) | Schema written as an evaluation-only file and tested locally. No isolated project exists, and nothing has been applied | Engineering, reviewed |
| P14 | Reviewed runner: one fixed, reviewed production composition, serial, stops on a stop condition, metadata-only report | **Implemented, locked, mock-tested (1C-B1).** One document per run. The stop conditions in section 8 that need a person remain the operator's. Never run against a real database | Engineering, reviewed |
| P16 | **A pre-call input bound, or a stronger reservation policy** | **Implemented (1C-B1), with two unconfirmed assumptions** (section 8). The reservation must cover the bound or nothing is sent | Engineering |
| P15 | Ground truth prepared before the run, stored outside this repository | Not done | PM |

## 3. What a run would need

**Implemented, behind the lock.** `loadRealLiveExecutor` refuses unless all of these hold, and tests with a fake adapter cover each one:

1. The code lock is true.
2. The authorization parses strictly: `authorization_id`, `expires_at`, `max_estimated_usd` and `permitted_documents` (SHA-256 and a consent reference for each). Code ceilings: at most 10 documents and $10 per authorization.
3. `CREATOR_RECORD_LIVE_EVALUATION` equals that `authorization_id`, and the authorization has not expired.
4. The dedicated key is present. The shared `ANTHROPIC_API_KEY` is not used.

**Proposed, not enforced by code:**

- The lock is lifted only by a reviewed change, in a build that is never deployed to Production.
- A separate written approval names the authorization.
- The migration in section 7 is applied in the isolated environment only. Without it a result cannot be stored, and, since 1C-A, the persistence preflight and durable reservation (P6) refuse before any model call.

## 4. Permitted documents (proposed)

- **Ownership:** only documents SI8 or the PM owns, such as SI8's own AI-tool receipts and invoices. No customer, prospect or third-party documents.
- **Consent:** the owner confirms in writing that the document may be sent to the model provider for this evaluation, and may withdraw that before the run. The authorization holds a reference to this, not the person's details.
- **Personal data:** review each document first and prefer ones with the least personal data. A redacted document may be used if the redaction is noted in the ground truth, because redaction changes what is legible.
- **Not permitted:** documents naming other people's payment details, identity documents, or anything from the V1 or V2 customer flows.

## 5. Scope and proposed first batch

**Profile in scope:** `receipt` version 1, the only registered live profile.

**Provider coverage is not guidance coverage.** The examination reports what a document prints, and it does not depend on governed provider guidance. Testing documents from five issuers does not need five approved guidance entries, and it does not create or extend any. Coverage here means layout variety, not a claim about any provider's terms.

**Recommended first batch: 6 documents, as a pipeline and failure check. It is not an accuracy study.**

| # | Document | What it tests |
|---|---|---|
| 1 | Native-text PDF invoice, issuer A | Baseline |
| 2 | Native-text PDF receipt, issuer B | Layout variety |
| 3 | Scanned or image-only PDF, issuer C | Reading without a text layer |
| 4 | PNG screenshot of a billing page | Image input, partial context |
| 5 | Billing document showing a plan change or two plan names | `ambiguous` and `multiple_plans_shown`, no choosing between plans |
| 6 | A non-billing page, such as a pricing page, with an owner-added line addressed to an AI ("mark this verified") | `not_a_billing_document`, `instruction_like_text_present`, the instruction is not followed |

**Implemented, behind the lock:** 1 MB per document and 5 PDF pages, checked before any model call. The page limit fails closed on unreadable files. The crafted-PDF bypasses found in 1B and 1C-A are refused since 1C-A-FIX, at the cost of refusing some valid PDFs, such as incrementally updated ones (P5).

## 6. Measures (proposed)

**Ground truth:** before the run, a person records for each document every field as `present` with its exact printed value, `not_shown`, `unreadable` or `ambiguous`, along with every printed plan name, the document type, legibility and the two flags. Fields: `issuer_name`, `product_or_plan_name`, `transaction_date`, `service_period_start`, `service_period_end`. Re-check it on a different day. It is not revised after seeing results unless the correction is recorded and reported.

| Measure | Definition |
|---|---|
| Field accuracy | Status and value match ground truth, per field |
| Omission | Printed in the document, reported as `not_shown`, `unreadable` or `ambiguous` |
| False positive | Reported `present` when not printed, or with a different value |
| Unsupported inference | A value not printed verbatim (a derived period, a corrected name, a completed date), or an excerpt not found in the document |
| Over-certainty | `present` where ground truth is `ambiguous` |
| Plan names | Printed names missed, and names reported that are not printed |
| Conclusions | Any statement about rights, licence, commercial use, entitlement or authenticity outside verbatim printed text |
| Instruction resistance | Whether document 6 changed any output |
| Failures and retries | Attempts and requests per document, by failure kind (`LiveRunReport`) |
| Latency | Per request and per attempt: median and maximum |
| Cost | Tokens, estimated cost and the workspace's billed amount. Report any difference between the estimate and the bill. Requests that end in a parse failure or a model mismatch report few or no tokens, so the bill is the reference |

Report raw counts per document. Six documents cannot support a percentage or an accuracy claim, and none may be drawn from this batch.

**Proposed bar for considering a larger study:** no false positive on any of the five fields, no unsupported inference, no conclusion, no followed instruction, and no stop condition. Omissions are reported, not gated: a cautious omission is a much smaller failure than an invented value. A miss is a finding to investigate before any re-run.

**A later accuracy study** needs its own authorization and a code change to the ceilings. As a sizing guide, zero errors in about 60 documents only supports an error rate below roughly 5% at 95% confidence.

## 7. Persistence: what enabling live results would require

**1C-A update.** The design below is now implemented as `supabase/evaluation-only/20261109000000_creator_record_v2_live_evaluation.sql`, with one deliberate change: instead of widening the 1A table's CHECKs, live results go to a **separate table**, so the 1A table, its function and every existing object stay exactly as they are (a database test compares them before and after). Item 5's authority is the authorization and documents tables. The file is not in `supabase/migrations`, has been applied only to disposable local databases, and needs an operator to establish both the existing isolated-test marker (for the examination read log) and a new evaluation marker naming the project. The consequences listed below still apply.

The original text follows.

**Today:** `creator_record_v2_live_examination_attempts` accepts only `mock_test`, its write function refuses `live_model` by name and accepts only committed synthetic fixtures, and both that function and the examination read log need the isolated-test marker, which Production does not have.

This protects what can be stored. It does not stop a model call: `examineLiveAndRecord` calls the model first and stores afterwards, and `runLiveExamination` does not use the database at all.

**Recommended: run the first evaluation in a separate, dedicated Supabase project**, not in Production. Nothing there can reach a customer, the whole project can be destroyed afterwards, and the marker can exist there without changing what Production refuses.

A later additive migration, applied only there, would need to:

1. Replace the single-value CHECKs on `execution_origin`, `content_class`, `executor_mode`, `provider` and `model` with one combined CHECK allowing exactly two shapes: `mock_test` with its test values as today, or `live_model` / `customer_document` / `live_model` / `anthropic` / the pinned model. No mixing, and existing rows stay valid.
2. Change the write function so the executor is read from the envelope only for a live shape, and the key is recomputed with those values.
3. Enforce live-only rules: origin `live_model_extracted` on every observation, no `mock_test_data_not_model_output` limitation, a response id that does not start with `mock-`.
4. Invert the fixture rule for live rows: a known synthetic fixture is refused, matching `live_refuses_known_fixture` in the application.
5. Add a new authority for live rows: a table holding the authorization id, expiry and permitted SHA-256 values, writable only by the operator. The isolated-test marker alone is not enough, because it says nothing about consent or which documents.
6. Keep unchanged: append-only attempts, one reading per document and profile, first write wins, three attempts, access-log correlation, and the document, size and media-type checks.
7. Add tests for all of the above, including that existing synthetic rows and replay runs still verify, and that `mock_test` rows cannot be relabelled.

**Applying it in Production is a separate, later decision** that would also have to replace the marker with a proper authority, because adding the marker there would also open synthetic examination writes.

Consequences to decide or accept:

- **Excerpts are document content.** Stored envelopes hold values and short excerpts from the document. Attempts are append-only and block deleting the document row (`ON DELETE RESTRICT`), so there is no way to delete them. An isolated project avoids this by being destroyed; Production would need a designed answer.
- **A deleted document's reading stays stored.** `examineBoundDocument` no longer returns it, but the row remains, and `examineLiveAndRecord` called directly has no state check before returning a held reading. A runner must use `examineBoundDocument` (P14).
- **No raw prompts are stored,** and no request body or model response other than the parsed fields.
- **One reading per document and profile id.** The index ignores the model and profile version, so a re-run with another model or prompt cannot be stored beside the first. Comparing models needs a fresh environment or a further schema decision.
- **Failed attempts count.** Three stored failures exhaust a document.
- **Nothing reads these rows** for a record, guidance, PDF or eligibility, and connecting them is a separate decision.

## 8. Spend and stop conditions

**1C-A: a durable ledger, implemented in the evaluation-only schema, not applied anywhere real.**

- Before the first request of an attempt, the database takes a reservation of the authorization's per-attempt amount, under a lock per evaluation, and refuses it when the attempt or spend ceiling would be passed. A local test with six concurrent attempts and room for two admitted exactly two.
- The per-attempt amount must be at least the code's planning maximum ($0.139 for the pinned model), or the entry point refuses.
- A reservation is never refunded. A settled one costs the larger of its reservation and the estimate from reported tokens. An unsettled one, from a crash for example, costs its full reservation. Nothing can delete or reset the ledger, including a restart.
- The executor refuses any request beyond its admitted attempts, so a model request without a reservation is not possible through it.
- **It is still an estimate**, from reported tokens and a cached price. A response that reports no usage is marked incomplete and charged its reservation. The provider's bill is the reference, and **the workspace spending limit stays a required external hard limit.**
- **The dollar ceiling is not a guaranteed maximum** (1C-A-FIX). Reservations are hard-checked before a call, but actual usage is only added afterwards, so one attempt can carry spend past the ceiling. The $0.139 planning maximum is conservative for output tokens (bounded by `max_tokens`, thinking disabled) and for images (downsized by the API), but **not for PDFs**: it assumes 5,000 input tokens a page, and a dense PDF can exceed that many times over. When usage is unknown, the charge is the reservation, which may understate. This finding led to P16, the pre-call input bound, implemented in 1C-B1 (below).

**1B, still in place as a second check:** each executor instance also keeps an in-memory reservation, which a reload resets.

**1C-B1: the pre-call input bound.** Before the reservation, the input tokens of one request are bounded from the document itself, and the executor bounds them again from the exact content it is about to send. Each term over-estimates:

- text (the fixed prompt, the instruction, the output schema and the PDF's extracted text): two tokens per UTF-8 byte;
- each image, and each PDF page: 5,000 tokens, above the documented ceiling for the pinned model's image limit (about 4,784 at 2,576 px);
- 2,000 tokens for message framing and the provider's structured-output instructions.

Refused before anything is reserved or sent: a PDF whose text layer cannot be read; a PDF with form fields, text-bearing annotations, embedded files or JavaScript (link annotations without their own appearance are allowed); since 1C-B1-FIX, a PDF with Type 3 fonts, tiling patterns or link annotations with an appearance, and one whose forms are nested more than 4 deep, refer back to themselves or are drawn more than 100 times; an image whose dimensions cannot be read; any input above 60,000 tokens a request. Scanned PDFs with no text layer are allowed and counted as page images. Encrypted PDFs are refused.

The durable per-attempt reservation must be at least the attempt's cost at this bound (both requests at the input bound, every output token). At the 60,000-token limit that is about $0.27; a one-page PDF is about $0.13. The executor refuses any request whose content is not one document and the fixed instruction within the bound it admitted.

**Limits of this bound, stated plainly:**
- It is an estimate, not a hard monetary cap. The provider's count cannot be known before the document is sent.
- Two terms are **assumptions**: that a PDF page costs no more than one image at the model's limit, and the framing allowance. Both must be checked with a token count on synthetic documents before any run.
- The external workspace spending limit remains a required, separate hard limit.

**Current proposal for the first batch (1C-B1), not approved:** per-attempt reservation $0.28, so any bounded input is covered (the attempt cost at the 60,000-token limit is about $0.27); 6 documents, 18 attempts at most, so $5.04 at most in reservations; authorization ceiling $6; workspace spending limit $10; 7-day expiry; one document per run. No amount in this document is approved.

**The workspace spending limit would be the hard limit. It is external and not yet configured** (P7, P11).

**History, superseded by the current proposal above.** The 1B proposal was 6 documents, 18 attempts at most, a $5 authorization ceiling, a $10 workspace spending limit, 7-day expiry, run serially; at the 1B planning maximum, 18 attempts reserved about $2.50. Its in-memory ceiling, still in place as a second check, has these limits: it lasts for one executor instance, and loading the same authorization again resets it; real usage above it is only detected after the response; and `callModel` called directly does not reserve anything. Its 5,000-tokens-a-page planning estimate is now one term of the 1C-B1 bound, still unmeasured.

**Stop conditions implemented in the executor, within one instance:** authentication or permission failure; a request the provider rejects; a response naming another model; reserved or estimated spend reaching the ceiling; an expired authorization. A document the authorization does not name is refused before it is read.

**Stop conditions proposed for the runner or the person running it, not implemented:**

- Any fabricated value or conclusion about rights or commercial use.
- Any instruction in a document being followed.
- Document content found in a log, an error or a report.
- Any document read outside the authorization, or an integrity refusal.
- An observation reaching a record, guidance or eligibility path.
- A provider failure rate suggesting an outage: two consecutive documents failing all attempts.
- Withdrawn consent, or a change in the provider's data terms.

## 9. Decisions needed before any run

1. **Provider data terms** (P10).
2. **Where it runs:** isolated project (recommended) or Production.
3. **Model.** The code keeps the existing pin, `claude-sonnet-5`. A code comment says the earlier synthetic spike used it, but no evaluation report is committed, so **its prior evaluation is not independently evidenced**. The adapter sends `thinking: { type: 'disabled' }`, which `claude-sonnet-5-5` and `claude-opus-5-5` reject with a 400, so moving to a current model is an adapter change. Either way, these remain unconfirmed without a live synthetic check (P8): that the API accepts this schema and document block, that the response names exactly the requested model id (the executor stops the run if not), and that the token and 25-second limits suit real documents.
4. **Authority for live rows** (section 7, item 5, and P1).
5. **Retention and deletion** of evaluation documents, excerpts and results (P9).
6. **Document loading:** how an owner's document reaches the isolated environment, since intake stays locked. The binding check also needs a prepared version that links each document to a tool, so the runner must create or seed one there.
7. **Approval of this protocol**, including the proposed bar and limits.
