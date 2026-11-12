---
title: SI8 Creator Record — Prospect Research Methodology and Operating Standard
version: 0.1
status: SUPERSEDED by 03_Sales/validation/CR-PROSPECT-RESEARCH-STANDARD-v0.2.md (2026-11-12). Preserved unmodified below this header. Was PROPOSED — never approved.
as_of: 2026-11-12
owner: SI8
scope: Creator Record message-fit prospect sourcing
parent: 01_Business/product-discovery/COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md
---

> **Repository integration note (2026-11-12):** filed from the operator-supplied draft `SI8_CREATOR_RECORD_PROSPECT_RESEARCH_STANDARD_v0.1.md` with minimal corrections, listed in §13. Labels used below: **[HISTORICAL]** = documented past practice; **[OBSERVED]** = reported R1/R2 research findings; **[PROPOSED]** = operating requirement not yet approved; **[OPEN]** = unresolved policy decision. Every workbook and file named here is **external to this repository** (local operator files) unless a repository path is given. This repository is public, so prospect-level data (names, profile URLs, per-person evidence) stays in the external workbooks and is never committed here.

# SI8 Creator Record — Prospect Research Methodology and Operating Standard

## 1. Purpose and decision boundary

This standard governs discovery, qualification, evidence review, historical deduplication, research reporting and preparation for outreach clearance of prospective commercial AI-video practitioners. It is an operating methodology, **not** a product software PRD and **not** authorization to contact prospects. It may be adapted to future SI8 research only through an explicit versioned decision.

**Authority boundaries:** Research qualification establishes a documented connection to qualifying commercial AI-video work; it does not establish licensing problems, buying intent, decision authority, legal clearance, prior-contact clearance, or eligibility for outreach. An operational suppression review and operator authorization are separate gates. No downstream export, randomization or campaign launch may imply clearance absent those gates.

Unless marked otherwise, §§4–10 are **[PROPOSED]** operating requirements.

## 2. Experiment being supported

**[PROPOSED — operator-supplied]** Creator Record is being tested through two LinkedIn message-framing arms from Angel's account. These arm definitions come from the operator; no repository document defines them yet, and they are distinct from the earlier CR-Track A/B validation tracks (`03_Sales/validation/CR-TRACK-A-B2B-READINESS-SPEC.md`, `CR-TRACK-B-CREATOR-READINESS-SPEC.md`), which were audience tracks, not message arms.

- **A — Mid-production:** uncertainty about whether tools, images or AI outputs already used in a client video are commercially suitable.
- **B — Pre-production:** how practitioners check models, tools and source assets against commercial-use requirements before client work.

The **target population and qualification standard are identical** for both arms; messages 2–4 are shared. A/B means *message treatment*, not role, workflow stage or audience segmentation. The target is 200 eligible prospects, ultimately 100 per arm. Assignment must occur **only after qualification, operational clearance and a documented population freeze**, using a recorded reproducible random seed. Do not assign arms during sourcing or use historical PRE/DURING/POST labels as occupational groups.

Creator Record concerns organization and assessment of supporting project records and unresolved commercial-use checks; it is not automatic legal clearance, legal advice or certification. SI8's human-reviewed Commercial Assurance Assessment is a distinct higher-assurance service.

## 3. Historical evidence and current status

**[HISTORICAL]** The historical CRC Lifecycle sourcing process was project-first: discover real named commercial AI-video work, trace individually credited contributors, grade attributable evidence, and screen historical overlap. The v24 freeze comprised 300 people (166 Grade A, 134 Grade B; four legacy Grade C moved to a conditional reserve). Its PRE/DURING/POST arms were randomized message treatments (simple deterministic randomization, no network balancing). Source: external `SI8_CRC_Lifecycle_R1_v24_Frozen_Randomized_2026-10-09.xlsx`, sheet "Freeze Authorization"; corroborated by the per-respondent experiment-identity notes in `03_Sales/crm/`. Historical search queries were not preserved.

**[HISTORICAL → PROPOSED change]** v24 limited historical exclusion to previously *accepted* SI8 connections and permitted unanswered invitations (same source). v24 also randomized at freeze, before operational outreach clearance ("Outreach NOT AUTHORIZED — launch QA required"). This standard proposes **not** inheriting either: previously invited non-acceptors are not treated as fresh, and assignment follows operational clearance (§2, §7). Both are deliberate departures pending operator approval, not corrections of the historical record.

**[OBSERVED]** Research reports supplied on 2026-11-12 state the following. The figures were checked against the external R1/R2 workbooks' "Population Quality" sheets:

| Metric | R1 | R2 | Interpretation |
|---|---:|---:|---|
| Selected research-qualified | 20 | 30 | 50 combined, before operational clearance |
| Named people screened | 79 | 69 | Denominators were defined differently; yields not directly comparable |
| Selected yield | 25.3% | 43.5% | Not evidence of faster sourcing |
| Grade A selected | 20 | 30 | All 50 graded A by Work; not independently third-party audited |
| Distinct projects represented | 12 | 14 R2 projects new to R1 | Project and network overlap still require tracking |
| Outreach-cleared | 0 | 0 | Current operational suppression unresolved |

Five R1 records were re-examined in R2 and retained Grade A: candidate IDs CRR1-005, CRR1-010, CRR1-042, CRR1-060 and CRR1-075 (R2 workbook, sheet "R1 Independent Audit"; names kept out of this public repository). This was a second-pass review by the same research process, not an independent third-party audit. The R2 report states 13 production networks new to R1 and notes one delivery team contributed six R2 prospects. R1 also reports **0** personal LinkedIn profile pages directly inspected: all 20 identities rest on public-index or cross-link corroboration, because direct retrieval was blocked. R2's 25 holds include network-**cap** holds, a research-time practice that is not approved policy (§11). These are **reported workbook/research findings**, not an independent verification of all underlying external sources. Retain the R1 and R2 workbooks as source artifacts, not as an outreach-ready list.

## 4. Inclusion and exclusion

### Qualifying project

A named, real commercial production involving meaningful AI-generated or AI-assisted **moving imagery**, with credible evidence of the commercial context. Record project category separately:

1. Third-party commissioned client work (priority ICP evidence).
2. Brand's own promotional commercial production.
3. AI-tool vendor promotional production.
4. Other qualifying commercial production.
5. Unresolved (HOLD pending clarification).

Do not automatically exclude categories 2–4, but analyze them separately and avoid allowing vendor promotions to dominate the target population. Do not treat an AI-themed conventional VFX project, static imagery alone, a speculative fictional-brand film or a generic service claim as sufficient.

### Qualifying person

An identifiable individual with attributable **meaningful production responsibility** on the qualifying project. Eligible roles can include directors, creative directors, producers, AI artists, editors, post-production leads, creative technologists and hands-on studio founders. A person need not personally operate an AI model; do not infer they did. Company employment, a repost, account management or client-side procurement alone is insufficient.

Record full name, stable candidate ID, normalized personal LinkedIn URL, role, current and project-time affiliations where supported, project, client, contribution, professional geography and basis, evidence IDs, verification date, research status and operational clearance status. Ambiguous identity or missing personal LinkedIn verification is HOLD, never a fabricated URL.

## 5. Discovery workflow

1. **Find projects:** search public ad-trade publications, agency/studio cases, brand announcements, credits, interviews and creator portfolios for real commercial AI-video productions. Log the *actual* query, search date, result/source and project disposition.
2. **Verify projects:** confirm real commercial context and qualifying AI-generated moving imagery; distinguish original source from syndication or repeated press releases.
3. **Trace people:** identify named contributors and their specific credited responsibilities, not merely employees of the credited organization.
4. **Resolve identity:** match individual to a personal LinkedIn profile using direct access where available or attributable indexed/cross-linked evidence; explicitly mark access restrictions and uncertainty.
5. **Grade evidence:** link evidence IDs to the exact proposition each source supports.
6. **Deduplicate/screen:** normalize LinkedIn slugs; review plausible name/affiliation aliases manually; log historical overlap and provenance.
7. **Select and report:** retain selected, reserve, HOLD and EXCLUDE records, with reasons. Do not silently discard unsuccessful searches.

Search internationally, but do not infer residence or nationality from a company address or LinkedIn subdomain. Track project/studio/network correlations and seek breadth without inventing unsupported quotas.

## 6. Evidence and decision rules

**Grade A:** An attributable source independent of the individual—client, agency, production participant or credible credit publisher—corroborates the **named project and that individual's meaningful role**. A project-only article does not validate an individual's credit. Several articles repeating one press release are not independent corroboration.

**Grade B:** An attributable first-person portfolio, post or interview establishes named commercial work and meaningful personal participation, but Grade A corroboration is absent.

**HOLD:** Material uncertainty in identity, personal profile, commissioning/commercial status, AI-generated motion, individual role, evidence attribution or historical identity match. Record the exact missing evidence and next verification step.

**EXCLUDE:** Evidence demonstrates failure of a criterion or an authoritative suppression restriction. Record why. Historical research presence alone is not proof of actual contact; an active protected assignment can nevertheless exclude someone from a fresh campaign.

No Grade C candidates in the selected cohort. Separate `research_decision`, `evidence_grade`, `historical_match_status`, `operational_contact_status` and `outreach_clearance` fields. A Grade A label never implies legal rights, commercial safety or outreach eligibility. Record commercial-context classification and tool-use verification separately.

## 7. Historical suppression and operational clearance

Research screening must compare the candidate against all available historical SI8 research and campaign populations, including CRC Lifecycle v24 PRE/DURING/POST (300 roster entries), Product A Angel (79 roster entries), other Commercial Readiness/Creator Record campaigns, and known responses/opt-outs. The other campaigns include the CR-Track A/B (JD), A2 (Angel) and B2 (Vanessa) Wave 1 lists, documented in `03_Sales/validation/SI8_CR-TrackA-B_JD_Wave1_QA.md` and `SI8_CR-TrackA2-B2_Wave1_FINAL-QA.md`, and the Standing Encore SE-001 lists (`03_Sales/standing-encore/`). Known responses and opt-outs are in `03_Sales/CRM.md` and `03_Sales/crm/`. These entries can overlap; do not equate roster size with unique people or delivered messages. Record source version/date, match key, confidence, status and limitations.

Operational clearance requires the most current authoritative available records covering **sent invitations, sent messages, pending/queued assignments, accepted connections, existing relationships, opt-outs, negative responses and sender aliases** across relevant CRM, Dripify and other SI8 systems. Preserve timestamps and evidence. A no-match finding in archived files means only *no match in checked sources*. Never interpret it as never contacted.

**Fail closed:** where current coverage is incomplete, mark `OUTREACH_CLEARANCE_PENDING`. No Dripify export, contact action, A/B assignment or campaign launch. Do not modify CRM or contact records without separate authorization. Confirmed opt-outs are ineligible. Protected prior assignments must not be reassigned without explicit operator decision.

## 8. Network breadth and research efficiency

Track project IDs, company/studio IDs and shared network edges; count unique projects and networks using consistent definitions. Report largest project/team share and correlated clusters. Avoid sourcing only additional people from an easy-to-find team. Do not claim statistical representativeness from convenience sampling.

Standardize the funnel for every future tranche:

- `discovered_person`: unique named individual identified from a logged project/source.
- `investigated_person`: unique individual for whom a recorded qualification/identity/suppression decision was attempted and dispositioned. Count once per tranche; preserve cross-tranche identity links.
- `selected_qualified`: Grade A/B, inclusion criteria met, not an established protected/previously contacted candidate; **outreach may still be pending**.
- `reserve_qualified`, `hold`, `exclude`: distinct terminal research dispositions with reasons.

Report numerator/denominator and any missing data. Log observed work time only if actually measurable; never fabricate active research minutes. Compare R1/R2 yields only with a methodology caveat; do not retroactively rewrite old denominators to create apparent improvement.

## 9. Required data artifacts and provenance

Maintain an auditable workbook or structured register with at least: (1) Qualified Prospects; (2) Commercial Projects; (3) Evidence Audit; (4) Discovery Log; (5) Suppression Audit; (6) Population Quality; (7) Research Methodology. Preserve R1/R2 IDs and original values; amendments must be versioned or appended with reason, date and reviewer. Every Grade A/B decision should be traceable from candidate → project → role-specific evidence → source URL. Keep full URLs and access dates. Do not represent inaccessible pages as directly inspected.

**Data location:** prospect-level registers stay in the external research workbooks. This repository is public: only aggregate counts, candidate IDs and methodology are committed. This follows the existing CRM practice of noting that "no roster data was copied here."

**Import integrity (launch QA):** any future Dripify import file must match the frozen, cleared audit register person-for-person by normalized LinkedIn URL, with no additions. This follows the historical practice in `03_Sales/validation/SI8_CR-TrackA2-B2_Wave1_FINAL-QA.md`.

Before expanding beyond a tranche, review evidence quality, historical matches, source gaps, project/network concentration, role balance, commercial-context mix and research yield. A research GO is never an outreach GO.

## 10. Current gates and next milestone

**[OBSERVED] Reported research evidence, not yet operator-accepted:** R1 20 + R2 30 selected candidates, pending operator quality review. Five R1 cases survived Work's second-pass evidence check.

**Open gates:** current operational suppression and contact-history reconciliation for all 50; unresolved historical matches; continued network concentration review; consistent investigated-person denominator; eventual freeze/randomization protocol.

**Recommended next research milestone:** R3, up to **50 additional** research-qualified people, prioritizing projects and production networks not represented in R1/R2. R3 must apply the standardized funnel and retain all holds/exclusions. In parallel, run a separately authorized current operational suppression audit on the existing 50. Do not assume 100 researched equals 100 contactable.

**Scale gate:** After R3, review combined population quality and operational suppression coverage before authorizing the remaining 100 research prospects. **Launch gate:** current operational clearance, verified eligible pool, documented freeze, seeded 100/100 assignment, final QA and explicit operator authorization.

## 11. Change control and open decisions

This v0.1 is a **proposed** standard until the operator explicitly approves it; being filed in the repository is not approval. Changes require an explicit versioned rationale and should not silently revise historical evidence.

**[OPEN] decisions:**
- exact suppression-system authority and coverage dates;
- formal approval of the two proposed departures from v24 (§3);
- final allowable proportion of vendor/brand promotional work;
- whether and how to cap highly correlated project networks (R2 applied cap holds without an approved rule);
- target markets, if any;
- final randomization/balance checks, including whether network-correlated people are balanced across arms;
- the Creator Record attribution mechanism, if any. Historical CRC campaigns used unique `?ref=` codes; none is defined for Creator Record;
- operator confirmation of the A/B arm definitions (§2). These are not implied by R1/R2 evidence and must not be invented by an implementer.

## 12. Source-of-truth references

**External (local operator files, not in this repository):**
- `SI8_Creator_Record_Prospect_Calibration_R1.xlsx` — original calibration and supporting logs.
- `SI8_Creator_Record_Prospect_Research_R2.xlsx` — combined research, R1 five-case audit and R2 logs.
- Historical CRC Lifecycle v19/v23/v24 records: `SI8_CRC_Lifecycle_v19_Population_Quality.md`, `SI8_CRC_Lifecycle_v23_Population_Quality.md`, `SI8_CRC_Lifecycle_v23_Evidence_Audit.csv`, `SI8_CRC_Lifecycle_R1_v23_Milestone_300.xlsx`, `SI8_CRC_Lifecycle_R1_v24_Frozen_Randomized_2026-10-09.xlsx`, `SI8_CRC_Lifecycle_R1_v24_Assignment_2026-10-09.csv`.
- Historical rosters: `SI8_Product_A_Angel_79_FINAL_IMPORT_PREPARED_2026-10-15.csv` and `SI8_CRC_Lifecycle_R1_v24_{PRE,DURING,POST}_Dripify_PRELAUNCH.csv`.
- Operator-supplied R1/R2 Work final reports dated 2026-11-12.

**In this repository:** `01_Business/product-discovery/COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md` (parent), the `03_Sales/validation/` QA documents cited in §§7 and 9, `03_Sales/CRM.md` and `03_Sales/crm/`.

Where a source is unavailable in the repository, record it as an external reference, not a verified repository file path. Never claim the operational suppression gate has passed merely because archived research files were checked.

## 13. Repository integration corrections (2026-11-12)

Minimal changes from the operator-supplied draft:

1. Status reworded so that filing in the repository is not read as approval (front matter, §11).
2. Added the [HISTORICAL]/[OBSERVED]/[PROPOSED]/[OPEN] labels and the external-file note.
3. §2 marks the A/B arm definitions as operator-supplied, with no repository authority, and distinguishes them from the earlier CR-Track A/B audience tracks.
4. §3 replaces "reportedly" with the verified external freeze source. It also records v24's freeze-before-clearance ordering, and labels both departures from v24 (non-acceptor exclusion; clearance before assignment) as proposed changes, not historical corrections.
5. §3 replaces five prospect names with candidate IDs (public repository). It also adds two workbook facts the draft omitted: 0 LinkedIn pages directly inspected in R1, and R2 network-cap holds.
6. §7 names the in-repository records of the other campaign lists to suppress against.
7. §9 adds the data-location rule and the import-file integrity check (historical practice).
8. §10 changes "Accepted as research evidence" to "reported, not yet operator-accepted."
9. §11 adds open decisions for the v24 departures, network caps, arm balance, Creator Record attribution and A/B confirmation.
10. §12 separates external files from repository paths.

No R1/R2 figure was changed; all were checked against the workbooks' "Population Quality" sheets.
