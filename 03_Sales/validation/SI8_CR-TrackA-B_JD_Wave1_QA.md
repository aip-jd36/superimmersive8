# SI8 Commercial Readiness — Wave 1 Execution QA (Track A + Track B, sender = JD)

**Prepared:** 2026-09-03 · **Finalised:** 2026-09-04 (Strategic OS corrections applied)
**Role:** Execution / Developer layer (not Strategic OS). This is execution QA and final-list construction only — no hypotheses, targeting logic, campaign methodology, messaging, ICP definitions, or product conclusions were changed.

**Status:** The two FINAL CSVs are now the **operational launch lists**, superseding the earlier Strategic OS PMM candidate workbook (`SI8_CR_Track_A_B_Wave1_Alias_CrossReference_090226.xlsx`) and the 2026-08-30 pass files.

**Authoritative inputs used:**

| Input | Path | Role |
|---|---|---|
| Airtable accepted-lead master | `~/Desktop/SI8 Rights Verified Master 090126.txt` (2,296 rows, TSV) | **Authoritative population** + campaign-history source of truth |
| PMM candidate / alias package | `~/Downloads/SI8_CR_Track_A_B_Wave1_Alias_CrossReference_090226.xlsx` | Candidate cohort (65 A / 53 B), qualification basis, cross-reference |
| Supabase response corpus | `data/supabase-exports/*.csv` (11 exports, Apr–Jul 2026) | Secondary alias-history cross-check (responder-level) |
| Validation ledger | `data/validation-ledger.csv` (16 warm-lead rows) | Warm-lead / STEC contamination check |

**Deliverables (this directory):**

- `SI8_CR-TrackA_JD_Wave1_FINAL.csv` — **62 leads**
- `SI8_CR-TrackB_JD_Wave1_FINAL.csv` — **52 leads**
- `SI8_CR-TrackA-B_JD_Wave1_QA.md` — this file

---

## 1. Headline result

| Check | Result |
|---|---|
| Track A starting PMM count | 65 |
| Track A final count | **62** — within the approved 60–70 range |
| Track B starting PMM count | 53 |
| Track B final count | **52** — within the approved 50–60 range |
| **Combined final count** | **114** |
| Both lists sent from | **JD** (single alias, all 114 rows) |
| Verified prior-JD contact among final leads (`_JC`, `_JD`, alias_profile) | **0** |
| Prior-JD conflicts discovered in full-history verification | **0** |
| Backfill / replacements performed | **0** (none required; none authorised) |
| Within-Track-A duplicates | 0 |
| Within-Track-B duplicates | 0 |
| Track A / Track B person overlap (FINAL lists) | **0** |
| Every final candidate in the authoritative accepted-lead population | **YES — 114 / 114** |
| Literal campaign history reconstructed on every final row | **YES — 114 / 114** |
| Unresolved same-alias contamination | **None** |
| Unresolved warm-lead contamination | **None** |
| **Safe to launch from JD?** | **Track A: YES. Track B: YES.** No open blocking items. |

### Changes from the 2026-09-03 draft (Strategic OS corrections)

| # | Change | Effect |
|---|---|---|
| 1 | **Removed B001 Kiel Robinson from Track B.** Not present in the authoritative accepted-lead master; Strategic OS decision (2026-09-04) not to create a population-rule exception to preserve one send. Not backfilled. | Track B 53 → **52** |
| 2 | Track A held at **62** — the three earlier removals (A007, A060, A061) are **not** backfilled, per Strategic OS. | Track A unchanged |
| 3 | Alias-suffix mapping corrected and recorded (`_JC` = JD). See §7 and `VALIDATION-LEDGER-SCHEMA.md`. | Documentation only |

---

## 2. TASK 1 — Literal campaign history restored

Matching was **primarily by LinkedIn profile URL** (normalised: lowercased, protocol / `www.` / query / fragment / trailing-slash stripped). Name similarity was never used to infer campaign history where a URL was available.

- **110 / 114** final leads matched the master on an **exact LinkedIn URL**.
- **4 / 114** matched by **name (+ company where needed)** because the master export has **mojibaked LinkedIn URLs and names** for them — interior accented characters (`ö`, `æ`, `ü`, `ç`) were replaced with U+FFFD in the Airtable → text export, corrupting both the `LinkedIn` and name fields on that row. Each was individually verified by targeted first/last-name search of the master; the PMM-supplied literal campaign was confirmed correct in every case:

  | ID | Name | Master campaign (verbatim) | Method |
  |---|---|---|---|
  | B025 | Johannes Björklund (SVT) | `SI8_RV_R4LI_CreaDir_AI Video_STHM_0526A_VP` | first/last-name search (name + URL both mojibaked) |
  | B026 | Jakob Sæ-Pedersen (Black Eye Media AB) | `SI8_RV_R4LI_CreaDir_AI Video_STHM_0526A_VP` | first/last-name search (name + URL both mojibaked) |
  | B033 | Tun Lynn Nyan Nyan (Brand Diary) | `SI8_RV_R4LI_VP+_Creative_SPG_0426B_LH` | name + company (URL mojibaked, name intact) |
  | B044 | Amaru Zeas-Sigüenza (Foundry) | `SI8_RV_R4LI_VP+_Creative_London_0426A_VP` | first/last-name search (name + URL both mojibaked) |

**All 114 final leads are traced to at least one row in the authoritative master.** (B001 Kiel Robinson, the only candidate that was not, has been removed — §1, §4.)

### The "Prior campaign enriched" Track B rows — resolved

The PMM package carried the placeholder `Prior campaign enriched` (not a literal campaign name) for 12 Track B rows. **11 remain in the final list** (B001 removed) and all 11 resolved to literal RV-master campaign strings:

| ID | Name | Restored literal `Original Campaign Name` | Prior alias(es) — full history |
|---|---|---|---|
| B002 | Graeme Carr | `SI8_RV_R4LI_CreaDir_AI Video_AmsDm_0426A_VP` | Vanessa |
| B004 | Ian Wasseluk | `SI8_RV_R4LI_CreaDir_AI Video_LA_0426A_VP` | Vanessa |
| B005 | Johnny Otto | `SI8_RV_R4LI_CreaDir_AI Video_LA_0426A_VP` | Vanessa |
| B006 | Azarudeen J | `SI8_RV_R4LI_CreaDir_AI Video_England_0426B_IL` | Ivy |
| B007 | Shyan Pawl | `SI8_RV_R4LI_CreaDir_AI Video_LA_0426A_VP` | Vanessa |
| B008 | Irfan Merchant | `SI8_RV_R4LI_CreaDir_AI Video_LA_0426A_VP` | Vanessa |
| B009 | Anwar Al Amin | `SI8_RV_R4LI_CreaDir_AI Video_Dubai_0426A_LH` | **Lilly + Vanessa** (2 RV campaigns — PMM had "none/dead" only) |
| B010 | Henri Kang | `SI8_RV_R4LI_CreaDir_AI Video_Paris_0526A_AL` | Angel |
| B011 | Al Hafeez Jamil | `SI8_RV_R4LI_CreaDir_AI Video_SPG_0526A_IL` | Ivy |
| B012 | Simon Helm | `SI8_RV_R4LI_CreaDir_AI_Posted_LI_Eng_0626A_IL` | **Ivy + Vanessa** (2 RV campaigns — PMM had "Ivy" only) |
| B013 | Justin Hounkpatin | `SI8_RV_R4LI_CreaDir_AI_Posted_LI_Eng_0626A_IL` | Ivy |

None of the 11 changes JD eligibility.

---

## 3. TASK 3 & 4 — Dedupe and exceptions

### 3.1 Within-track duplicates: none

Zero duplicate LinkedIn URLs within Track A; zero within Track B. Normalised name+company fallback surfaced no additional within-track duplicates.

### 3.2 A/B person-level overlap: 2 found in the PMM package, resolved

The PMM QA sheet reported "Cross-track overlap: 0". Verification found **2** people present in **both** the Track A and Track B sheets (same LinkedIn URL):

| Person | In PMM as | LinkedIn | Resolution |
|---|---|---|---|
| Andrew Lavery | A060 **and** B027 (both "Blue Zoo Animation Studio") | `linkedin.com/in/andrew-lavery-89151155` | **Retained in Track B (B027); removed from Track A.** Hands-on Animation Director / CGI generalist — a clean Track B (Creator Readiness) subject. His Track A maturity basis ("Established animation studio production role") is one of the two thinnest in the Track A sheet and rests on title alone, which the Track A spec explicitly rules insufficient. |
| Polina Brodowski | A061 **and** B028 (both "Ideapolis Creative") | `linkedin.com/in/polina-brodowski` | **Retained in Track B (B028); removed from Track A.** Hands-on Creative Director / 3D experiential designer at a small shop — clean Track B subject. Track A basis ("AI + experiential commercial creative leadership") is title-level; no governance / enterprise-client / documented-process evidence. |

Both people remain in the program (Track B); neither is lost. Net effect on Track A: −2. **Confirmed not backfilled** (Strategic OS, 2026-09-04).

### 3.3 Warm-lead ↔ STEC contamination: 1 found, removed

**Person removed:** **Theodor Sandu** — PMM candidate **A007**, LinkedIn `https://www.linkedin.com/in/teddysandu`, Creative Director, MullenLowe Singapore (IPG), Singapore.

**Why this is warm-lead contamination:** he is simultaneously (a) a Wave 1 STEC Track A candidate in the PMM package and (b) an **active, in-flight warm-lead research subject** in a *different* arm of the same validation initiative. The two arms are deliberately kept separate for experimental control; contacting the same person through both — a cold STEC discovery message from JD **and** a warm 1:1 follow-up referencing his prior conversation — would double-contact him and make any response impossible to attribute to either arm. That is precisely the contamination the single-alias / separated-arm design exists to prevent.

**Source / evidence establishing warm-lead status:**

- `data/validation-ledger.csv` — row `lead_name = "Teddy (Theodor) Sandu"`, `b_id = B002`, `track = A`, `follow_up_needed = Y`, `linkedin_url = https://www.linkedin.com/in/teddysandu` (same URL as PMM A007).
- `03_Sales/validation/CR-WARM-LEAD-RESEARCH-SPEC.md` → "Secondary candidates" **#12 "Teddy (Theodor) Sandu — Creative Director"**: B-ID B002, prior signal *"They are asking for both"* (disclosure + Chain of Title), **"Desired next action: Follow up via a live alias (not Lilly)"**, **"Response status: Unanswered gate — cleared for outreach."**
- `01_Business/product-discovery/COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md` §6 previously flagged this same person for an employer-identity reconciliation (since resolved — see below).

**Employer note (not the removal reason):** the master shows "McCann Singapore (Team Unilever@Omnicom)" (his employer at original contact time); current employer is MullenLowe Singapore (IPG). Resolved on 2026-08-30 as a genuine job change over time, not a data conflict. This does not affect the removal.

**Confirmation of absence from the final launch lists:** `A007` / `teddysandu` / "Theodor Sandu" / "Teddy Sandu" appears in **neither** `SI8_CR-TrackA_JD_Wave1_FINAL.csv` **nor** `SI8_CR-TrackB_JD_Wave1_FINAL.csv` (verified by ID, by normalised LinkedIn URL, and by name substring). Net effect on Track A: −1.

**Cross-check:** the other 15 validation-ledger warm-lead candidates were checked against both Wave 1 tracks by normalised LinkedIn URL — **no other overlap.**

### 3.4 Prior-JD conflicts: 0

**The task's original alias-suffix map (`_JD` = JD) does not appear in the historical data.** The Rights Verified master contains **zero `_JD`-suffixed campaigns**. JD's actual historical campaign suffix is **`_JC`** (JD Chang) — confirmed against `03_Sales/outreach/LINKEDIN-CAMPAIGNS-LEGAL-TEAMS-V1.md` ("`…_0626A_JC` — JD"), `03_Sales/CAMPAIGN-QUEUE.md` ("JD | `…_JC`"), and `03_Sales/outreach/LINKEDIN-ICP-REPORT-2026-06-09.md` ("Alias: JD"). The three `_JC` campaigns in the master:

- `SI8_RV_R4LI_CreaDir_Finserv_NY_0626A_JC` (39 rows)
- `SI8_RV_R4LI_CreaDir_AI Video_Paris_0526A_JC` (34 rows)
- `SI8_RV_R4LI_LegalA_BLA_US_0626A_JC` (21 rows)

**Verification performed** (both `_JC` and the literal `_JD` treated as JD):

1. Every final lead's LinkedIn URL checked against **all** master rows (not only the PMM-visible one) for any `_JC` / `_JD` campaign → **0 hits.**
2. Every final lead's LinkedIn URL checked against **all 359 Supabase response touches** for these 114 people. Distinct `alias_profile` values: **Ivy (157), Vanessa (99), Lilly (88), Angel (15)** — **JD never appears.** (`csr_name` is uniformly `JD_StandingE` — JD's Standing Encore operator account, i.e. the account owner, not the sending persona; not a "JD send".)

Because 0 prior-JD conflicts were found, **Task 4's "remove + backfill" path was never triggered.** The only Track A removals are the 2 overlap resolutions + 1 warm-lead de-contamination in §3.2–3.3; the only Track B removal is B001 (§4).

---

## 4. Removals and count rationale

| Removed | From | Reason | Backfilled? |
|---|---|---|---|
| A060 Andrew Lavery | Track A | A/B overlap — retained in Track B (B027) | No (Strategic OS) |
| A061 Polina Brodowski | Track A | A/B overlap — retained in Track B (B028) | No (Strategic OS) |
| A007 Theodor Sandu | Track A | Active warm-lead research subject — contamination (§3.3) | No |
| B001 Kiel Robinson | Track B | **Not in the authoritative accepted-lead population** (`SI8 Rights Verified Master 090126.txt`). Supabase-verified prior Ivy contact + JD eligibility are not disputed; the population rule is the reason. Strategic OS decision 2026-09-04: no population-rule exception to preserve one send. | No |

**Track A = 65 − 3 = 62** (within 60–70). **Track B = 53 − 1 = 52** (within 50–60). No backfill performed or authorised. n=62 / n=52 is immaterial to the experiment.

---

## 5. Full alias-history reconstruction (TASK 2)

Every final row carries:

- `Original Campaign Name` — the single literal RV-master campaign string (the PMM-referenced one where it exists in the master for that URL; otherwise the master campaign).
- `All Prior Campaigns` — **every** prior SI8 send found, pipe-separated, literal, across both the RV master and the Supabase response corpus.
- `Prior Alias(es)` — the de-duplicated set of every alias that has contacted this person, derived from campaign suffixes (`_VP`→Vanessa, `_IL`→Ivy, `_LH`→Lilly, `_AL`→Angel, `_JC`/`_JD`→JD) **and** the Supabase `alias_profile` field.

### 5.1 Final candidates contacted in 2+ *RV-master* campaigns (8)

| ID | Name | RV campaigns | Aliases |
|---|---|---|---|
| A002 | David Tamayo | `…_VP+_Creative_London_0426B_IL` ; `…_Prod_Innov_ArmC_Gbl_0826A_VP` | Ivy, Vanessa |
| A022 | Shahrman Nayan | `…_VP+_Creative_SPG_0426A_LH` ; `…_CreaDir_AI Video_SPG_0526A_IL` | Lilly, Ivy |
| A023 | Justin Ong | `…_VP+_Creative_SPG_0426B_LH` ; `…_CreaDir_AI Video_SPG_0526A_IL` | Lilly, Ivy |
| A027 | Alan Geoy | `…_VP+_Creative_SPG_0426B_LH` ; `…_CreaDir_AI Video_SPG_0526A_IL` | Lilly, Ivy |
| A039 | James Larkin | `…_CreaDir_AI Video_Dubai_0426A_LH` ; `…_AgencyLdr_ArmB_Gbl_0826A_VP` | Lilly, Vanessa |
| A058 | Saulo Jamariqueli | `…_CreaDir_AI Video_Berlin_0626A_AL` ; `…_CreaDir_ArmA_Gbl_0826A_VP` | Angel, Vanessa |
| B009 | Anwar Al Amin | `…_CreaDir_AI Video_Dubai_0426A_LH` ; `…_AgencyLdr_ArmB_Gbl_0826A_VP` | Lilly, Vanessa |
| B012 | Simon Helm | `…_CreaDir_AI_Posted_LI_Eng_0626A_IL` ; `…_CreaDir_ArmA_Gbl_0826A_VP` | Ivy, Vanessa |
| B020 | Maria Dx | `…_CreaDir_AI Video_Dubai_0426A_LH` ; `…_CreaDir_ArmA_Gbl_0826A_VP` | Lilly, Vanessa |

None introduces a JD send. Where the PMM package's single-alias view was **incomplete** (B009, B012, and — via Supabase — A039, B015, B020), the CSV now reflects the full set.

### 5.2 Final candidates with a prior *response* to an earlier SI8 discovery sequence (~40)

A large share of both tracks previously **replied** to an SI8 discovery sequence in Q1–Q2 2026 — `SI8_Legal Friction (4 Msg)`, `SI8_Hitting a Wall (4 Msg)`, `SI8_EU AI (4 Msg)`, `SI8_Blocks AI Campaign (4 Msg)`, `SI8_Trusted AI Supplier (4 Msg)` — via **Ivy / Vanessa / Lilly / Angel**. Recorded in `All Prior Campaigns`. Implication: for these leads Wave 1 is a **2nd or 3rd** SI8 touch (under a new alias, JD), not a cold open — permitted by the spec ("a previously contacted lead may be assigned to a different live alias"), but the discovery copy should read naturally as a first contact from JD.

### 5.3 Prior-alias distribution of the final lists

| Prior alias(es) | Track A (62) | Track B (52) |
|---|---|---|
| Ivy | 19 | 18 |
| Lilly | 21 | 13 |
| Vanessa | 16 | 15 |
| Angel | 0 | 2 |
| Lilly + Ivy | 3 | 0 |
| Ivy + Vanessa | 1 | 1 |
| Lilly + Vanessa | 1 | 3 |
| Angel + Vanessa | 1 | 0 |
| **JD** | **0** | **0** |

Every lead's prior alias ≠ JD, so JD as the Wave 1 sender does not re-use the same alias against any lead. **Alias-reassignment rule satisfied for all 114.**

---

## 6. Unresolved items for Strategic OS

**None blocking.** The one item flagged in the 2026-09-03 draft (B001 not in the authoritative population) was resolved by Strategic OS decision on 2026-09-04 — B001 removed, not backfilled.

Non-blocking observations retained for the record:

| # | Item | Impact | Recommendation |
|---|---|---|---|
| 1 | **Mojibake in the master export.** The Airtable → `.txt` export corrupts every row containing a non-ASCII character (accented names, some company names, ~30+ rows across the corpus) — U+FFFD replaces the character in `First Name`, `Last Name`, `Company`, `Position`, `Location`, **and `LinkedIn`**. Defeats URL-key matching for those rows (4 of 114 here; more at full-master scale). | Low for this build (all 4 resolved by name). Medium for any future master-scale identity join. | Re-export the master as UTF-8. Until then, any master-scale contamination check must fall back to exact name+company for accented rows, never treat them as "no prior contact". |
| 2 | **Theodor Sandu employer field** in the master (`McCann Singapore …`) is stale (current: MullenLowe Singapore / IPG). Not in either final list (removed §3.3). | None. | — |
| 3 | **PMM "Proposed Alias" column is moot.** The PMM sheet proposed a per-row mix of Angel / JD / Vanessa; per the current instruction **all** Wave 1 sends are JD. The FINAL CSVs hard-set `Sending Alias = JD` for every row. | None — intended. | — |

---

## 7. Verified alias-suffix mapping (corrected — TASK 4)

The earlier Strategic OS instruction mapping `_JD` → JD was **incorrect**; historical JD campaigns use `_JC`. Verified mapping, now recorded in `03_Sales/validation/VALIDATION-LEDGER-SCHEMA.md` for future same-alias contamination checks:

| Campaign-name suffix | Alias | Status |
|---|---|---|
| `_JC` | **JD** (JD Chang) | **Current live alias.** This is JD's historical suffix — `_JD` does not occur in the data. |
| `_VP` | Vanessa Pan | Current live alias |
| `_AL` | Angel | Current live alias |
| `_IL` | Ivy | Legacy — does not block JD/Vanessa/Angel, but counts as prior-contact history |
| `_LH` | Lilly | Legacy / retired (dead) — cannot be an assigning alias again; still counts as prior-contact history |

Supabase records additionally carry an explicit `alias_profile` field (`Ivy` / `Vanessa` / `Lilly` / `Angel` / `JD`), used here as an independent cross-check.

---

## 8. Final QA results (post-correction, 2026-09-04)

| Check | Required | Actual | Pass |
|---|---|---|---|
| Track A count | 62 | 62 | ✅ |
| Track B count | 52 | 52 | ✅ |
| Combined | 114 | 114 | ✅ |
| `Sending Alias` = JD on every row | yes | yes (114/114) | ✅ |
| Prior-JD contacts (`_JC`, `_JD`, `alias_profile=JD`) | 0 | 0 | ✅ |
| Track A duplicates (LinkedIn URL) | 0 | 0 | ✅ |
| Track B duplicates (LinkedIn URL) | 0 | 0 | ✅ |
| Track A / Track B person overlap | 0 | 0 | ✅ |
| Every final candidate in authoritative population | yes | 114/114 traced to master rows | ✅ |
| Literal campaign history on every final row | yes | 114/114 | ✅ |
| Unresolved same-alias contamination | none | none | ✅ |
| Unresolved warm-lead contamination | none | none (A007 removed & confirmed absent) | ✅ |
| Track A within 60–70 | yes | 62 | ✅ |
| Track B within 50–60 | yes | 52 | ✅ |
| New material exceptions discovered | (report if any) | **none** | ✅ |

---

## 9. TASK 6 compliance

No Dripify campaign created. No LinkedIn message sent. No CRC invitation sent. No messaging, hypotheses, ICP definitions, `claude.md`, BUSINESS_PLAN, CRC / product architecture, or Living-Knowledge architecture touched. Changes are confined to `03_Sales/validation/` (3 files: the 2 FINAL CSVs + this QA doc, plus a mapping paragraph added to the existing `VALIDATION-LEDGER-SCHEMA.md` execution doc per Task 4). All source files (`~/Desktop/SI8 Rights Verified Master 090126.txt`, `data/supabase-exports/*.csv`, `data/dripify-campaigns.csv`, the PMM xlsx) were read-only.

---

## 10. FINAL CSV schema

Both `SI8_CR-TrackA_JD_Wave1_FINAL.csv` and `SI8_CR-TrackB_JD_Wave1_FINAL.csv` carry:

| Column | Notes |
|---|---|
| `First Name`, `Last Name` | Split from the PMM-approved candidate name (for B025/B026/B044 the real accented spelling was restored from the master). |
| `Company`, `Position`, `Location` | PMM values, with `Position`/`Location` upgraded to the cleaner master values where the master row was matched and un-mojibaked. |
| `LinkedIn URL` | Primary identity key. |
| `Original Campaign Name` | Single literal campaign string (see §2, §5). |
| `All Prior Campaigns` | Pipe-separated full literal history (RV master + Supabase response corpus). |
| `Prior Alias(es)` | Pipe-separated de-duped set of every prior contacting alias. Never contains JD. |
| `Sending Alias` | `JD` for every row. |
| `Track` | `A` or `B`. |
| `PMM Maturity Tier` | Track A only (all currently Tier `B`); blank for Track B. |
| `PMM Qualification Basis` | Verbatim from the PMM package. |
| `Validation Lead ID` | Populated only where already assigned in `data/validation-ledger.csv` — currently none (the one ledger overlap, B002/Theodor Sandu, was removed). |
| `Identity Match Method` | `LinkedIn URL exact` (110) / name-based (4). |
| `JD Eligible` | `YES` for every row (else the row would not be present). |
| `PMM ID` | Traceability back to the PMM xlsx (`A001…`, `B002…`). |
| `QA Notes` | Per-row notes: multi-campaign history, alias-history corrections vs. PMM, mojibake resolution. |
