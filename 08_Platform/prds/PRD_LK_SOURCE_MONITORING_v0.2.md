# Living Knowledge Source Monitoring & Refresh
## Product Requirements Document v0.2

**Status:** APPROVED for Phase A by the SI8 operator (JD), 2026-11-20. Milestones M0 to M3 are binding. Milestones M4 to M6 are provisional and each needs separate authorization. See "Approval record" below. Phase B is not authorized.
**Version:** 0.2 (supersedes the unpublished v0.1 draft of the same date; v0.1 was never committed)
**Date:** 2026-11-20
**Owner:** JD / SI8
**Milestones that produced this draft:** LK-SOURCE-MONITOR-PRD-1 (v0.1), LK-SOURCE-MONITOR-PRD-2 (critical review, v0.2), LK-SOURCE-MONITOR-PRD-3 (v0.2 revised: OPEN-7 operator decision recorded; impact-closure disposition added; OPEN-3 updated with repository findings; OPEN-9 added), LK-MATRIX-FREEZE-OPEN8-1 (v0.2 revised: OPEN-8 operator decision recorded; Legacy Matrix excluded from the mapping; FR-21a, AC-2a and AC-5a added), LK-SOURCE-MONITOR-FOUNDATION-1 (v0.2 approved: approval recorded; OPEN-3 corrected; M1 contract decisions recorded in §12.2; M1 implemented offline), LK-SOURCE-MONITOR-M1-CORRECTIONS-1 (pilot mapping corrected; lifecycle, exclusion and source-identity contracts in §12.2; attribution in §12.2 corrected; OPEN-10 added)
**Baseline inspected:** `origin/main` = `8690e9a7` for the OBSERVED statements; approval and M1 work were done against `origin/main` = `bb6c709a`
**Implementation status:** M1 (offline registry and mapping contract) implemented in `tools/lk-source-registry/` and corrected in LK-SOURCE-MONITOR-M1-CORRECTIONS-1. No mapping has been confirmed by a human; the M1 gate is not passed. M2 to M6 not started. Phase B not authorized.
**Related:**
- `08_Platform/prds/PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` (directional parent; "Source B — Automated Source Monitoring", §15, §16, §18)
- `08_Platform/implementation/LK_PHASE1_TECHNICAL_DESIGN.md` §11, §17–20, §25 and `LK_PHASE1_TECHNICAL_DESIGN_v2.md` §12, §14 (the approved Phase E automation proof)
- `tools/lk-source-monitor/` and `.github/workflows/lk-source-monitor.yml` (the existing narrow monitor)
- `06_Operations/institutional-knowledge/lk-automation/` (its output)
- `06_Operations/institutional-knowledge/notebook/EVIDENCE-CAPTURE-SOP.md`, `GOVERNED-CLAIMS.md`, `CRC-PUBLICATION-POLICY.md`, `MATRIX-LEARNINGS.md`
- `08_Platform/implementation/CRC_CURRENT_STATE.md` §9.5 (unresolved refresh policy)
- `08_Platform/app/lib/creator-record/contract/publication-ledger.ts` (Creator Record's separate freshness rule)

**How to read this document.** Statements are labelled:
- **OBSERVED** — verified in the repository at `8690e9a7`.
- **PROPOSED** — a requirement written by this document. Since the approval of 2026-11-20, a PROPOSED requirement that belongs to M0 to M3 is approved and binding; one that belongs to M4 to M6 is provisional (see "Approval record").
- **OPEN** — a decision that belongs to a human and has not been made.

Nothing labelled OPEN is a PM decision. The approval does not decide any OPEN item.

### Approval record

| | |
|---|---|
| Approver | The SI8 operator (JD) |
| Date | 2026-11-20 |
| Recorded under | LK-SOURCE-MONITOR-FOUNDATION-1 |
| Approved | The Phase A architecture described in this document |
| Binding | Milestones M0 to M3 and the requirements and acceptance criteria they must meet |
| Provisional | Milestones M4 to M6. Their text may change, and none may start without separate authorization |
| Authorized now | M1 engineering only, offline: no retrieval, no schedule, no alerts, no model calls, no Production change |
| Not approved | Phase B; any OPEN item; any pending governance review (including `FGR_030`, `FGR_031`, `CPR_037`, `CPR_038`); any change to a governed claim, its eligibility or its publication |

This record is the sign-off for M0. Approval of this document is not approval of any claim, source or baseline. Source Monitoring is an observational system: it is not an authority for claim validity, commercial clearance, adoption, publication or any CRC conclusion.

### Changes from v0.1

| Area | v0.1 | v0.2 |
|---|---|---|
| Baseline acceptance | One act; later runs then report "unchanged" | Acceptance separated from claim-impact follow-up; open items stay visible until closed by an existing governance record (§5.1 FR-29 to FR-33, §6.3) |
| Outcomes | Eleven mutually exclusive values mixing three kinds of thing | Run status, one per-source observation outcome with fixed precedence, and derived standing flags (§7) |
| Claim mapping | Self-checked against the registry | Human-confirmed relationship list, cross-checked against independent repository evidence, with stated limits (§5.1 FR-18 to FR-22) |
| Extraction-rule change | Silently produced a new baseline | Controlled re-extraction of the stored baseline and named acceptance (§5.1 FR-15 to FR-17) |
| Redirects | Followed; unexpected content kept "quarantined" | Only registered redirect steps are followed; content from an unregistered location is never fetched or stored (FR-5, FR-6) |
| Alerts | Repeat on every run until accepted | Alert on state change, with a standing summary and age-based escalation (FR-26 to FR-28) |
| Boundary proof | Static checks only | Static checks plus a runtime changed-path check and no model credentials in the job (FR-36 to FR-39) |
| Milestones | M0 required four open decisions before any work | First engineering milestone needs only PRD approval; decisions are attached to the milestone that needs them (§12) |

---

## 1. Problem and value

### 1.1 Problem

Living Knowledge claims rest on external documents that change without notice: provider terms, stock and music licences, statutes, regulator guidance. SI8 has no dependable way to learn that a source changed, and no machine-readable record of which claims depend on which source.

**OBSERVED:**
- 40 governed claims and 8 legacy Matrix rows are reachable in CRC. Their sources were last checked between 2026-08-01 and 2026-11-19.
- The only automated monitor watches two U.S. copyright sources (`tools/lk-source-monitor/sources.py`).
- Every refresh that changed something since August was done by hand (for example the 2026-10-26 Runway/Higgsfield recapture, commit `d8202429`, and the 2026-11-19 stock re-verification, commits `89a38b65`, `e157644e`).
- The 2026-10-26 recapture found Higgsfield's terms had been updated on 2026-10-23. It was found because someone looked, not because anything alerted.

### 1.2 Operator value

- The operator learns that a source changed, failed, moved or needs a human to capture it, without re-reading every source by hand.
- For any changed source, the operator sees the dependent claims on record and where each is exposed (CRC, Creator Record, reviewer-only).
- A change that has been seen but not yet reviewed against its claims stays visible until it is closed.
- Evidence of what a source said, and when, is preserved and reproducible.

### 1.3 Customer value

Customers do not see this system. They benefit indirectly: guidance shown in CRC and Creator Record is less likely to rest on terms that have quietly changed.

---

## 2. Goals and non-goals

### 2.1 Goals (Phase A)

1. A single machine-readable registry of monitored sources.
2. Verified source identity on every observation.
3. Deterministic change detection with a readable text diff.
4. A human-confirmed mapping from each source to its dependent governed claims, cross-checked against independent repository evidence.
5. An explicit, recorded result for every source on every run. No silent skips.
6. Alerts on change and on failure, without repeating the same alert every run.
7. An audit history that shows what was observed, when, and with what result.
8. Lasting visibility of changes whose effect on claims has not yet been reviewed.
9. Strictly read-only behaviour toward governed knowledge.

### 2.2 Non-goals

- Deciding whether a text change is a legal or contractual change. A detected change means only "the observed text differs".
- Deciding whether a source is still authoritative. A successful fetch proves only that a URL returned content.
- Deciding whether a claim is still valid. Accepting a new source baseline says nothing about the claims that depend on it.
- Adopting, editing, deprecating, superseding or publishing any claim.
- Changing CRC eligibility, scope, applicability, dependencies or lifecycle.
- Defining what CRC does with a stale claim (see OPEN-2).
- Applying Creator Record's freshness rule to CRC.
- Proving that the claim mapping is complete. The mapping is confirmed for the sources listed and no further.
- Crawling, link discovery, or search-based source discovery.
- Model calls of any kind in Phase A.
- New claim coverage. This initiative maintains existing knowledge; it does not expand it.
- Monitoring Legacy Matrix claims. They are listed as not monitored (FR-21a), not mapped (OPEN-8, decided).
- Domain-specific orchestration. One generic source model serves all domains.
- A general parser for the prose claims ledger.
- A new governance process. Every decision about a claim stays in the existing chain (§10).

---

## 3. Current-state evidence and limitations

All items in this section are **OBSERVED**.

### 3.1 The existing monitor

| Aspect | Observed behaviour | Evidence |
|---|---|---|
| Sources | Two: `copyright.gov/ai/` (HTML) and the Federal Register API filtered to the Copyright Office (JSON) | `sources.py` |
| Schedule | Every 3 days, plus manual dispatch | `lk-source-monitor.yml` |
| Pipeline | Fetch, hash, archive on change, model-drafted candidate claim or decline, verbatim-quote check, adversarial model pass, review package, email | `monitor.py` |
| Redirects | Followed by default; the final location is not checked | `monitor.py` line 71 |
| Write boundary | No write path to `GOVERNED-CLAIMS.md` or `topic-claims-fixture.ts`; a static check covers those two path constants in `monitor.py` only | `verify_no_mutation.py` |
| Repository writes | The workflow stages only `lk-automation/` and pushes to `main`; it declares no `permissions:` block; one step holds both the model key and the email key | `lk-source-monitor.yml` lines 42–43, 57–59 |
| Output | 3 archives, 3 review packages, 1 bot commit (`ca30758d`, 2026-10-10) | `lk-automation/` |
| Tests | None | — |

### 3.2 Limitations

1. **Silent failure.** A fetch error is printed and skipped (`monitor.py` lines 471–473); the job succeeds and no alert is sent. `last_checked` updates only on change (line 513), so "unchanged", "blocked" and "broken" look identical. The Copyright Office page still shows `20260816`.
2. **No diff, no noise control.** Any byte change triggers the pipeline. The Higgsfield manifest records two fetches with different raw bytes and identical extracted text.
3. **It asks the wrong question.** It asks whether a change justifies a new claim, not whether existing claims are still supported.
4. **Truncation.** Only the first 40,000 characters reach the model (line 256).
5. **Design controls not built.** The approved design required structured output and delimited untrusted input (`LK_PHASE1_TECHNICAL_DESIGN.md` §20). The implementation pastes page text into a free-text prompt.
6. **Not general.** Prompt, claim template and jurisdiction are specific to U.S. copyright.
7. **Run history not observable from the repository** beyond the one bot commit.

### 3.3 Source and claim records

- Claims link to sources in prose only. 22 of 46 ledger entries cite a preserved capture under `notebook/evidence-captures/`; 24 do not.
- Manifests (14 folders, 15 manifest files) record URL, capture time, stated version, evidence tier and SHA-256. Only 7 of the 15 name a claim ID. They are not machine-readable as a set.
- The runtime claim carries `last_verified`, `superseded_by`, `tool_scope` and `provider_scope`; no URL, no hash.
- No record maps a source to the claims that depend on it.
- Sources have no version entity. The legacy Matrix has no versioning (`CRC-PUBLICATION-POLICY.md` line 57).
- The Evidence Capture SOP §7 separates "source changed" from "governed proposition changed" and states that recording what was re-confirmed "is not currently a structured field anywhere (a real, disclosed gap)". Until one exists it directs that the record be kept in prose on the claim's own entry. The 2026-11-19 re-verifications follow that practice (`GOVERNED-CLAIMS.md` lines 799 and 2816: "no proposition, scope or dependency changed").

### 3.4 Retrieval reality

`MATRIX-LEARNINGS.md` records seven distinct retrieval failures (bot blocks, region blocks, client-side rendering, timeouts, unreadable PDFs, truncation, auth gates) and lookalike-domain risk for popular tool names. Shutterstock and Pond5 required the founder's browser on 2026-11-19.

### 3.5 Freshness handling today

- **CRC:** `last_verified` is displayed and never evaluated. The policy for stale claims is explicitly unresolved (`CRC_CURRENT_STATE.md` §9.5).
- **Creator Record:** its publication ledger refuses a claim when `refresh_by` has passed (`refresh_lapsed`) or when the claim's `last_verified` differs from the value approved (`claim_reverified_since_approval`) (`publication-ledger.ts` lines 147–149). Current entries lapse 2027-02-10 and 2027-02-19. This is Creator Record's own rule and is not CRC policy.

---

## 4. Product scope and phased roadmap

| Phase | Scope | Status |
|---|---|---|
| **A — Source Monitoring** | Registry, identity checks, snapshots, deterministic change detection, source-to-claim mapping, outcomes, alerts, audit history. Six-source pilot. No model calls. | Approved 2026-11-20; M0 to M3 binding, M4 to M6 provisional |
| **B — AI-assisted Refresh** | Interpreting observed changes and drafting proposals for human governance. | Future; **not authorized** |

### 4.1 Phase A in one paragraph

On a governed cadence, the monitor observes each registered source by its registered method, verifies it is still the same source, extracts comparable text, compares it with the last accepted snapshot, records one explicit outcome, preserves evidence when something changed, lists the dependent claims on record, and alerts the operator. It keeps an open item for each dependent claim until a human points to the governance record that closes it. It never touches governed knowledge.

### 4.2 Phase B — intended capability (not authorized, not specified)

At a high level, Phase B would:
- describe what changed in an observed source, in plain language;
- identify which governed propositions the change may affect;
- draft a research or update proposal for a human reviewer;
- route every proposal through the existing governance chain (§10);
- carry the source snapshot and diff with every proposal.

Phase B is described here only so Phase A does not block it. Its design, controls and approval are a separate, later decision. Phase A must not include model calls in anticipation of it.

---

## 5. Requirements

All requirements are **PROPOSED**.

### 5.1 Functional requirements

**Registry**
- **FR-1** One machine-readable registry is the only list of monitored sources. Adding or changing an entry is a reviewed repository change.
- **FR-2** Each entry carries the fields in §6.1.
- **FR-3** The registry is validated before every run. An invalid registry stops the run (run status `REGISTRY_INVALID`, §7.1) and no source is observed.

**Identity and network targets**
- **FR-4** Sources are addressed by exact `https` URL, never by domain pattern or search.
- **FR-5** Redirects are not followed automatically. The monitor follows a redirect only when the next location exactly matches the next registered step toward the registered final URL. Any other redirect ends the observation with outcome `IDENTITY_CHANGED`. The unexpected location is recorded as text. It is never requested and no content from it is stored.
- **FR-6** Each entry may declare identity markers (expected title or heading text). Missing markers produce `IDENTITY_CHANGED`. In that case the response is not kept as a baseline candidate.
- **FR-7** Responses are bounded by a timeout and a maximum size. Exceeding either is `FETCH_FAILED`.

**Retrieval**
- **FR-8** Each entry declares one retrieval method: `automated_http`, `automated_api`, or `human_capture`.
- **FR-9** `human_capture` sources are never fetched automatically. The monitor reports when their next capture is due and whether it is overdue.
- **FR-10** No retrieval method evades access controls, authenticates, or impersonates a user.

**Snapshots and provenance**
- **FR-11** When the outcome is `CHANGED`, `VERSION_MARKER_CHANGED` or `NO_BASELINE`, the raw response is preserved byte-for-byte with capture time, requested URL, final URL, HTTP status, raw SHA-256 and extracted-text SHA-256. The raw snapshot behind every accepted baseline is retained for as long as that baseline is current.
- **FR-12** Snapshots are immutable. A later run never overwrites or edits one.
- **FR-13** Snapshot storage location is subject to OPEN-4.

**Change detection**
- **FR-14** Comparison uses a deterministic extracted-text form defined per source class, not raw bytes. The extraction rule and its version are recorded with every observation.
- **FR-15** A changed extraction rule never produces a reported content change and never produces a baseline by itself. Before the new rule is used for observation, the stored raw snapshot of the current baseline is re-extracted with both the old and the new rule, offline, and the two extracted texts are compared. The comparison is kept as a record.
- **FR-16** The baseline hash under the new rule takes effect only through a named human acceptance of that comparison (acceptance type `extraction_rule_change`). Text present under the old rule and absent under the new one is listed explicitly in the comparison.
- **FR-17** Registry validation fails when an entry's extraction-rule version differs from the rule version its baseline was accepted under. An extraction-rule acceptance and a content-change acceptance for the same source are separate acts and cannot be combined.
- **FR-17a** A `CHANGED` outcome includes a text diff against the last accepted snapshot. An empty or near-empty extraction, or one below the registered minimum length, is `EXTRACTION_SUSPECT`, not `UNCHANGED` and not `CHANGED`. The stated version or "last updated" text, where the entry declares a locator for it, is recorded and compared separately.

**Source-to-claim mapping**
- **FR-18** The mapping is a list of relationships, each naming one source and one governed Living Knowledge claim ID. Legacy Matrix rows and claims are not part of the mapping: no Matrix identifier is recorded in the registry or in any relationship (OPEN-8, decided 2026-11-20). A source may have many claims and a claim may have many sources.
- **FR-19** Each relationship records the basis for it (where in the repository the dependence is evidenced), the named human who confirmed it, and the date.
- **FR-20** Validation cross-checks the mapping against evidence that does not come from the registry itself:
  - every claim ID named in a relationship exists in the governed ledger (`GOVERNED-CLAIMS.md`), which is the authority for claim identity and lifecycle. The runtime claim fixture is read for consistency, scope and exposure, and is never an alternative authority (§12.2);
  - for a provider or tool source, every runtime claim whose `tool_scope` or `provider_scope` names that provider or tool is either mapped to one of that provider's registered sources or listed as an exclusion with a reason;
  - every claim ID named in the evidence manifest that an entry points to is either mapped or listed as an exclusion with a reason;
  - every Creator Record ledger entry whose claim is mapped is reported with that claim.
- **FR-21** A coverage report lists, on every run, the CRC-eligible claims that no registered source covers. In M1, which has no runs, the offline validation command produces this report. This list is expected to be long during the pilot. It is information, not a failure.
- **FR-21a** The same report lists, in a separate section, every Legacy Matrix claim that is CRC-eligible and therefore still reachable in CRC, with its claim identifier, its row identifier and the row's last-verified date. The section is labelled "CRC-reachable, not monitored". The list is read from the Matrix runtime fixture on each run, never maintained by hand and never written back. It is an observation only: it does not validate a claim, does not say a claim is stale or current, and is not a governance decision. It is temporary and shrinks as Matrix claims are retired; an empty list is reported as empty, not omitted.
- **FR-22** The monitor states the limits of the mapping wherever it reports dependent claims: "confirmed by <name> on <date>; other dependencies may exist". It never describes the mapping as complete.
- **FR-23** For a non-`UNCHANGED` outcome, the report lists each mapped claim with its lifecycle, CRC eligibility and whether a Creator Record ledger entry depends on it. These values are read, never written.

**Results**
- **FR-24** Every run has one run status, and every source that was attempted has exactly one observation outcome, as defined in §7. A source that was not attempted is recorded as such with the reason.

**Cadence and alerts**
- **FR-25** Cadence is set per source class in configuration. Values are subject to OPEN-1.
- **FR-26** Alerts are sent on a change of state, not on every run: a new non-`UNCHANGED` outcome, a change in the content of an already-open change, a new failure, a recovery, a capture becoming due or overdue, and any run status other than `COMPLETED`.
- **FR-27** Every run writes a heartbeat and a standing summary of all open items: unaccepted changes, open claim-impact items, consecutive failures, and captures due. The summary is sent on a fixed interval even when nothing changed.
- **FR-28** An open item that passes a configured age, or a source that reaches a configured number of consecutive failures, produces an escalation alert that says the item is unresolved or the source is effectively unmonitored. Alerts carry source name, outcome and a pointer to the report. They do not carry draft conclusions.

**Baseline acceptance and claim-impact follow-up**
- **FR-29** Accepting a new baseline after a change is an explicit, recorded act by a named human. It means only "this is now the text later observations are compared against". Until it happens, later runs keep comparing against the last accepted snapshot.
- **FR-30** An acceptance record creates one impact item for every claim mapped to the source. Every item starts `open`. Baseline acceptance and impact review are separate recorded acts, even when the same person performs both.
- **FR-31** An item is closed only by a disposition recorded by a named human reviewer (§6.3). The disposition states, for that one claim: the observed change it addresses; the evidence reviewed; the outcome; and a reference to any existing governance record that addresses this change and this claim. The outcome is one of:
  - `no_governance_action_required` — the reviewer compared the observed change with the passages the claim rests on (the SOP §7 comparison) and found no governance action is needed. The item may close on this disposition.
  - `governance_action_required` — the item stays `open` until the referenced governance record (a Formal Governance Review, a CRC Publication Review, a supersession, or a re-verification note on the claim's ledger entry) has been decided and the reviewer records that it addresses this change and this claim.
- **FR-31a** An item stays `open` where the effect on the claim is unresolved, a required governance action is pending, the referenced record does not address the observed change, or the evidence is insufficient. A reference to a governance record that is pending or that concerns something else does not close an item.
- **FR-31b** The monitor checks only what it can check mechanically: that the disposition fields are present, that the reviewer is named, that evidence and governance references resolve in the repository, and that an item with outcome `governance_action_required` is not closed without a reference. Whether a record really addresses the change is the named reviewer's attestation, not a machine finding.
- **FR-32** Open items stay in the standing summary and the audit log until closed, whatever later observations report. An accepted baseline with open items is reported as "baseline accepted; claim impact not yet reviewed for: <claims>".
- **FR-33** The monitor never closes an item by itself, never writes to the ledger, and never changes `last_verified`. Closing an item never implies CRC publication approval, legal clearance, that the claim is valid, or any change to the claim's eligibility. A disposition is worded about the observed change, not about the claim's correctness.

**Audit and recovery**
- **FR-34** An append-only observation log holds one record per source per run (§6.2). Acceptance records and item closures are appended to the same history.
- **FR-35** A run can be repeated safely. A repeated run does not duplicate snapshots or corrupt state.

**Read-only boundary**
- **FR-36** The monitor has no write path to `GOVERNED-CLAIMS.md`, `PLATFORM-RIGHTS-MATRIX.md`, `topic-claims-fixture.ts`, `matrix-fixture.ts`, `topic-relationships-fixture.ts`, or `lib/creator-record/governed/**`. This is checked statically in CI.
- **FR-37** Before any repository write, the job checks at run time that every changed path lies inside the monitor's own data directory. If not, the job fails without writing.
- **FR-38** The monitor makes no model calls in Phase A. Its code has no model client dependency (checked statically), and its job is given no model credentials (checked in the job definition).
- **FR-39** The job declares the narrowest repository permission it needs. The retrieval step holds no secrets. The notification step holds only the notification credential.

### 5.2 Non-functional requirements

- **NFR-1 Determinism.** The same input bytes and extraction version always produce the same hash and outcome.
- **NFR-2 Reproducibility.** Any reported diff can be regenerated from stored snapshots.
- **NFR-3 Politeness.** One request per source per scheduled run, an honest user agent, and no retries beyond a small fixed limit.
- **NFR-4 Cost.** No paid model usage. Runs within existing scheduled-job limits.
- **NFR-5 Maintainability.** A source class is added by configuration plus an extraction rule, not by new orchestration.
- **NFR-6 Observability.** An operator can answer "when was this source last successfully observed, what happened, and what is still open?" from stored records alone.
- **NFR-7 Security.** Fetched content is treated as untrusted data. It is never executed, never followed for further links, and never used to select what is fetched next.
- **NFR-8 Testability.** Every run status, observation outcome and standing flag in §7 is reachable in automated tests using local fixtures, with no network access.
- **NFR-9 Proportion.** No new service, database or hosted component. The pilot runs in the scheduled-job environment the existing monitor already uses.

---

## 6. Data requirements

All **PROPOSED**. Field names are illustrative; the implementation design fixes them.

### 6.1 Source registry entry

| Field | Purpose |
|---|---|
| `source_id` | Stable identifier |
| `name`, `owner` | Human-readable source and the organisation that publishes it |
| `source_class` | One of a small closed set, e.g. provider terms, licence terms, statute or regulation, regulator guidance, official feed |
| `canonical_url` | Exact `https` URL requested |
| `redirect_steps`, `expected_final_url` | Exact locations the monitor may follow, in order |
| `identity_markers` | Optional text that must be present |
| `retrieval_method` | `automated_http`, `automated_api`, `human_capture` |
| `extraction_rule` and version | How comparable text is derived |
| `min_extracted_length` | Floor below which extraction is suspect |
| `version_locator` | Optional rule for finding the stated version or date |
| `evidence_tier` | The SOP §4 class this source normally yields |
| `scope` | The stable tool or provider identity the source covers, where one applies: the identifier governed claims use in `tool_scope` or `provider_scope`, or an explicit "none". Never inferred from a URL or a name (§12.2) |
| `applicability_scope_note` | Plan, tier or product the source covers, as free text |
| `cadence_class` | Resolved to an interval by configuration (OPEN-1) |
| `baseline` | Pointer and hashes of the last accepted snapshot, the extraction-rule version it was accepted under, the named accepter and the date; empty until first acceptance |
| `evidence_manifest` | Optional pointer to the governance evidence manifest for this source |
| `notes` | Known retrieval problems, lookalike domains |

### 6.2 Source-to-claim relationship

| Field | Purpose |
|---|---|
| `source_id`, `claim_ref` | One source, one governed Living Knowledge claim ID. Matrix identifiers are not valid here (OPEN-8) |
| `basis` | Where the dependence is evidenced (ledger entry, manifest, governance review) |
| `source_identity` | How the source is tied to the authority the claim cites: `address_in_ledger` (checked) or `attested` (§12.2 C.3) |
| `confirmed_by`, `confirmed_on` | Named human and date |

Exclusions (a claim that an independent check suggests but a human has ruled out) use the same shape with a reason and a category, and, for an identifier outside the ledger, the evidence record that names it (§12.2 C.2).

### 6.3 Observation, acceptance and impact records

**Observation record:** `run_id`, `observed_at`, `source_id`, observation outcome, requested URL, final URL, HTTP status, raw and extracted hashes when content was received, extraction-rule version, stated version when located, snapshot and diff pointers when preserved, the mapped claims with lifecycle and exposure as read, and failure detail.

**Acceptance record:** `source_id`, acceptance type (`first_baseline`, `content_change`, `extraction_rule_change`), the snapshot or comparison accepted, the named human, the date, and one impact item per mapped claim.

**Impact item:** `claim_ref`, state (`open` or `closed`), and an optional disposition.

**Disposition** (recorded on an item; required to close it): named reviewer; date; the observed change addressed (observation and diff pointers); evidence reviewed (pointers); outcome (`no_governance_action_required` or `governance_action_required`); a short statement of what was compared; and a governance reference where one exists.

An impact item is a status, a short operational disposition and pointers. It holds no legal conclusion, no statement that a claim is valid, and no approval. It is not a Formal Governance Review or a CRC Publication Review and cannot substitute for one. It exists because SOP §7 names the absence of a structured record of this comparison as a gap. Whether a `no_governance_action_required` disposition must also be noted on the claim's ledger entry is OPEN-9.

### 6.4 Relationship to existing records

- Existing manifests under `notebook/evidence-captures/` remain the governance evidence for claims. The registry points to them; it does not replace or rewrite them.
- A monitoring snapshot is an observation. It becomes claim evidence only through the Evidence Capture SOP and a governance review.
- An accepted monitoring baseline is not the text a claim was governed against unless a governance record says so. Where the two differ, the difference is exactly what an open impact item represents.

---

## 7. Result model and failure semantics

All **PROPOSED**.

The pipeline for one source is linear: retrieve, verify identity, extract, compare. The first stage that does not succeed decides the outcome. This gives one unambiguous outcome per attempted source without a free combination of independent dimensions.

### 7.1 Run status (one per run)

| Status | Meaning |
|---|---|
| `COMPLETED` | Every due source was attempted and recorded |
| `REGISTRY_INVALID` | The registry or mapping failed validation; no source was observed |
| `RUN_FAILED` | The run stopped before finishing for another reason; sources not reached are recorded as not attempted |

Any status other than `COMPLETED` is a non-success job result and an alert.

### 7.2 Observation outcome (one per attempted source, in precedence order)

| Order | Outcome | Meaning | Snapshot kept |
|---|---|---|---|
| 1 | `FETCH_FAILED` | Network error, timeout, size limit, or non-success status | No |
| 2 | `IDENTITY_CHANGED` | An unregistered redirect, or identity markers missing | No; the unexpected location is recorded as text only |
| 3 | `BLOCKED` | Bot wall, consent wall, auth gate or challenge page detected | Yes, for diagnosis; never a baseline candidate |
| 4 | `EXTRACTION_SUSPECT` | Content received but extraction empty, too short, or unparseable | Yes; never a baseline candidate |
| 5 | `NO_BASELINE` | Content received and extracted; nothing accepted to compare against | Yes |
| 6 | `CHANGED` | Extracted text differs from the accepted baseline | Yes, with diff |
| 7 | `VERSION_MARKER_CHANGED` | Extracted text equal; stated version or date differs | Yes |
| 8 | `UNCHANGED` | Identity verified; extracted text and version marker equal the baseline | No |

`human_capture` sources are not attempted and receive no observation outcome.

### 7.3 Standing flags (derived per source from history, not observed)

| Flag | Meaning |
|---|---|
| `open_change` | A `CHANGED` or `VERSION_MARKER_CHANGED` result has not been accepted |
| `open_impact` | An accepted change has at least one impact item still `open` |
| `consecutive_failures` | Count of runs without a successful comparison |
| `capture_due`, `capture_overdue` | For `human_capture` sources |
| `rule_change_pending` | An extraction-rule change awaits acceptance; observation of that source is suspended until it is accepted |

Standing flags persist across runs. A later `FETCH_FAILED` does not clear `open_change` or `open_impact`.

### 7.4 Rules

1. **Unknown is never reported as unchanged.** Only a verified, successfully extracted, equal comparison yields `UNCHANGED`.
2. **A failed observation never updates the baseline or the "last successfully observed" date.**
3. **Retrieval failure is never evidence of absence**, matching SOP §5.
4. **Baseline acceptance never clears claim impact.** Only a named reviewer's disposition for that claim does, and where governance action is required, only once that action is decided.
5. **A source that becomes blocked is proposed for reclassification to `human_capture`.** The reclassification itself is a reviewed registry change.
6. **The monitor does not act on governed knowledge in any outcome.** What a stale or changed source means for CRC is OPEN-2.
7. **A change in raw bytes alone is not a change.** A change in extracted text is a change in text, not a finding about law or contract.
8. **Content from an unregistered location is never fetched or stored.**

---

## 8. Pilot source selection

**PROPOSED.** Six sources, chosen to exercise each source class and each failure path with sources SI8 already governs.

| # | Source | Class | Method | Why |
|---|---|---|---|---|
| 1 | U.S. Copyright Office AI page | Regulator guidance | `automated_http` | Already monitored; continuity. Watch-only: no claim is mapped to it (§12.2 C.4) |
| 2 | Federal Register, Copyright Office documents | Official feed | `automated_api` | Already monitored; structured input. Watch-only: no claim is mapped to it |
| 3 | Runway Terms of Use | Provider terms | `automated_http` | Fetched successfully on 2026-10-26; redirects `runwayml.com` → `runway.com`, which exercises the registered-redirect rule; Creator Record tool |
| 4 | Higgsfield Terms of Use Agreement | Provider terms | `automated_http` | Fetched successfully on 2026-10-26; raw bytes vary between fetches; changed on 2026-10-23; Creator Record tool |
| 5 | New York General Business Law §396-b | Statute | `automated_http` | Captured on 2026-09-10; low expected change; exercises the slow cadence |
| 6 | Kling AI Terms of Service (known blocked) | Provider terms | `human_capture` | Exercises the human-capture path without attempting to defeat a block |

Notes:
- Which snapshot becomes the first baseline for sources 3 and 4 is part of OPEN-3. The registry entries and mapping are built first; their baselines stay empty until a named human accepts one.
- Source 6 is Kling (operator decision, 2026-11-20).
- No pilot source requires new claim research.

---

## 9. Acceptance criteria and UAT scenarios

All **PROPOSED**. Criteria are grouped by the milestone that must meet them (§12).

### 9.1 Registry and mapping (M1)

- **AC-1** Registry validation passes for all six entries and fails, with a clear reason, for each malformed-entry fixture (bad URL scheme, missing final URL, unknown class, unknown method, rule version not matching the baseline).
- **AC-2** Every relationship names an existing governed claim, a basis, a confirmer and a date.
- **AC-2a** A relationship or exclusion whose `claim_ref` is a Matrix row or Matrix claim identifier fails validation with a clear reason.
- **AC-2b** A relationship marked `address_in_ledger` fails validation when the source's registered address is not among the addresses in the claim's own Source references. Fixtures prove this for a different document of the same provider and for an index page above a cited document.
- **AC-2c** An exclusion naming an identifier that is not in the ledger fails validation unless an existing evidence record names that exact identifier. An exclusion's category must agree with the ledger.
- **AC-2d** A relationship whose claim is `Deprecated` is reported for review, is not counted as coverage, and does not make the registry `INVALID`. A relationship to an unknown or unapproved claim fails validation.
- **AC-3** The scope cross-check (FR-20) reports zero unexplained claims for the pilot's provider and tool sources: each is mapped or excluded with a reason.
- **AC-4** The manifest cross-check reports zero unexplained claim IDs for entries that point to a manifest.
- **AC-5** The coverage report lists CRC-eligible claims with no registered source, and its wording states the limits in FR-22.
- **AC-5a** The coverage report's "CRC-reachable, not monitored" section lists exactly the Matrix claims marked CRC-eligible in the Matrix fixture, each with its claim identifier, row identifier and last-verified date. In a test fixture, a claim that is not CRC-eligible does not appear, and a fixture with no CRC-eligible Matrix claim produces an explicitly empty section. The section's wording makes no statement about any claim's validity.
- **AC-6** A fixture with one source mapped to several claims and one claim mapped to two sources validates and reports both directions correctly.
- **AC-7** All of the above run with no network access.

### 9.2 Observation core (M2)

- **AC-8** Every run status, observation outcome and standing flag in §7 is produced by at least one automated test using local fixtures.
- **AC-9** A cosmetic-only fixture (changed markup, identical text) yields `UNCHANGED`.
- **AC-10** A one-sentence text change yields `CHANGED` with a diff that shows that sentence.
- **AC-11** A fetch failure yields `FETCH_FAILED`, a non-success job result, and no change to baseline or last-success date.
- **AC-12** A redirect to an unregistered location yields `IDENTITY_CHANGED`; the test proves that location was never requested.
- **AC-13** A challenge or consent page yields `BLOCKED` or `EXTRACTION_SUSPECT`, never `UNCHANGED` or `CHANGED`.
- **AC-14** A source with an unaccepted change followed by a failed fetch still shows `open_change`.
- **AC-15** Re-running the same run does not create duplicate snapshots.
- **AC-16** An extraction-rule change without an acceptance fails validation. With the comparison and acceptance in place, the next observation of an unchanged source is `UNCHANGED`, and text dropped by the new rule appears in the comparison.

### 9.3 Acceptance, impact and alerts (M2)

- **AC-17** After a content change is accepted with open impact items, later runs report `UNCHANGED` for the source and still list every open item.
- **AC-18** An impact item closes only with a complete disposition by a named reviewer. Fixtures prove each refusal: missing field, unnamed reviewer, unresolved evidence or governance pointer, and outcome `governance_action_required` with no reference.
- **AC-18a** An item with outcome `governance_action_required` stays open and stays in the standing summary after its disposition is recorded, until a later recorded act closes it.
- **AC-18b** Baseline acceptance and impact disposition appear as separate entries in the audit history, each with its own actor and date, when the same person performs both.
- **AC-19** An unaccepted change produces one alert when first seen, none on identical later runs, a new alert when the changed text changes again, and an escalation when it passes the configured age.
- **AC-20** A run with no changes writes a heartbeat, one record per attempted source, and the standing summary.

### 9.4 Boundaries (M3)

- **AC-21** Static checks prove FR-36 and the absence of a model client.
- **AC-22** The run-time path check fails the job, without writing, when a fixture run touches a path outside the data directory.
- **AC-23** The job definition declares minimal repository permission and gives the retrieval step no secrets.

### 9.5 UAT scenarios (operator-performed, M4–M5)

1. **Quiet period.** Scheduled runs with no changes. Confirm heartbeats, records and one standing summary per interval, and no other alerts.
2. **Real change.** When a pilot source next changes, confirm the alert, read the diff, and review the listed claims against the ledger by hand.
3. **Forced failure.** Register an unreachable URL in a test entry. Confirm the alert and non-success result.
4. **Human capture.** Let source 6 reach its due date. Confirm the reminder, perform the capture under the SOP, record it, and confirm the due date advances.
5. **Acceptance with open impact.** After scenario 2, accept the baseline leaving items open. Confirm later runs still report them. Record one disposition of each outcome: confirm the `no_governance_action_required` item closes and the `governance_action_required` item stays open.
6. **Boundary check.** After several runs, confirm by repository history that no governed file was modified by the monitor.

---

## 10. Governance and security boundaries

### 10.1 What stays authoritative (OBSERVED, preserved unchanged)

The chain is: source observation → evidence capture → proposed interpretation → human governance → approved publication → CRC retrieval → Bounded Interpretation → composition.

- **Evidence:** `EVIDENCE-CAPTURE-SOP.md` (retrieval order, human capture, provenance classes, fail-closed rules, checksums, and the §7 distinction between a changed source and a changed proposition).
- **Adoption:** Formal Governance Review and a named Adoption Approver.
- **Publication:** CRC Publication Review and a named CRC Approver, under `CRC-PUBLICATION-POLICY.md`.
- **Runtime representation:** the manual fixture mirror and its consistency test.
- **Claim controls:** CRC eligibility, tool and provider scope, applicability requirements, unresolved project dependencies, lifecycle, and supersession by version.
- **Conclusion ceiling:** Bounded Interpretation. Nothing in this initiative can make CRC say more than a governed claim permits.
- **Creator Record:** its own publication ledger, approvals, `refresh_by` and re-verification rule. Separate from CRC.

### 10.2 What this initiative adds, and what it does not

**Adds (PROPOSED):** two recorded human acts that do not exist today — accepting a source baseline, and recording an impact disposition for a claim. Neither changes a claim.

**Authority for the pilot (DECIDED by the SI8 operator, 2026-11-20, recorded in LK-SOURCE-MONITOR-PRD-3; resolves OPEN-7):**

| Act | Who | Capacity |
|---|---|---|
| A. Monitoring operations and alert ownership | The named SI8 operator (JD) | Operator |
| B. Source-baseline acceptance | The named SI8 operator (JD) | Operational evidence acceptance |
| C. Impact-item disposition and closure | The named SI8 operator (JD) | Human impact reviewer, for the pilot |
| D. Changes to governed Living Knowledge | Existing FGR, Adoption, CPR and publication authorities | Unchanged |

One person may perform A, B and C. Each act is recorded separately, with its own actor, date and capacity, so the acts stay distinguishable in the audit history. Accepting a baseline (B) is not a statement that any dependent claim remains valid. A disposition (C) is not an act under D and cannot stand in for one. This decision covers the pilot only; authority beyond the pilot is not decided.

**Does not add:** any new review type, approver role, lifecycle state, or publication step. Whether a changed source requires a claim to change is decided where it is decided today.

### 10.3 What the monitor must never do (PROPOSED, binding on Phase A and any later phase)

- Adopt, edit, deprecate, supersede or publish a claim.
- Change CRC eligibility, scope, applicability or dependencies.
- Change a claim's `last_verified`. That date records a human verification.
- State or imply legal clearance or a legal change.
- State or imply that a claim remains valid because its source baseline was accepted.
- Replace existing source evidence.
- Deploy anything.

### 10.4 A coupling to respect (OBSERVED)

Creator Record refuses a claim whose `last_verified` differs from the value its ledger entry was approved against. A human refresh that updates `last_verified` therefore requires Creator Record re-approval for that claim. The monitor does not touch this, and any refresh procedure must account for it.

### 10.5 Security (PROPOSED)

- Exact-URL allowlist; registered redirect steps only; `https` only; no discovered links are followed. This is the control against requests to internal or unintended network targets. A separate address-range filter is not proposed: with no unregistered location ever requested, it would add machinery without closing a further gap in this environment.
- Fetched content is data only. Phase A has no model, so prompt injection has no target; this must be re-examined before any Phase B work.
- Identity checks address redirects and lookalike sites. They do not prove authority; a page can be authentic and no longer controlling.
- Least privilege as in FR-37 to FR-39.
- The repository is public. Anything stored in it is published (OPEN-4).

---

## 11. Dependencies and unresolved decisions

### 11.1 When each decision is needed

| Decision | Before PRD approval | Before first engineering milestone (M1) | Before real retrieval (M4) | Before scheduled pilot (M5) | Outside Phase A |
|---|---|---|---|---|---|
| OPEN-1 Cadence and alert ownership | | | | ✔ | |
| OPEN-2 CRC stale-claim policy | | | | | ✔ |
| OPEN-3 Runway/Higgsfield v2 status and baselines | | | ✔ baseline snapshot choice only, for sources 3 and 4. The pending reviews do not block baseline capture | | |
| OPEN-4 Public or private snapshot storage | | | ✔ | | |
| OPEN-5 Existing monitor and cutover | | | | ✔ | |
| OPEN-6 Automated retrieval restrictions | | | ✔ | | |
| OPEN-7 Authority for baseline acceptance and item closure | DECIDED 2026-11-20 | | | | |
| OPEN-8 Legacy Matrix mapping | | DECIDED 2026-11-20 | | | |
| OPEN-9 Where a no-action disposition is recorded | | | ✔ | | |
| OPEN-10 Run behaviour when the registry awaits confirmation or review | | Before M2 (not needed for M1) | | | |

### 11.2 Open decisions

**OPEN-1 — Cadence by source class and alert ownership.**
The directional PRD says cadence should follow source volatility and gives no values. The existing monitor runs every 3 days for both of its sources. Needed: an interval per source class, a due interval for human-capture sources, the standing-summary interval, the age at which an open item escalates, who receives alerts, and who acts on them.
*Suggested default, not approved:* keep 3 days for sources 1–2; weekly for provider and licence terms; monthly for statutes; quarterly human capture; weekly summary; alerts to the existing monitor recipient.

**OPEN-2 — CRC stale-source and stale-claim policy.**
`CRC_CURRENT_STATE.md` §9.5 records this as unresolved. Treatments discussed there, none approved: visible staleness while still usable; CRC eligibility temporarily withheld; reviewer-only fallback; fail closed from CRC. Phase A reports facts and takes no position. Creator Record's rule is not a precedent for CRC unless a human decides it is. This decision is outside Phase A implementation.

**OPEN-3 — Runway and Higgsfield v2 corrections.**
The 2026-10-26 manifests cite `FGR_030`, `FGR_031`, `CPR_037` and `CPR_038`.

**OBSERVED (2026-11-20, read-only):**
- All four files are preserved, unchanged, in one local commit (`2c7e3580`) on the local branch `preserve/lk-pending-governance-runway-higgsfield-2026-11-20`. That branch has not been pushed: the drafts have no remote backup and are on no remote ref. They also remain as untracked files in the worktree `si8-product-a-spike-1a`. Preserving them was not an approval.
- Each is headed "PM decision: PENDING" and "DRAFT — PENDING". None is approved.
- The baseline at `8690e9a7` represents only `CLAIM-RUNWAY-COMMERCIAL-USE-001-v1` and `CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1`, in the ledger, the runtime fixture and the Creator Record ledger. No v2 exists on any ref.
- Committed evidence (`evidence-captures/runway/MANIFEST.md`) shows a public Runway Enterprise Services Terms document dated June 1, 2026. The v1 Runway claim describes Enterprise terms as "non-public, customer-specific". That phrase is contradicted by the committed capture.
- Both captured Terms state "Last updated October 23, 2026". The v1 claims cite May 11, 2026 (Runway) and July 26, 2026 (Higgsfield). The Higgsfield v1 entry names a change to that date as its own refresh trigger.
- The manifests record that the commercial-use passages each claim quotes match the captured text verbatim, and that no full earlier copy exists, so changes elsewhere cannot be ruled out.

**Still needed:** a PM decision on the four pending reviews, and which snapshot is the accepted baseline for each source.

The pending reviews do not by themselves block an initial source-baseline capture. A first baseline for each source may be accepted while they are pending. It is then accepted with one impact item per v1 claim, each `open` with outcome `governance_action_required` and a reference to the pending review. Those items stay open until that review is decided, and nothing in the monitor may represent a pending review, or a claim it proposes, as approved (FR-31a). Only the choice of baseline snapshot is needed before M4. Whether the v1 claims should change is a governance matter outside this PRD. None of this is needed for M1, which uses empty baselines.

**OPEN-4 — Provider snapshots in a public repository.**
Evidence captures and monitor archives are already committed to a public repository, including full provider terms. Needed: whether to continue, whether to store hashes and diffs publicly with raw snapshots held privately, and any retention limit. FR-15 requires the raw baseline snapshot to be readable where the monitor runs, which constrains the private option.

**OPEN-5 — The existing narrow monitor and cutover.**
Options: keep it running unchanged; pause it; or replace it when the pilot covers its two sources. Keeping it means two systems observe the same sources for a period and its model-drafted packages continue. Pausing it removes the only automated observation SI8 has.
*Suggested default, not approved:* keep it unchanged through M4 and retire it at the M5 gate, when sources 1–2 are observed on schedule by the pilot.

**OPEN-6 — Automated retrieval restrictions.**
Whether automated retrieval of a provider page is acceptable where that provider's terms or robots rules restrict automated access.
*Suggested default, not approved:* check each pilot source before M4; any source with a restriction, or any doubt, is registered as `human_capture`.

**OPEN-7 — Authority for baseline acceptance and item closure. DECIDED for the pilot (SI8 operator, 2026-11-20).**
The named SI8 operator performs monitoring operations, baseline acceptance and impact disposition during the pilot, as three separately recorded acts. Existing governance authorities are unchanged. See §10.2. Authority beyond the pilot remains undecided.

**OPEN-9 — Where a no-action disposition is recorded.**
SOP §7 directs that, until a structured field exists, what was re-confirmed is recorded in prose on the claim's own ledger entry. FR-31 proposes that a `no_governance_action_required` disposition in the monitor's audit history is that structured record. Needed: whether such a disposition must also be noted on the ledger entry. A ledger note is a governed-file edit by a human, and if it changes the claim's `last_verified` it triggers Creator Record re-approval (§10.4).
*Suggested default, not approved:* the disposition record suffices for a change that does not touch the passages a claim rests on; a ledger note is made only when a human re-verifies the claim's source passages and intends to record that.

**OPEN-10 — Run behaviour when the registry is neither valid nor invalid.**
FR-3 says an invalid registry stops the run and no source is observed. M1 has two further states: `VALID_PENDING_CONFIRMATION` (an entry is not yet confirmed) and `REVIEW_REQUIRED` (a mapped claim has been deprecated). FR-3 does not say whether a run may proceed in either state. The intent recorded in §12.2 C.1 is that a routine lifecycle change should not disable observation of unrelated sources, and that a relationship under review is never used for a claim-impact conclusion. Needed before M2: whether observation proceeds in each state, and how a run reports a source whose mapping is unconfirmed or under review. FR-3 is unchanged until this is decided. M1 has no runs and is not affected.

**OPEN-8 — Legacy Matrix mapping. DECIDED (SI8 operator, 2026-11-20).**
The source-to-claim mapping covers governed Living Knowledge claims only. No Matrix row or claim identifier, and no Matrix relationship, is added to the monitoring registry. The reason is the operator's separate decision of the same date to freeze the Legacy Matrix pending retirement, recorded in `06_Operations/institutional-knowledge/notebook/PLATFORM-RIGHTS-MATRIX.md` ("Freeze notice").
Because Matrix claims stay reachable in CRC until each is replaced, the coverage report lists every CRC-eligible Matrix claim as "CRC-reachable, not monitored" (FR-21a, AC-5a). That list is visibility, not monitoring: a change to a source behind a listed claim is not detected by this monitor. See FR-18, FR-20, §6.2, AC-2 and AC-2a.

### 11.3 Dependencies

- The pilot mapping is built by a human reading the ledger and manifests; the cross-checks in FR-20 support that reading and do not replace it.
- Baselines for Runway and Higgsfield need the baseline snapshot choice in OPEN-3, not the review decisions.
- FR-15 needs raw baseline snapshots available to the job (OPEN-4).

---

## 12. Implementation milestones and release gates

M0 to M3 are approved and binding (2026-11-20). M4 to M6 are provisional. No milestone starts without explicit authorization; approval of this document authorizes M1 only. Each milestone is deliverable alone.

| Milestone | Content | Needs first | Gate to pass before the next |
|---|---|---|---|
| **M0 — PRD approval** | This document approved (OPEN-7 decided 2026-11-20) | — | Passed 2026-11-20: the SI8 operator (JD) approved; the sign-off is the "Approval record" at the top of this document |
| **M1 — Registry and mapping contract** | Registry schema; relationship list; six entries with empty baselines; validation; independent cross-checks; coverage report; local fixtures and tests. **No retrieval, no schedule, no alerts, no model calls, no Production change.** | M0 (OPEN-8 decided 2026-11-20). Authorized 2026-11-20 | AC-1 to AC-7 pass, including AC-2a and AC-5a; a named human confirms the mapping for each pilot source |
| **M2 — Observation core on fixtures** | Retrieval logic, registered-redirect rule, extraction, comparison, result model, acceptance and impact records, alert logic; fixtures only, no network | M1 | AC-8 to AC-20 pass |
| **M3 — Boundary proofs** | Static checks, run-time path check, job permission definition | M2 | AC-21 to AC-23 pass |
| **M4 — Manual dry runs** (provisional) | Operator-triggered runs against real sources; no schedule; first baselines accepted | M3; OPEN-3, OPEN-4, OPEN-6, OPEN-9 | Operator reviews each outcome and confirms it is correct |
| **M5 — Scheduled pilot** (provisional) | Schedule and alerts on; UAT scenarios 1–6 | M4; OPEN-1, OPEN-5 | All UAT scenarios pass |
| **M6 — Pilot review** (provisional) | Review after a fixed period | M5 | See §12.1 |

### 12.1 Evidence needed to expand beyond the pilot

- No silent failure during the pilot period.
- A low and explained rate of false `CHANGED` outcomes.
- At least one real change detected, its mapped claims reviewed by hand, and any claim the mapping missed recorded.
- The human-capture path used at least once.
- No impact item left open past the escalation age without an explanation.
- Operator effort per week is acceptable to the operator.

Expansion to more sources is a separate decision. Phase B is a separate decision again and additionally requires OPEN-2 resolved.

### 12.2 M1 implementation contract

This section settles points the requirements left to the implementation. It binds M1. Each item says where it comes from, so that an implementation choice is never read as an operator decision.

**A. Operator directions (LK-SOURCE-MONITOR-FOUNDATION-1, 2026-11-20)**

- **Sixth pilot source:** Kling.
- **Claim identity and lifecycle authority:** the governed ledger is authoritative. The runtime claim fixture may be used for consistency checks and is not an alternative governance authority. No general-purpose prose parser is built.
- **Source scope:** each monitored source has a stable provider or tool identity where applicable (`scope`, §6.1). Mapping validation checks source scope against governed claim scope. Scope is not inferred from URLs or provider names. There is no domain-specific orchestration.
- **Format and location:** the smallest maintainable standalone format, outside the Production application's import graph.
- **Offline validation:** the M1 validation command produces the coverage and consistency report. Real baselines stay empty. Baseline-version mismatch is tested with synthetic fixtures. No source is fetched.

**B. Implementation interpretations made by the implementing CLI in LK-SOURCE-MONITOR-FOUNDATION-1 (not operator decisions when made)**

The first version of this section listed these under "operator directions". That attribution was wrong and is corrected here.

- *Lifecycle:* M1 first rejected every mapped claim that was not `Adopted`, as a validation error. **Replaced** by the rule in C.1.
- *Exclusions of identifiers outside the ledger:* M1 first accepted any well-formed identifier. **Replaced** by the rule in C.2.
- *Human confirmation:* a relationship or exclusion without a named confirmer and date is recorded as proposed; the registry verdict is then `VALID_PENDING_CONFIRMATION`, never `VALID`; the tool never records a confirmation itself. **Retained** under LK-SOURCE-MONITOR-M1-CORRECTIONS-1, which requires this state until a human confirms.
- *Other choices:* a JSON registry under `tools/lk-source-registry/`, run with the application's existing `tsx` dev dependency; the ledger read by the same narrow extraction the existing fixture-consistency guard uses (claim headings and each entry's own `Lifecycle:` line), with anything unreadable failing validation; a relationship from a scoped source to a claim with no runtime representation fails because its scope cannot be checked; CRC eligibility in the coverage report is read from the runtime fixture, because that is what CRC serves. These remain implementation choices and may be changed by a later decision.

**C. Decisions authorized in LK-SOURCE-MONITOR-M1-CORRECTIONS-1 (operator, 2026-11-20)**

1. **Lifecycle.**
   - An `Adopted` governed claim may have an active source relationship.
   - A relationship whose claim has become `Deprecated` (including by supersession) is flagged for review. It is not an active mapping, it is not counted as coverage, and it must not be used for any claim-impact conclusion until a human re-points it to a successor or removes it. It does not make the registry `INVALID`; the verdict is `REVIEW_REQUIRED`.
   - A claim that is not approved (`Candidate`, or any state other than `Adopted` or `Deprecated`) cannot be mapped. An unknown claim ID fails validation. A disagreement between the ledger and the runtime fixture about a mapped claim's lifecycle fails validation.
   - FR-3 is not changed. See OPEN-10 for what is still undecided.
2. **Exclusions.** Every exclusion states a category:
   - `not_a_dependency`: the claim is in the ledger and does not depend on this source.
   - `depends_on_unregistered_source`: the claim is in the ledger and depends on an authority that is not a registered source. It is reported as an uncovered dependency and is not monitored.
   - `not_in_ledger`: the identifier is not a governed claim. It is accepted only where the source's evidence manifest, or another existing repository evidence record named on the exclusion, names that exact identifier. It can never be mapped and is reported as not approved.
   - An exclusion is never coverage, never evidence that a claim is approved, valid or monitored, and is always printed in the report.
3. **Source identity.** Every relationship states how its source is tied to the authority the claim cites:
   - `address_in_ledger`: the source's registered address appears, as a complete address, in the claim's own "Source references" in the ledger. Checked mechanically; a failed check is a validation error. An index page does not match a document published beneath it. An address match is not proof that two documents are the same document, and the report says so.
   - `attested`: the tie cannot be checked mechanically. The named confirmer attests it and the basis note explains why. It is reported as attested, never as verified.
   - Only addresses are read from the ledger. No citation, title or section reference is parsed, nothing is fetched and no model is used.
4. **Pilot registry corrections.** The three relationships from the Copyright Office AI page to `CLAIM-COPY-001-v1`, `-002-v1` and `-003-v1` are removed: those claims cite the Part 2 report, not the index page. The relationship from the Kling Terms of Service to `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1` is removed: that claim cites the Kling Terms of Paid Service, which is not a pilot source; it is recorded as an uncovered dependency. The Copyright Office page and the Federal Register feed stay in the pilot as watch-only sources with no mapped claim. Watching an index page does not establish detection of a change inside a document it links to.

**D. Still awaiting a human**

- **Mapping confirmation.** No relationship or exclusion has been confirmed. The M1 gate is not passed.
- **OPEN-10** (below), before M2.
- Every other OPEN item, unchanged.

---

## 13. Risks and assumptions

### 13.1 Risks

| Risk | Effect | Mitigation in this draft |
|---|---|---|
| False reassurance: "unchanged" read as "still correct" | Stale claims trusted | Outcome wording; non-goals; identity checks do not claim authority |
| Baseline accepted and the change forgotten | A material change is hidden behind later "unchanged" results | Impact items persist until closed by an existing governance record (FR-29 to FR-33) |
| Impact items treated as a governance decision | A parallel process grows | Items hold a status, a short operational disposition and pointers; they cannot substitute for an FGR or CPR; §10.2 |
| One person performs operations, acceptance and impact review | Acts blur; a baseline acceptance is read as a review | Separate recorded acts with actor, date and capacity (§10.2, AC-18b) |
| "No governance action required" read as "claim is valid" | False reassurance | Disposition wording is about the observed change only (FR-33) |
| Open items accumulate and are ignored | The summary becomes noise | Age-based escalation; pilot review gate |
| Extraction noise on dynamic pages | Alert fatigue | Extracted-text comparison, per-class rules, state-change alerts |
| Extraction rule drops material text | Changes go unseen | Old-versus-new comparison on the stored baseline and named acceptance (FR-15 to FR-17) |
| Sources block automated access | Coverage gaps | `BLOCKED` outcome, human-capture class, no evasion |
| Mapping is incomplete | A changed source misses a dependent claim | Independent cross-checks, human confirmation, stated limits, coverage report |
| CRC-reachable Matrix claims are outside monitoring (OPEN-8) | A change to a source behind one of them is not detected by the monitor | Listed on every coverage report with last-verified date (FR-21a); the Matrix is frozen and the list shrinks as claims are retired. The list is not a control: staleness of these claims is managed, as today, by human re-verification |
| Human-capture reminders are ignored | Sources go unobserved | Overdue flag and escalation |
| Two monitors run in parallel | Confusion, duplicate alerts | OPEN-5 |
| Public storage of provider text | Exposure, rights questions | OPEN-4 |
| A registered site redirects somewhere unintended | Unwanted request or stored content | Registered redirect steps only; nothing fetched or stored from elsewhere |
| Refresh pressure collides with Creator Record's re-verification rule | Claims drop out of Creator Record unexpectedly | §10.4 |

### 13.2 Assumptions

- The operator remains a single named human for approvals during the pilot.
- Scheduled jobs in the repository's existing automation continue to be available.
- Pilot sources 3–5 remain fetchable by plain HTTP. If not, they move to `human_capture` and the pilot still holds.
- The six-source pilot is small enough that a hand-built mapping is practical.
- The approval of 2026-11-20 covers what the "Approval record" lists and nothing else. OPEN-1, OPEN-2, OPEN-3, OPEN-4, OPEN-5, OPEN-6, OPEN-9 and OPEN-10 remain open.
