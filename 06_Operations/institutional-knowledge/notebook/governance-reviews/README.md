# Formal Governance Reviews — Archive

Verbatim archive of Formal Governance Review reports for candidate Living Knowledge claims, AND (2026-08-18) CRC Publication Review reports for already-Adopted claims under CRC-publication consideration. `GOVERNED-CLAIMS.md` remains the canonical current-state ledger and carries only a condensed review summary per adopted claim; the full decision-analysis record — clause-by-clause accuracy tests, source-tier assessments, atomicity/boundary tests, the complete numbered report — lives here.

**Process requirement:** see `GOVERNED-CLAIMS.md`'s own governance-discipline section (top of file) for the rules requiring every Formal Governance Review AND every CRC Publication Review to be preserved this way.

**Two distinct decision stages, two distinct artifact types, never conflated:** a **Formal Governance Review (FGR)** asks whether a candidate should be Adopted as governed knowledge at all. A **CRC Publication Review (CPR)** asks a separate, later question about an already-Adopted claim — whether it should additionally become `CRC Eligible: Yes`. A claim may have an FGR with no CPR (Adopted, never reviewed for CRC), or both (Adopted, then separately reviewed and approved/held for CRC). Never overwrite or rename one artifact type as the other.

## Naming convention

`FGR_NNN_<reviewed-object-id>_<review-date>.md` — Formal Governance Review: sequence number, the exact candidate ID under review, and the review date.

`CPR_NNN_<claim-id>_<review-date>.md` — CRC Publication Review: sequence number, the exact already-Adopted claim ID under review, and the review date. Its own independent sequence, not continuing the FGR numbering.

## Verbatim discipline

Each file wraps the original report in a minimal metadata header (title, reviewed object, date, artifact type, historical status, PM adoption/decision status, reconstruction source) plus a `--- BEGIN VERBATIM GOVERNANCE REVIEW ---` / `--- END VERBATIM GOVERNANCE REVIEW ---` boundary (FGR) or a `--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---` / `--- END VERBATIM CRC PUBLICATION REVIEW ---` boundary (CPR). **Nothing inside that boundary is ever edited after the fact** — not to fix a later-discovered inconsistency, not to reflect a subsequent PM decision, not to harmonize terminology with a later review. A superseded or corrected analysis gets a new review artifact, never a rewritten old one. Only the wrapper metadata outside the boundary (specifically: PM adoption/decision status) is ever updated as later events occur.

## Index — Formal Governance Reviews (adoption stage)

| # | File | Reviewed candidate | PM adoption status (as of file creation) |
|---|---|---|---|
| 1 | [`FGR_001_CAND-STOCK-EDITORIAL-001_2026-08-17.md`](FGR_001_CAND-STOCK-EDITORIAL-001_2026-08-17.md) | `CAND-STOCK-EDITORIAL-001` | Adopted → `CLAIM-STOCK-EDITORIAL-001-v1` |
| 2 | [`FGR_002_CAND-STOCK-EDITORIAL-002_2026-08-17.md`](FGR_002_CAND-STOCK-EDITORIAL-002_2026-08-17.md) | `CAND-STOCK-EDITORIAL-002` | Adopted → `CLAIM-STOCK-EDITORIAL-002-v1` |
| 3 | [`FGR_003_CAND-STOCK-GETTY-EDITORIAL-001_2026-08-17.md`](FGR_003_CAND-STOCK-GETTY-EDITORIAL-001_2026-08-17.md) | `CAND-STOCK-GETTY-EDITORIAL-001` | Adopted → `CLAIM-STOCK-GETTY-EDITORIAL-001-v1` |
| 4 | [`FGR_004_CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001_2026-08-17.md`](FGR_004_CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001_2026-08-17.md) | `CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001` | Adopted (material rewrite) → `CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1` |
| 5 | [`FGR_005_CAND-STOCK-ISTOCK-EDITORIAL-001_2026-08-17.md`](FGR_005_CAND-STOCK-ISTOCK-EDITORIAL-001_2026-08-17.md) | `CAND-STOCK-ISTOCK-EDITORIAL-001` | Adopted (2026-08-17, subsequent to this file's original creation) → `CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1` |

Archived 2026-08-17, as part of the governance-artifact-preservation milestone that established this folder and its process requirement. Reviews #1–#4 were reconstructed verbatim from this session's own conversation transcript, the source of truth at time of archival — not from memory, not from the condensed summaries already in `GOVERNED-CLAIMS.md`.

## Index — CRC Publication Reviews (publication stage)

| # | File | Reviewed claim | PM decision status (as of file creation) |
|---|---|---|---|
| 1 | [`CPR_001_CLAIM-STOCK-EDITORIAL-001-v1_2026-08-18.md`](CPR_001_CLAIM-STOCK-EDITORIAL-001-v1_2026-08-18.md) | `CLAIM-STOCK-EDITORIAL-001-v1` | Approved — `CRC Eligible: Yes` (CRC Approver: JD (PM), CRC Decision Date: 2026-08-18) |
| 2 | [`CPR_002_CLAIM-STOCK-EDITORIAL-002-v1_2026-08-18.md`](CPR_002_CLAIM-STOCK-EDITORIAL-002-v1_2026-08-18.md) | `CLAIM-STOCK-EDITORIAL-002-v1` | Approved with bounded CRC-facing copy adjustment (Recommendation B) — `CRC Eligible: Yes` (CRC Approver: JD (PM), CRC Decision Date: 2026-08-18) |
| 3 | [`CPR_003_CLAIM-STOCK-GETTY-EDITORIAL-001-v1_2026-08-18.md`](CPR_003_CLAIM-STOCK-GETTY-EDITORIAL-001-v1_2026-08-18.md) | `CLAIM-STOCK-GETTY-EDITORIAL-001-v1` | Approved as-is (Recommendation A) — `CRC Eligible: Yes` (CRC Approver: JD (PM), CRC Decision Date: 2026-08-18) |

Archived 2026-08-18. Reconstructed verbatim from this session's own conversation transcript (the immediately preceding turn's own Formal CRC-Publication Review response) — not from memory, not from the condensed summary already in `GOVERNED-CLAIMS.md`, not from the FGR. CPR_002's own verbatim body records Recommendation B (bounded copy adjustment required) exactly as originally written — the subsequent PM approval and text correction are recorded in that file's own wrapper metadata, never inserted into or altering the verbatim body itself. CPR_003 is the first CRC Publication Review of a provider-specific claim (as opposed to CPR_001/CPR_002's cross-provider generic claims) — it additionally verified the `provider_scope` routing mechanism (M3) under real pipeline execution across 8 scenarios, not just claim-text safety; its verbatim body records Recommendation A exactly as originally written.
