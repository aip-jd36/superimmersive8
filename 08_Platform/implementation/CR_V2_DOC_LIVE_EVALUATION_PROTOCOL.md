# Creator Record V2: First Real-Document Evaluation Protocol (CR-V2-DOC-LIVE-1B)

**Status: PROPOSED. NOT AUTHORIZED. No real-document evaluation has been authorized, and nothing in this document has been run.**

It specifies a bounded first evaluation of the document examination on real documents, and lists what must be decided and built first. Approving this document does not authorize a run.

Every limit below is labelled. **Implemented** means the code does it today, behind the disabled lock. **Proposed** means it does not exist yet, or has not been approved.

This repository is public. Evaluation documents, ground truth, observations, excerpts and per-document results must never be committed.

## 1. What is ready, and what is not

Prepared and disabled:

| Part | Where | State |
|---|---|---|
| Real executor | `lib/creator-record/live-examination/real-executor.ts` | Throws on its first line while the code lock is false. Imported by nothing. |
| Limits, authorization format, spend estimate | `live-examination/controls.ts` | Code lock `LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD` is false. |
| Document binding (user, prepared version, tool, bytes, stored state) | `live-examination/document-access.ts` | Used only by tests. |
| Storage ports | `lib/creator-record-flow/live-examination-production.ts` | Imported by nothing. Builds no executor. |

Deliberately not built:

- **A runner.** No code calls `loadRealLiveExecutor`.
- **Live persistence.** The database still refuses to store `live_model` results (section 7).
- **A way to load a real document.** `EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED` stays false.

### What stops a model call today

| Control | Type | What it does and does not do |
|---|---|---|
| `LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD` | Compile-time | **The principal execution barrier**, together with the absence of any runner or route |
| Authorization object | Runtime, caller-supplied | Checked for format, ceilings and expiry. It is unsigned, not stored, and not independently verified |
| `consent_reference` | Runtime, caller-supplied | Checked for format only. Consent is not validated |
| `CREATOR_RECORD_LIVE_EVALUATION` and the dedicated key | Runtime | Must be present and match, as checked by `loadRealLiveExecutor` |
| `livePermitted` and `guard` in `runLiveExamination` | Runtime, caller-supplied | Once the code lock is lifted, code that builds its own executor and guard can skip the authorization, allowlist and model pin. A future runner must not do this |
| Migration `20261108000000` | Database | **Blocks live-result persistence, not the model call.** A run could pay for a call and then have the result refused and discarded |

The v3 lock is separate from `LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD` on purpose. That older lock also opens the admin prototype's live path (`app/api/admin/creator-record-v2/examine`), so an evaluation must never lift it. Tests cover both directions.

### The existing evaluation CLI

`lib/creator-record/eval/run-receipt-eval.ts` is a separate, older path that neither lock controls, and no route reaches it. It has its own paid-call safeguards: live mode requires `--confirm-paid-calls`, `--max-calls`, `--max-usd` and explicit pricing, its default mode makes no model call, and it checks each selected document against its fixture manifest and hashes.

It is built for its generated synthetic fixtures. It has no consent reference, read audit or prepared-version binding, and it uses `ANTHROPIC_API_KEY`, so it is not a route for real documents.

## 2. Prerequisites before any live evaluation

None of these is met. A control listed here is not an implemented safeguard.

| # | Prerequisite | What exists today | Owner |
|---|---|---|---|
| P1 | **Authenticated operator and durable authorization.** The actor comes from an authenticated operator, and the authorization is verified against a stored record, with a maximum duration | The actor and the authorization are both supplied by the caller. Nothing is stored | Engineering, reviewed |
| P2 | **Verified document ownership and consent.** Written consent from each owner, checked against the reference (section 4) | Ownership is checked against the document row. Consent references are format-checked only | PM, Engineering |
| P3 | **Prepared-version status validation** | The binding checks owner, digest, tool and SHA-256, but accepts a superseded prepared version | Engineering |
| P4 | **Secure SDK configuration.** The SDK reads `ANTHROPIC_LOG`, `ANTHROPIC_BASE_URL` and `ANTHROPIC_CUSTOM_HEADERS` from the environment. A test with a stubbed network showed that `ANTHROPIC_LOG=debug` writes the document and model output to the console, and `ANTHROPIC_BASE_URL` sends the document and key to another host | Not checked or overridden | Engineering |
| P5 | **Robust PDF page limits.** Count the real page tree | `countPdfPages` fails closed on unreadable files, but two crafted PDFs holding 40 pages counted as 1 | Engineering |
| P6 | **Persistence preflight before billable calls.** Confirm a result can be stored before calling the model | None. The model is called first | Engineering |
| P7 | **Durable cost control, or an approved external hard spending limit** | In-memory estimate only (section 8). The workspace spending limit is external and not yet configured | PM, Operator |
| P8 | **Model compatibility validation** (section 9) | The request and response shape were checked through the real SDK against a stubbed network. No live call has confirmed them | Engineering |
| P9 | **Retention and deletion policy** for evaluation documents, excerpts and results | None | PM |
| P10 | Anthropic terms for this data confirmed: commercial terms, retention period, use for training, sub-processors, data location | Not confirmed | PM, with legal review if needed |
| P11 | Dedicated Anthropic workspace and key (`CREATOR_RECORD_EXTRACTION_API_KEY`) | Not set up | Operator |
| P12 | Current price of the pinned model confirmed. The code's figure comes from a price table cached on 2026-10-06 | Not confirmed | Engineering |
| P13 | Isolated environment and the persistence migration (section 7) | Not built | Engineering, reviewed |
| P14 | Reviewed runner: uses `loadRealLiveExecutor` and `examineBoundDocument` only, runs serially, catches thrown port errors, stops on a stop condition, and writes only metadata to its report | Not built | Engineering, reviewed |
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
- The migration in section 7 is applied in the isolated environment only. Without it a result cannot be stored, but the model call would still happen unless P6 is built.

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

**Implemented, behind the lock:** 1 MB per document and 5 PDF pages, checked before any model call. The page limit fails closed on unreadable files but can be evaded by a crafted PDF (P5).

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

No migration was written. The rules below need policy decisions (section 9), and the existing protections must stay in force until those are made.

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

**Implemented, behind the lock. An estimate, not a hard limit:** each attempt reserves a planning maximum of $0.139 in memory and is refused when the authorization's ceiling cannot cover it.

- The ceiling lasts for one executor instance. Loading the same authorization again resets it.
- It rests on an unmeasured estimate of 5,000 input tokens per page and a cached price.
- Real usage above the ceiling is only detected after the response, when the run stops admitting attempts.
- `callModel` called directly does not reserve anything.

**The workspace spending limit would be the hard limit. It is external and not yet configured** (P7, P11).

**Proposed limits for the first batch, not approved:** 6 documents, 18 attempts at most, $5 authorization ceiling, $10 workspace spending limit, 7-day expiry, run serially. At the planning maximum, 18 attempts reserve about $2.50.

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
