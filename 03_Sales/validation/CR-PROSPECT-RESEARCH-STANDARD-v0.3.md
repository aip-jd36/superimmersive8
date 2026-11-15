---
title: SI8 Creator Record — Prospect Research Methodology and Operating Standard
version: 0.3
status: PROPOSED — incorporates operator policy decisions D1–D8 (2026-11-12) and the simplified operational suppression policy approved 2026-11-15 (revised D7). The standard as a whole still awaits formal adoption. Repository presence is not approval.
supersedes: 03_Sales/validation/CR-PROSPECT-RESEARCH-STANDARD-v0.2.md
as_of: 2026-11-15
owner: SI8
scope: Creator Record message-fit prospect sourcing
parent: 01_Business/product-discovery/COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md
---

> **Repository integration note (2026-11-12):** filed from the operator-supplied draft `SI8_CREATOR_RECORD_PROSPECT_RESEARCH_STANDARD_v0.1.md` with minimal corrections, listed in §13. Labels used below: **[HISTORICAL]** = documented past practice; **[OBSERVED]** = reported R1/R2 research findings; **[PROPOSED]** = operating requirement not yet approved; **[OPEN]** = unresolved policy decision; **[DECISION Dn]** = operator policy decision recorded in §1a (added in v0.2; D7 revised in v0.3). Every workbook and file named here is **external to this repository** (local operator files) unless a repository path is given. This repository is public, so prospect-level data (names, profile URLs, per-person evidence) stays in the external workbooks and is never committed here.

# SI8 Creator Record — Prospect Research Methodology and Operating Standard

## 1. Purpose and decision boundary

This standard governs discovery, qualification, evidence review, historical deduplication, research reporting and preparation for outreach clearance of prospective commercial AI-video practitioners. It is an operating methodology, **not** a product software PRD and **not** authorization to contact prospects. It may be adapted to future SI8 research only through an explicit versioned decision.

**Authority boundaries:** Research qualification establishes a documented connection to qualifying commercial AI-video work; it does not establish licensing problems, buying intent, decision authority, legal clearance, prior-contact clearance, or eligibility for outreach. Four layers are kept separate (§6):
1. research qualification;
2. available-source screening;
3. eligibility under the revised suppression policy (revised D7);
4. Dripify's own suppression at send time.

Operator authorization is a further, separate gate. No downstream export, randomization or campaign launch may imply eligibility absent those gates. Under v0.3, **no layer establishes comprehensive prior-contact clearance**.

Unless marked otherwise, §§4–10 are **[PROPOSED]** operating requirements. Where they implement a decision in §1a, they are marked **[DECISION Dn]**.

## 1a. Operator policy decisions (2026-11-12)

The operator approved these policy decisions for documentation on 2026-11-12. They govern this standard. They do not by themselves adopt the whole standard, and they do not implement or complete any operational check.

| ID | Decision |
|---|---|
| **D1** | Previously invited or messaged SI8 prospects, including non-acceptors, are ineligible for these fresh-acquisition campaigns. |
| **D2** | Historical research-list presence alone does not establish prior contact. Research-only matches require identity and operational-history review. |
| **D3** | Candidates with unresolved prior-contact status remain HOLD, not cleared. |
| **D4** | A/B assignment occurs only after operational clearance, population freeze and documented eligibility checks. |
| **D5** | Campaign A tests mid-production commercial-use uncertainty. Campaign B tests pre-production commercial-use checking. Both use the same qualified population. |
| **D6** | No unapproved per-project or per-network hard caps are introduced. Concentration must be recorded and reviewed. |
| **D7 (revised 2026-11-15)** | For the current Creator Record LinkedIn message-fit experiment, outreach eligibility follows the simplified suppression policy in §1b. Comprehensive dated reconciliation of all contact history is **deferred**, not completed. |
| **D8** | The final Dripify import must reconcile exactly to the eligible and assigned campaign register (wording reconciled with revised D7; see below). |

D1 and D4 adopt the two departures from v24 that v0.1 proposed (§3). They change the rules for new Creator Record campaigns only. They do not alter any historical experiment record.

**Original D7 (2026-11-12), superseded for this experiment:** "Outreach clearance requires a dated, auditable reconciliation of current Dripify history, CRM records, active campaign queues, known opt-outs and relevant historical rosters. No single source is assumed complete." This remains the full-reconciliation standard, deferred rather than withdrawn (§1b). v0.2 preserves it as written.

## 1b. Simplified operational suppression policy (approved 2026-11-15)

The operator approved the following on 2026-11-15, **specifically for the current Creator Record LinkedIn message-fit experiment**:

- **S1.** Historical screening already conducted during research rounds R1–R6 and the consolidated pre-launch review is retained.
- **S2.** Confirmed previous SI8 contacts, known opt-outs and protected campaign assignments are excluded.
- **S3.** Dripify's "Don't send to previous leads" feature is used as the final operational suppression safeguard.
- **S4.** Residual historical-contact uncertainty arising from incomplete source coverage is accepted.
- **S5.** Comprehensive historical reconciliation and the Dripify API investigation are deferred.
- **S6.** This process is not represented as comprehensive prior-contact clearance.

**How D1–D8 apply under §1b** (each original intent is preserved where compatible):

- **D1:** still the rule. Previously invited or messaged SI8 prospects are ineligible. It is enforced where prior contact is **confirmed** in available sources (S2), and backstopped by Dripify's setting (S3). Unconfirmed prior contact falls under the accepted residual uncertainty (S4).
- **D2:** unchanged.
- **D3:** "unresolved prior-contact status" means a **specific** unresolved identity or historical match for that person (e.g. a plausible name match, an ambiguous profile, or a roster match whose send status is unknown). Such candidates stay HOLD. General uncertainty caused only by incomplete source coverage is **not** a HOLD reason; it is the residual risk accepted under S4.
- **D4:** "operational clearance" means completion of the §1b eligibility review (S1, S2 and D3 HOLD resolution), not comprehensive clearance. Assignment still requires a documented population freeze, documented eligibility checks and a recorded reproducible seed.
- **D5, D6:** unchanged.
- **D8:** the import reconciles exactly to the register of people who are `ELIGIBLE — REVISED POLICY` and assigned (§6), not to a comprehensively `CLEARED` register.

## 2. Experiment being supported

**[DECISION D5]** Creator Record is being tested through two LinkedIn message-framing arms from Angel's account. The operator approved these arm definitions on 2026-11-12 (§1a). They are distinct from the earlier CR-Track A/B validation tracks (`03_Sales/validation/CR-TRACK-A-B2B-READINESS-SPEC.md`, `CR-TRACK-B-CREATOR-READINESS-SPEC.md`), which were audience tracks, not message arms.

- **A — Mid-production:** uncertainty about whether tools, images or AI outputs already used in a client video are commercially suitable.
- **B — Pre-production:** how practitioners check models, tools and source assets against commercial-use requirements before client work.

The **target population and qualification standard are identical** for both arms; messages 2–4 are shared. A/B means *message treatment*, not role, workflow stage or audience segmentation. The target is 200 eligible prospects, ultimately 100 per arm. **[DECISION D4]** Assignment must occur **only after qualification, the §1b eligibility review, a documented population freeze and documented eligibility checks**, using a recorded reproducible random seed. The target remains **100 per arm**. Do not assign arms during sourcing or use historical PRE/DURING/POST labels as occupational groups.

Creator Record concerns organization and assessment of supporting project records and unresolved commercial-use checks; it is not automatic legal clearance, legal advice or certification. SI8's human-reviewed Commercial Assurance Assessment is a distinct higher-assurance service.

## 3. Historical evidence and current status

**[HISTORICAL]** The historical CRC Lifecycle sourcing process was project-first: discover real named commercial AI-video work, trace individually credited contributors, grade attributable evidence, and screen historical overlap. The v24 freeze comprised 300 people (166 Grade A, 134 Grade B; four legacy Grade C moved to a conditional reserve). Its PRE/DURING/POST arms were randomized message treatments (simple deterministic randomization, no network balancing). Source: external `SI8_CRC_Lifecycle_R1_v24_Frozen_Randomized_2026-10-09.xlsx`, sheet "Freeze Authorization"; corroborated by the per-respondent experiment-identity notes in `03_Sales/crm/`. Historical search queries were not preserved.

**[HISTORICAL → DECISION D1, D4]** v24 limited historical exclusion to previously *accepted* SI8 connections and permitted unanswered invitations (same source). v24 also randomized at freeze, before operational outreach clearance ("Outreach NOT AUTHORIZED — launch QA required"). Creator Record does **not** inherit either rule. Previously invited or messaged non-acceptors are ineligible (D1), and assignment follows the eligibility review (D4, as applied under §1b). These are deliberate departures for new campaigns, not corrections of the historical record, which is unchanged.

**[OBSERVED]** Research reports supplied on 2026-11-12 state the following. The figures were checked against the external R1/R2 workbooks' "Population Quality" sheets:

| Metric | R1 | R2 | Interpretation |
|---|---:|---:|---|
| Selected research-qualified | 20 | 30 | 50 combined, before operational clearance |
| Named people screened | 79 | 69 | Denominators were defined differently; yields not directly comparable |
| Selected yield | 25.3% | 43.5% | Not evidence of faster sourcing |
| Grade A selected | 20 | 30 | All 50 graded A by Work; not independently third-party audited |
| Distinct projects represented | 12 | 14 R2 projects new to R1 | Project and network overlap still require tracking |
| Outreach-cleared | 0 | 0 | Current operational suppression unresolved |

Five R1 records were re-examined in R2 and retained Grade A: candidate IDs CRR1-005, CRR1-010, CRR1-042, CRR1-060 and CRR1-075 (R2 workbook, sheet "R1 Independent Audit"; names kept out of this public repository). This was a second-pass review by the same research process, not an independent third-party audit. The R2 report states 13 production networks new to R1 and notes one delivery team contributed six R2 prospects. R1 also reports **0** personal LinkedIn profile pages directly inspected: all 20 identities rest on public-index or cross-link corroboration, because direct retrieval was blocked. R2's 25 holds include network-**cap** holds, a research-time practice that is not approved policy. Under D6, a cap is not a valid hold or exclusion reason; such holds remain as recorded in the R2 workbook, but must be re-dispositioned on their evidence merits before they count for or against eligibility. These are **reported workbook/research findings**, not an independent verification of all underlying external sources. Retain the R1 and R2 workbooks as source artifacts, not as an outreach-ready list.

**[OBSERVED — operator-reported, 2026-11-15]** The operator reports a total research population of **250** across rounds R1–R6, **including a 50-person buffer** above the 200 needed for 100 per arm. This repository has verified only the R1/R2 figures above. The R3–R6 workbooks and the consolidated pre-launch review have not been inspected here, and their figures are recorded as reported. The 250 is a research population, not an eligible or outreach-ready population.

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

Record full name, stable candidate ID, normalized personal LinkedIn URL, role, current and project-time affiliations where supported, project, client, contribution, professional geography and basis, evidence IDs, verification date, research status and outreach eligibility status (§6). Ambiguous identity or missing personal LinkedIn verification is HOLD, never a fabricated URL.

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

**EXCLUDE:** Evidence demonstrates failure of a criterion or an authoritative suppression restriction. Record why. **[DECISION D2]** Historical research presence alone is not proof of actual contact; research-only matches require identity and operational-history review. An active protected assignment can nevertheless exclude someone from a fresh campaign.

**[DECISION D1, D3, revised D7] Four separate layers.** Each is recorded in its own field and never collapsed into another.

1. **Research qualification** (`research_decision`, `evidence_grade`): the evidence rules above.
2. **Available-source screening** (`historical_match_status`): the S1 screening against the sources actually checked. Record the sources and dates. Values:
   - `NO MATCH IN CHECKED SOURCES` — means only that; never "never contacted".
   - `CONFIRMED PRIOR CONTACT`
   - `KNOWN OPT-OUT`
   - `PROTECTED ASSIGNMENT`
   - `SPECIFIC MATCH UNRESOLVED`
3. **Eligibility under the revised policy** (`outreach_eligibility`; replaces v0.2's `outreach_clearance`). Values:
   - `ELIGIBILITY REVIEW PENDING` — the §1b review has not been completed for this person.
   - `HOLD — SPECIFIC MATCH UNRESOLVED` — a specific unresolved identity or historical match (D3). Not eligible until resolved.
   - `INELIGIBLE — PRIOR CONTACT` — confirmed previous SI8 invitation or message, accepted or not (D1, S2).
   - `INELIGIBLE — OPT-OUT` — a known opt-out (S2).
   - `INELIGIBLE — PROTECTED ASSIGNMENT` — S2.
   - `ELIGIBLE — REVISED POLICY` — research-qualified, §1b review complete, no confirmed prior contact, opt-out, protected assignment or unresolved specific match in the checked sources. **Residual historical-contact uncertainty accepted (S4). This is not comprehensive clearance (S6).**
4. **Dripify suppression** (`dripify_suppression_status`): records only what Dripify itself observably reports for the lead after import with "Don't send to previous leads" enabled (S3). A lead that Dripify does not send to is recorded as such, with the date. It is not re-imported or substituted without an operator decision (§11). The scope of Dripify's check is unverified (§7).

v0.2's `CLEARED` value is **not issued** for this experiment. A research-qualified person can hold any eligibility value.

No Grade C candidates in the selected cohort. Separate `research_decision`, `evidence_grade`, `historical_match_status`, `operational_contact_status`, `outreach_eligibility` and `dripify_suppression_status` fields. A Grade A label never implies legal rights, commercial safety or outreach eligibility. Record commercial-context classification and tool-use verification separately.

## 7. Historical suppression and outreach eligibility

Research screening must compare the candidate against all available historical SI8 research and campaign populations, including CRC Lifecycle v24 PRE/DURING/POST (300 roster entries), Product A Angel (79 roster entries), other Commercial Readiness/Creator Record campaigns, and known responses/opt-outs. The other campaigns include the CR-Track A/B (JD), A2 (Angel) and B2 (Vanessa) Wave 1 lists, documented in `03_Sales/validation/SI8_CR-TrackA-B_JD_Wave1_QA.md` and `SI8_CR-TrackA2-B2_Wave1_FINAL-QA.md`, and the Standing Encore SE-001 lists (`03_Sales/standing-encore/`). Known responses and opt-outs are in `03_Sales/CRM.md` and `03_Sales/crm/`. These entries can overlap; do not equate roster size with unique people or delivered messages. Record source version/date, match key, confidence, status and limitations.

**[DECISION D7, revised 2026-11-15]** For the current experiment, eligibility follows §1b:
- the available-source screening already performed (S1);
- exclusion of confirmed prior SI8 contacts, known opt-outs and protected assignments (S2);
- HOLD for specific unresolved matches (D3);
- Dripify's "Don't send to previous leads" setting as the final safeguard at send time (S3).

Record, for each source actually checked: its name, export or access date, coverage window, match keys used and known gaps. Preserve timestamps and evidence. A no-match finding means only *no match in checked sources*. Never interpret it as never contacted.

**Deferred, not completed (S5):** the comprehensive dated reconciliation that original D7 required. It would cover current Dripify history for every sender alias, sent invitations and messages, pending and queued assignments, accepted connections, existing relationships, opt-outs and negative responses. The Dripify API investigation is also deferred. Both remain the standard for any future claim of comprehensive clearance.

**Dripify safeguard limits:** this standard does not describe how Dripify's "Don't send to previous leads" feature works beyond its name. The following are **unverified**:
- which sender accounts, workspaces or campaigns its check covers. **Do not assume** it covers every historical SI8 sender account (JD, Vanessa, Ivy, the archived Lilly), or Standing Encore client campaigns run from the same accounts;
- when the check is applied;
- how a suppressed lead is shown or reported.

Dripify campaign or list membership is not itself proof of contact: JD's Dripify account is also used to source Sales Navigator lists (`03_Sales/validation/VALIDATION-LEDGER-SCHEMA.md`, "Dripify sourcing vs. actual outreach contact"). Under D1, an actual invitation or message is what makes someone ineligible. Membership specific to a candidate that cannot be resolved either way is a specific unresolved match: HOLD under D3.

**Source availability (recorded 2026-11-12 from repository evidence; none is confirmed complete or current; comprehensive reconciliation deferred under S5):**

| D7 source | Status | Basis / gap |
|---|---|---|
| CRM (`03_Sales/CRM.md`, `03_Sales/crm/`) | Available in repository | Warm and active leads only, by design (per `CLAUDE.md` Key Documents). Not a complete response or contact log. |
| Supabase response exports | Partially available | Repository copies end at `data/supabase-exports/supabase-export-2026-07-17.csv`. Newer exports are kept locally outside the repository; current coverage requires verification. |
| Standing Encore (STEC) response database | Read-only checks previously performed | CRM records show reply auto-ingestion checks for mapped campaigns (Oct–Nov 2026). Coverage of invitations sent to non-responders is not established. |
| Dripify invitation, message and queue history | **Requires verification** | No direct access from this repository. Needs dated operator exports per sender alias, including active queues. |
| Accepted-connection export (Airtable) | Historical only | The 2,464-record export used for the v24 freeze (2026-10-09) covers accepted connections only and predates later campaigns. |
| Historical rosters (v24 PRE/DURING/POST, Product A 79, CR-Track Wave 1 lists, SE-001) | Available as external or repository files | Research and prepared lists. Under D2 they are not proof of contact; matches trigger identity and operational-history review. |
| Opt-out register | **Requires verification** | No dedicated opt-out register found in the repository. Opt-outs are currently recoverable only from CRM and response records. |

**Known coverage limitations (from the read-only source inventory of 2026-11-13; accepted as residual risk under S4, not resolved):**
- no available source records invitations to people who never accepted;
- the latest Airtable accepted-connection export reviewed (dated 2026-10-15) contains no CRC Lifecycle or Product A campaigns;
- the repository's response exports end 2026-07-17;
- the Standing Encore response database was not accessible in that session;
- the archived Lilly alias's history may be unrecoverable;
- the same LinkedIn accounts also run Standing Encore client campaigns;
- no dedicated opt-out register exists.

No comprehensive prior-contact clearance has been implemented or completed under this standard, and none is claimed (S6). No individual prospect has been determined eligible in this document.

**Fail closed for specific matches:** until the §1b review is complete for a person, mark `ELIGIBILITY REVIEW PENDING`. A specific unresolved match is `HOLD — SPECIFIC MATCH UNRESOLVED` (D3). Incomplete general coverage alone does not create a HOLD (S4). Until eligibility review, freeze and assignment are complete: no Dripify export, contact action, A/B assignment or campaign launch. Do not modify CRM or contact records without separate authorization. Confirmed opt-outs are ineligible. Protected prior assignments must not be reassigned without explicit operator decision.

## 8. Network breadth and research efficiency

Track project IDs, company/studio IDs and shared network edges; count unique projects and networks using consistent definitions. Report largest project/team share and correlated clusters. **[DECISION D6]** No unapproved per-project or per-network hard cap may be applied; concentration is recorded and reviewed instead, and any future cap requires an explicit versioned decision. Avoid sourcing only additional people from an easy-to-find team. Do not claim statistical representativeness from convenience sampling.

Standardize the funnel for every future tranche:

- `discovered_person`: unique named individual identified from a logged project/source.
- `investigated_person`: unique individual for whom a recorded qualification/identity/suppression decision was attempted and dispositioned. Count once per tranche; preserve cross-tranche identity links.
- `selected_qualified`: Grade A/B, inclusion criteria met, not an established protected/previously contacted candidate; **outreach may still be pending**.
- `reserve_qualified`, `hold`, `exclude`: distinct terminal research dispositions with reasons.

Report numerator/denominator and any missing data. Log observed work time only if actually measurable; never fabricate active research minutes. Compare R1/R2 yields only with a methodology caveat; do not retroactively rewrite old denominators to create apparent improvement.

## 9. Required data artifacts and provenance

Maintain an auditable workbook or structured register with at least: (1) Qualified Prospects; (2) Commercial Projects; (3) Evidence Audit; (4) Discovery Log; (5) Suppression Audit; (6) Population Quality; (7) Research Methodology. Preserve R1/R2 IDs and original values; amendments must be versioned or appended with reason, date and reviewer. Every Grade A/B decision should be traceable from candidate → project → role-specific evidence → source URL. Keep full URLs and access dates. Do not represent inaccessible pages as directly inspected.

**Data location:** prospect-level registers stay in the external research workbooks. This repository is public: only aggregate counts, candidate IDs and methodology are committed. This follows the existing CRM practice of noting that "no roster data was copied here."

**[DECISION D8] Import integrity (launch QA):** the final Dripify import for each campaign must reconcile **exactly** to the eligible and assigned campaign register for that arm. That means the same people by normalized LinkedIn URL, no additions, no omissions, every person `ELIGIBLE — REVISED POLICY`, and every person carrying their assigned arm. The reconciliation is dated and recorded. Leads Dripify then declines to send to under S3 are recorded in `dripify_suppression_status`, after the import reconciliation, without altering the register. This formalizes the historical practice in `03_Sales/validation/SI8_CR-TrackA2-B2_Wave1_FINAL-QA.md`.

Before expanding beyond a tranche, review evidence quality, historical matches, source gaps, project/network concentration, role balance, commercial-context mix and research yield. A research GO is never an outreach GO.

## 10. Current gates and next milestone

**[OBSERVED] Reported research evidence, not yet operator-accepted:** R1 20 + R2 30 selected candidates, pending operator quality review. Five R1 cases survived Work's second-pass evidence check.

**[OBSERVED — operator-reported] Status at 2026-11-15:** R1–R6 research reportedly complete: 250 people, including a 50-person buffer (§3). As at v0.2, the 2026-11-12 recommendation of an R3 tranche of up to 50 was superseded by the reported R3–R6 rounds.

**Open gates (for the reported 250):**
- completion of the §1b eligibility review for each person (S1, S2), including resolution or retention of specific HOLDs (D3);
- re-disposition of any R2 cap holds on their evidence merits (D6), if not already done in later rounds (not verified here);
- continued network concentration review;
- a consistent investigated-person denominator across rounds;
- the documented population freeze and the seeded 100/100 assignment protocol (D4), including the sequencing questions in §11.

No person is recorded here as `ELIGIBLE — REVISED POLICY`. Do not assume 250 researched equals 200 eligible.

**Launch gate:**
1. §1b eligibility review complete;
2. eligible pool of at least 200 confirmed;
3. documented freeze;
4. seeded 100/100 assignment;
5. exact import reconciliation (D8), with Dripify's "Don't send to previous leads" enabled (S3);
6. final QA;
7. explicit operator authorization.

## 11. Change control and open decisions

This v0.3 remains a **proposed** standard until the operator formally adopts it. Decisions D1–D8 (§1a), as revised by §1b, are recorded operator policy; the remaining operating requirements are not yet adopted. Being filed in the repository is not approval. Changes require an explicit versioned rationale and should not silently revise historical evidence.

**Resolved in v0.2:** the two departures from v24 (D1, D4); network caps (D6: none unless explicitly approved); the A/B arm definitions (D5).

**Resolved in v0.3:** the operational suppression approach for the current experiment (revised D7, §1b).

**Deferred by decision (S5), not open for this experiment:** an authoritative system for each contact-history source; minimum coverage dates; per-alias Dripify history exports; the Dripify API investigation.

**[OPEN] sequencing questions for operator review (raised by §1b; not decided here):**
1. **Dripify check scope:** which sender accounts, workspaces and campaigns does "Don't send to previous leads" actually check? Is its behavior documented or tested before launch? Does it cover contacts made from Angel's account in Standing Encore client campaigns?
2. **Assignment versus Dripify suppression:** Dripify suppresses leads at send time, after assignment. Should a lead it suppresses be replaced from the buffer, which would mean holding part of the buffer out of assignment at freeze? Or should the shortfall be accepted, leaving arms unequal or below 100?
3. **Buffer at freeze:** is the 50-person buffer frozen and randomized together with the 200, or held out as an unassigned reserve?
4. **Observability:** how is a Dripify-suppressed lead identified and recorded per lead (`dripify_suppression_status`)? Can it be distinguished from other non-sends (e.g. invitation limits)?
5. **Setting verification:** how is it confirmed and recorded that the setting is enabled on both arm campaigns before launch?

**[OPEN] decisions (carried forward):**
- where known opt-outs are authoritatively recorded (S2 relies on currently known opt-outs; no register exists);
- final allowable proportion of vendor/brand promotional work;
- target markets, if any;
- final randomization/balance checks, including whether network-correlated people are balanced across arms (D6 forbids caps, but not balance checks);
- the Creator Record attribution mechanism, if any. Historical CRC campaigns used unique `?ref=` codes; none is defined for Creator Record. **Deliberately left unresolved.**

None of these open items is implied by R1/R2 evidence, and an implementer must not invent an answer.

## 12. Source-of-truth references

**External (local operator files, not in this repository):**
- `SI8_Creator_Record_Prospect_Calibration_R1.xlsx` — original calibration and supporting logs.
- `SI8_Creator_Record_Prospect_Research_R2.xlsx` — combined research, R1 five-case audit and R2 logs.
- Historical CRC Lifecycle v19/v23/v24 records: `SI8_CRC_Lifecycle_v19_Population_Quality.md`, `SI8_CRC_Lifecycle_v23_Population_Quality.md`, `SI8_CRC_Lifecycle_v23_Evidence_Audit.csv`, `SI8_CRC_Lifecycle_R1_v23_Milestone_300.xlsx`, `SI8_CRC_Lifecycle_R1_v24_Frozen_Randomized_2026-10-09.xlsx`, `SI8_CRC_Lifecycle_R1_v24_Assignment_2026-10-09.csv`.
- Historical rosters: `SI8_Product_A_Angel_79_FINAL_IMPORT_PREPARED_2026-10-15.csv` and `SI8_CRC_Lifecycle_R1_v24_{PRE,DURING,POST}_Dripify_PRELAUNCH.csv`.
- Operator-supplied R1/R2 Work final reports dated 2026-11-12.
- Operator-reported R3–R6 research rounds and the consolidated pre-launch review (not inspected in this repository).

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

### v0.2 changes (2026-11-12)

v0.1 is preserved unmodified apart from a superseded-by header.
- Added §1a, recording operator policy decisions D1–D8, and a [DECISION Dn] label.
- §2: arm definitions marked D5; assignment preconditions aligned to D4 (adds documented eligibility checks).
- §3: the v24 departures are now decided (D1, D4) rather than proposed. Added a D6 note on R2 cap holds; the R2 records themselves are unchanged.
- §6: D2 research-only matches; prior-contact clearance values implementing D1/D3, kept separate from `research_decision`.
- §7: D7 reconciliation requirements; the Dripify membership-vs-contact caveat; a source-availability table drawn from repository evidence, with no completeness claimed; an explicit statement that no clearance has been implemented.
- §8: D6 no unapproved caps.
- §9: D8 exact import reconciliation per arm.
- §10: open gates updated; all 50 remain clearance-pending.
- §11: resolved items listed; operational source questions added; attribution left unresolved.

R1/R2 findings, limitations and historical experiment records are unchanged.

### v0.3 changes (2026-11-15)

v0.2 is preserved unmodified apart from a superseded-by header.
- Added §1b, recording the simplified operational suppression policy (S1–S6) approved 2026-11-15 for the current Creator Record experiment.
- Revised D7 accordingly. The original D7 wording is retained in §1a as the deferred full-reconciliation standard.
- Recorded how D1, D3, D4 and D8 apply under §1b, preserving their intent:
  - D3 HOLD now means a specific unresolved match; incomplete general coverage is accepted residual risk.
  - D4's "operational clearance" means the §1b eligibility review.
  - D8 reconciles to the eligible register.
- §6: four separate layers (research qualification, available-source screening, revised-policy eligibility, Dripify suppression). `outreach_clearance` renamed `outreach_eligibility`; `CLEARED` is not issued; added `dripify_suppression_status`.
- §7: revised D7 text; S5 deferral; Dripify safeguard limits (scope unverified); coverage limitations from the 2026-11-13 read-only inventory; explicit statement that no comprehensive clearance is claimed.
- §§2, 3, 10: 100 per arm retained; operator-reported R1–R6 population of 250 including a 50-person buffer, recorded as reported; gates updated.
- §11: sequencing questions for operator review; S5 deferrals separated from open decisions; attribution still unresolved.

No new policy decision was introduced beyond §1b. No prospect-level data, eligibility determination, randomization or import is recorded.
