# Validation Ledger — Schema & Identity-Key Findings

**Status:** Schema/documentation authority for `data/validation-ledger.csv`. The CSV is the authoritative row-level data; this file documents its fields and the identity-matching methodology.
**Parent:** `01_Business/product-discovery/COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md`

---

## Purpose

One durable ledger holding both warm qualitative research (`CR-WARM-LEAD-RESEARCH-SPEC.md`) and STEC campaign evidence (`CR-TRACK-A-B2B-READINESS-SPEC.md`, `CR-TRACK-B-CREATOR-READINESS-SPEC.md`), keyed so the two can be queried together without merging into a substitute CRM. Raw evidence is never rewritten into a stronger claim than the source supports.

## Fields (`data/validation-ledger.csv`)

| Field | Notes |
|---|---|
| `lead_name` | |
| `b_id` | `CRM.md`/crm-core B-ID if one exists; blank if not yet in CRM |
| `company` | |
| `role` | |
| `geo` | |
| `track` | `A`, `B`, or `A+B` — see Track B spec on dual-logging |
| `track_a_maturity_basis` | **Added 2026-08-30 (PMM).** Required for any `track` including `A`. Source-grounded reason the lead qualifies for Track A (quoted/cited evidence, not inferred from title). Blank = insufficiently qualified for Track A even if contacted under a Track A campaign. |
| `wave` | **Added 2026-08-30.** Which send wave this evidence point belongs to, e.g. `warm`, `track-a-wave-1`, `track-b-wave-1`. |
| `source` | `warm` or `stec` |
| `campaign` | Dripify campaign name if STEC-sourced |
| `alias` | Contacting alias for this evidence point |
| `prior_alias` | Any earlier alias(es) that contacted this lead, comma-separated |
| `prior_signal` | One-line summary of pre-existing signal, if any |
| `provenance_maturity` | Free text — what the lead already does for RECORD/evidence capture |
| `commercial_readiness_step_exists` | Y/N/Unclear |
| `decision_owner` | Who determines readiness today, per the lead |
| `current_process` | Free text |
| `current_substitute` | Named tool/workflow if any — feeds competitor-escalation trigger |
| `legal_ba_involved` | Y/N/Unclear |
| `client_requirement` | Y/N/Unclear — is the client the one requiring this |
| `pain_stated` | Y/N |
| `pain_type` | e.g. slow / costly / blocking / uncertain |
| `time_cost_evidence` | Free text — any quantified time/cost mentioned |
| `crc_offered` | Y/N. **Critical denominator gate (PMM correction 2026-08-30):** every field below is scored against `crc_offered=Y` only. A respondent with `crc_offered=N` (never reached the offer stage) is not scoreable as negative Track B evidence — see Track B spec §"Interpretation boundaries." |
| `crc_offer_reason` | **Added 2026-08-30.** Why offered or not-yet-offered, e.g. `substantive-response-reached`, `conversation-ended-before-offer`, `not-yet-contacted` |
| `crc_ref_code` | **Added 2026-08-30.** The opaque `?ref=` attribution code used on the tagged CRC invitation link sent to this lead, if any. Joins to `crc_sessions.acquisition_ref` — see §"CRC attribution" below. |
| `crc_started` | Y/N |
| `crc_completed` | Y/N |
| `crc_useful` | Y/N/Unclear |
| `decision_changed` | Y/N/Unclear — did CRC output affect a real decision |
| `repeat_use_intent` | Y/N/Unclear — stated or observed intent to use CRC again / check another project |
| `commercial_assurance_escalation` | Y/N/Unclear — did the lead move toward or express interest in the paid Commercial Assurance product |
| `call_accepted` | Y/N |
| `willingness_to_pay_evidence` | Free text |
| `likely_buyer` | Free text — who the lead indicates would actually pay |
| `payment_model_evidence` | Free text |
| `response_classification` | One or more of A–H (Track A codes) or funnel stage (Track B) |
| `evidence_strength` | `direct-quote` / `paraphrase` / `inferred` — never upgraded without a stronger source |
| `verbatim_quote` | Exact text, not paraphrased |
| `source_file` | Path to the file the evidence came from |
| `linkedin_url` | See identity-key section below |
| `identity_match_confidence` | `confirmed` / `unique-match` / `ambiguous` / `unresolved` / `not-applicable` |
| `identity_match_method` | How the match was made, e.g. `exact-name+company`, `compound-name-company-alias-date`, `N/A-direct-relationship` |
| `identity_match_status` | `matched` / `unresolved` / `ambiguous` / `not-applicable` — the resolution outcome, distinct from confidence (which qualifies match strength) |
| `follow_up_needed` | Y/N + note |
| `notes` | |

**Status as of the Phase 1 backfill run (2026-08-30):** `data/validation-ledger.csv` is populated with the 16 named warm-lead candidates — see §"Backfill run #1 results" below. Fields requiring a new conversation (funnel/classification fields) are left blank where no pre-existing quote directly supports them; populated only where source-grounded.

---

## Identity-key coverage findings (required per Strategic OS, 2026-08-30)

**Chosen stable identity key: LinkedIn profile URL**, per Strategic OS instruction. Findings below are from direct inspection of the actual source files (not assumed):

| Dataset | LinkedIn URL coverage | Evidence |
|---|---|---|
| `data/supabase-exports/*.csv` (response-level records) | **100%** | `lead_linkedin_url` column present; verified 659/659 rows filled in the most recent export (`supabase-export-2026-07-17.csv`) |
| `03_Sales/standing-encore/send-lists/*.csv` (SE-001 target lists) | **100%, by construction** | `Linkedin url` / `LinkedIn` column is a required field of the Sales Navigator extraction SOP |
| `03_Sales/CRM.md` (canonical 171-row pipeline tracker) | **0%** | No LinkedIn URL field exists in the table schema at all (confirmed: zero `linkedin.com/in` occurrences anywhere in the file) |
| `03_Sales/crm/*.md` (crm-core graduated records, e.g. `anchor-film.md`) | **0%** | Frontmatter schema (per `tools/crm-core/docs/CRM_SPEC.md`) has no `linkedin_url` field; confirmed absent in the live `anchor-film.md` record |
| `data/dripify-campaigns.csv` | Not applicable | Campaign-level aggregate rows only — no per-lead identity data of any kind |

**The gap that matters:** `CRM.md` is exactly the file used to identify and verify all 16 warm-lead candidates in `CR-WARM-LEAD-RESEARCH-SPEC.md`, and it has zero machine-checkable identity keys. The datasets that *do* have 100% coverage (Supabase exports, SE send-lists) are keyed by name/company/date, not by B-ID — so resolving a CRM.md lead to a LinkedIn URL requires a join, not a lookup.

### Proposed safest deterministic fallback (methodology only — not yet executed)

For each CRM.md lead needing a LinkedIn URL:
1. Search the Supabase export corpus for rows matching on **name + company + alias + approximate contact date** (compound key).
2. If **exactly one** row matches all four fields → accept as `unique-match`, populate `linkedin_url`.
3. If **zero or two-or-more** rows match → do not guess. Mark `identity_match_confidence = ambiguous` (2+ candidates) or `unresolved` (0 candidates), and flag for manual review. Never merge two similarly-named records without a positive unique match.
4. Live example this rule is designed to catch: "Florent Delavous" appears twice, independently, within the same alias's own Germany warm-lead list in the Jul 17 campaign report — a name-only match would have silently conflated or duplicated this lead.

**Authorized and run, 2026-08-30 (Phase 1).** Script: `03_Sales/validation/scripts/identity-backfill.py` — read-only against `data/supabase-exports/*.csv` (5,196 total response rows across 11 export files), does not modify `CRM.md`, crm-core, or any export. Matching used name-variant lookup against `lead_name`, disambiguated by `lead_company`/`alias_profile` where multiple candidates existed; only a unique-URL outcome was accepted automatically.

### Backfill run #1 results (16 named candidates)

| Result | Count | Candidates |
|---|---|---|
| Unique match | 15 | Ibrahim Badi, Ivan Petruzzelli, Hugo Barbera, Jian Yi Lay, Jean Delaunay, Piotr Nierobisz, Ramez Tabshi, William Finkel, Matthew Sergison-Main, Nikolay Kolev, Teddy Sandu, Daniele Zennaro, Justin Lufair Brown, Dan Lantry, Jon Draper |
| Not applicable | 1 | Alice Feng — confirmed non-Dripify direct relationship; zero rows in the Supabase corpus, correctly so, not a matching failure |
| Ambiguous / unresolved | 0 | — |

**Methodology finding — a false ambiguity, corrected before reporting:** the script's first run flagged Justin Lufair Brown as ambiguous (2 distinct URLs) because its loose substring-matching rule ("justin brown" as a variant) also pulled in an unrelated person: "Justin Brown" at Ether Labs LLC (`https://www.linkedin.com/in/justin-brown-profile`, response dated 2026-05-10). Re-run requiring the full three-word name ("Justin Lufair Brown") isolated exactly one row: `https://www.linkedin.com/in/jlufair` at Amazon (response dated 2026-04-30) — matching the candidate's known company/role. Recorded as `identity_match_method = exact-full-name+company (corrected)` in the ledger. **Lesson for any future run at STEC-candidate-pool scale: name-variant substring matching is unsafe without a company/context check even when it "resolves" to a single URL — verify the match is on the full name, not a partial that happens to be unique in a small sample.**

**Teddy Sandu — apparent employer conflict resolved, not a matching problem.** The Supabase record captured at original contact time shows "McCann Singapore (Team Unilever @Omnicom)" — consistent with the `CRM.md` static table entry. Three independent later sources (2026-06-27 and 2026-07-18 pipeline analyses, and the live `SALES-PIPELINE.md`) consistently show "MullenLowe Singapore (IPG)". Read together, this is a real employer change over time, not contradictory data — `CRM.md`'s row is simply stale. Resolved as **current employer = MullenLowe Singapore (IPG)**, not flagged HOLD. `CRM.md` itself is not edited (out of scope for this pass).

### Recommendation: is this mechanism safe for STEC candidate-pool construction?

**Conditionally yes, with one required change before scaling up from 16 to hundreds of candidates:** exact full-name matching (not partial/substring) against `lead_name`, cross-checked against `lead_company` wherever more than one candidate shares a name, exactly as the corrected Justin Lufair Brown case demonstrates. At 16 candidates this was recoverable by inspection; at STEC list-construction scale (hundreds of names) a silent substring false-positive would not be manually caught the same way. Recommend the production version of this script assert on exact-name match only, treat substring/fuzzy matches as `identity_match_status = ambiguous` requiring manual review rather than auto-accepting a unique URL, and log every match's matching method for audit. With that guardrail, the underlying data (100% `lead_linkedin_url` coverage in the Supabase corpus) supports reliable alias-contamination checking at STEC scale.

## CRC attribution (implemented 2026-08-30, Strategic OS-authorized)

**Gap this closes:** the CRC observability audit found `attribution_token` is outbound-only (session → Calendly). There was no inbound link from a CRC session back to the validation-outreach source that sent someone there — every CRC completion was anonymous, unattributable signal. This was the audit's one "D — requires new instrumentation" finding and a launch dependency for CR-Track B.

**What changed (minimal, additive, no redesign):**
- **Migration** `08_Platform/app/supabase/migrations/20260830000000_crc_acquisition_attribution.sql` — two new nullable `TEXT` columns on the existing `crc_sessions` table: `acquisition_ref`, `acquisition_lead_id`. No new table, no change to any existing column, no RLS change (service_role already bypasses RLS on this table).
- **URL/tag design:** `?ref=<campaign-or-experiment-code>&lead=<opaque-internal-lead-id>` on the `/crc` link, e.g. `app.superimmersive8.com/crc?ref=cr-track-a-wave1&lead=B087`. Both are opaque codes only — `ref` is a wave/campaign slug, `lead` is a CRM B-ID. **Never** a name, email, or LinkedIn URL — enforced server-side, not just by convention (see sanitization below).
- **Client** (`08_Platform/app/app/crc/page.tsx`): reads `ref`/`lead` from `window.location.search` once on mount, stores in a ref, sends them on every `/api/crc/turn` POST (harmless on non-creation turns — same pattern the existing `restart` flag already uses).
- **Contract** (`08_Platform/app/lib/crc-engine/api-contract.ts`): `TurnRequestBody` gains optional `acquisitionRef`/`acquisitionLeadId`; a new `sanitizeAcquisitionCode()` allowlists `^[A-Za-z0-9_-]{1,64}$` and silently drops (never errors) anything else — an email address, a real name, or an over-length string is dropped before it ever reaches the database, not merely discouraged.
- **Persistence** (`08_Platform/app/lib/crc-engine/supabase-session-store.ts`, `08_Platform/app/app/api/crc/turn/route.ts`): `CrcSessionCreationMeta` gains the two fields; written **once**, in the existing `isNewSession` branch, in the same `saveCrcSessionCreationMeta()` call that already writes `attribution_token` — no new write path, no new timing.

**Ledger join:** no new app code reads these columns back into any API response or the browser — this is write-path only, matching the "smallest durable" instruction. Joining `data/validation-ledger.csv` against real attribution data happens via a future Supabase Table Editor export of `crc_sessions` (same manual-export workflow already used for `linkedin_responses` → `data/supabase-exports/*.csv`), matched on `acquisition_lead_id = ledger.b_id` or `acquisition_ref = ledger.wave`.

**Privacy/security considerations:** allowlist-based sanitization (not blocklist) means the failure mode for an unexpected input is "attribution silently lost for this session," never "unexpected data written" — a session with a malformed/missing ref completes normally with `acquisition_ref = NULL`. No PII path exists into either the URL or the database via this mechanism.

**Test evidence (2026-08-30):**
- `npx tsc --noEmit` — clean, exit 0, across the whole platform app (not just touched files).
- Existing suite: `npx jest __tests__/crc-engine` — 600/601 passing after the change; the 1 failure (`subsystem-boundaries.test.ts`, an unrelated Anthropic-import-boundary assertion) reproduces identically with these changes stashed, confirmed pre-existing via `git stash`.
- New suite `08_Platform/app/__tests__/crc-engine/acquisition-attribution.test.ts` (9 tests, all passing): `parseRequest()` correctly threads valid opaque codes through on every request kind, and correctly drops an email address, a real name (contains a space), an over-length string, and a non-string value — confirming sanitization survives the exact PII shapes that would be a real mistake to leak. A second block confirms `saveCrcSessionCreationMeta()` writes `acquisition_ref`/`acquisition_lead_id` through to the underlying `.update()` payload unchanged (including explicit `null` when absent, never a silently-omitted column) — i.e. attribution survives the full session-creation write path end to end at the unit level.
- **Not tested:** a live end-to-end run against a real Supabase project (would require deploying the migration and hitting the live `/api/crc/turn` route) — out of scope for this validation-preparation pass; flagged as an open item before the first tagged CRC invitation is actually sent.

## Campaign-name suffix → alias mapping (verified, execution-binding)

Added 2026-09-04 following the CR Wave 1 execution QA. A same-alias contamination check reads the trailing `_XX` suffix on a Dripify campaign name to identify the sending alias. The verified mapping:

| Suffix | Alias | Notes |
|---|---|---|
| `_JC` | **JD** (JD Chang) | **JD's historical suffix is `_JC`, not `_JD`.** `_JD` does not occur in any campaign in `SI8 Rights Verified Master 090126.txt` or `data/supabase-exports/*.csv`. Confirmed against `03_Sales/outreach/LINKEDIN-CAMPAIGNS-LEGAL-TEAMS-V1.md`, `03_Sales/CAMPAIGN-QUEUE.md`, `03_Sales/outreach/LINKEDIN-ICP-REPORT-2026-06-09.md`. A future JD-run campaign must treat any prior `_JC` contact as a same-alias block. |
| `_VP` | Vanessa Pan | Current live alias |
| `_AL` | Angel | Current live alias |
| `_IL` | Ivy | Legacy — does not block JD/Vanessa/Angel, but is logged as prior-contact history |
| `_LH` | Lilly | Legacy / retired (dead) — cannot be an assigning alias again; still logged as prior-contact history |

Supabase response rows additionally carry an explicit `alias_profile` field (`Ivy`/`Vanessa`/`Lilly`/`Angel`/`JD`) — use it as an independent cross-check. `csr_name` (`JD_StandingE`) is the Standing Encore operator account, **not** the sending persona.

## Alias-contamination rule (restated, execution-binding)

- A lead **must not** be assigned to the same LinkedIn alias that previously contacted them.
- **Lilly = inactive/dead alias.** Prior Lilly contact still counts as contact history (blocks nothing new by itself, but must be logged, not treated as a fresh lead).
- A previously contacted lead **may** be assigned to a different live alias (Ivy, Vanessa, Angel, JD), subject to dedup and general campaign rules.
- Prior contact identification uses **both** the campaign-name suffix (mapping above) **and** the Supabase `alias_profile` field.
- Name-only matching is insufficient where a LinkedIn URL is available — see coverage table above.
- Raw campaign exports (`data/supabase-exports/*.csv`, `data/dripify-campaigns.csv`) are never modified or overwritten by ledger construction.

## Dripify sourcing vs. actual outreach contact (added 2026-09-11, Strategic OS clarification)

**Operational fact, going forward:** JD's Dripify account is sometimes used to **source Sales Navigator lead lists**, not only to run outreach. A lead can appear inside a JD Dripify campaign/list — and therefore inside `data/dripify-campaigns.csv` or a campaign-name-suffix match against the master — even though JD never sent that lead a connection request, a LinkedIn message, or any other outreach.

**Consequence: Dripify campaign membership ≠ prior alias contact.** Every same-alias contamination check performed to date in this program (the JD Wave 1 "0 prior-JD conflicts" finding in `SI8_CR-TrackA-B_JD_Wave1_QA.md` §3.4; the "current JD 114" exclusion in `CR-A2-B2_POPULATION-QA.md` §3; the Angel/Vanessa prior-contact exclusion counts in the same file) was built on **list membership** (campaign-name suffix + Supabase `alias_profile` presence), not verified send. This is a real methodology gap: some exclusions may have been overcautious (a lead excluded as "already contacted" when they were only ever sourced, never messaged), and — separately, in the other direction — genuine outreach occurring outside a logged send-campaign structure would not be caught by this check at all.

**Methodology going forward:**
- Same-alias re-contact restrictions should be based on **verified actual outreach** wherever the evidence permits distinguishing a sourcing-only list from a send campaign (e.g., a Dripify campaign with zero recorded connection-request/message activity, or a Supabase response row — a response can only exist if outreach happened).
- **Do not automatically rebuild or alter already-approved/live cohorts** (JD Wave 1 Track A/B, A2, B2) solely because of this clarification, unless actual contamination is discovered on inspection or Strategic OS explicitly authorizes a cohort change.
- **Known execution/tooling issue, tracked separately, not a cohort-construction defect:** Dripify's own "already in another campaign" suppression behavior may block a lead from being added to a new send campaign because they appear in an earlier *JD sourcing* campaign — even though JD never contacted them. If this is observed (e.g., against the JD Track A Wave 1 list), it is a **Dripify tooling/UI issue to work around at send time**, not evidence that the underlying Track A cohort was improperly constructed by the methodology above.
