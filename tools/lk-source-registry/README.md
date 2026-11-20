# Living Knowledge source registry (Source Monitoring, Phase A, M1)

Offline registry of monitored sources and the mapping from each source to the governed Living Knowledge claims that depend on it.

Contract: `08_Platform/prds/PRD_LK_SOURCE_MONITORING_v0.2.md` (M1: §5.1 FR-1 to FR-4, FR-8, FR-17 to FR-23, §6.1, §6.2, §9.1, §12.2).

**Status:** no relationship or exclusion has been confirmed by a human. The registry verdict is `VALID_PENDING_CONFIRMATION` and the M1 gate is not passed.

## What this is, and is not

- It **observes records**. It reads the registry, the governed ledger, the runtime fixtures, the Creator Record ledger and evidence manifests, and reports whether they agree.
- It is **not a claim authority**. Claim identity and lifecycle come from `GOVERNED-CLAIMS.md`. Nothing about a claim is stored here except its ID.
- It **writes nothing**, fetches nothing and calls no model. There is no source retrieval, schedule, change detection or alert in M1.
- It says nothing about whether a claim is valid, current, stale or cleared. A mapping is not a review of any claim.
- An exclusion is not coverage, and is not evidence that a claim is approved, valid or monitored.
- The Legacy Matrix is frozen and is **not mapped**. CRC-eligible Matrix claims are listed in a separate "CRC-reachable, not monitored" section, as an observation only.

## Files

| File | Purpose |
|---|---|
| `registry.json` | The six pilot sources, four proposed relationships and four proposed exclusions. All baselines are empty |
| `src/model.ts` | Types and closed sets |
| `src/validate.ts` | Validation. Pure: no file or network access |
| `src/evidence.ts` | Read-only loader for the repository records validation is checked against |
| `src/report.ts` | Coverage and consistency report |
| `src/cli.ts` | The validation command |
| `test/` | Offline tests. `helpers.ts` holds synthetic fixtures only |

## Running it

The tool has no dependencies of its own. It uses `tsx` from the application's installed dev dependencies, so run it from the application folder after `npm install` there.

```
cd 08_Platform/app
npx tsx ../../tools/lk-source-registry/src/cli.ts
npx tsx --test ../../tools/lk-source-registry/test/*.test.ts
```

The command prints the report to standard output and exits with:

| Exit code | Verdict | Meaning |
|---|---|---|
| 0 | `VALID` | No error, nothing under review, and every relationship and exclusion is confirmed by a named human |
| 2 | `VALID_PENDING_CONFIRMATION` | No error, but at least one relationship or exclusion is still only proposed |
| 3 | `REVIEW_REQUIRED` | No error, but at least one mapped claim has been deprecated. That relationship is not an active mapping |
| 1 | `INVALID` | At least one error. The source and coverage sections are withheld; the Matrix section is still printed |

No CI job runs these tests. Run them locally before changing the registry.

Whether a scheduled run may proceed when the verdict is `VALID_PENDING_CONFIRMATION` or `REVIEW_REQUIRED` is not decided (PRD OPEN-10). M1 has no runs.

## The pilot mapping

| Source | Mapped claim | Excluded |
|---|---|---|
| `uscoai-ai-page` | none (watch-only) | |
| `federal-register-copyright-office` | none (watch-only) | |
| `runway-terms-of-use` | `CLAIM-RUNWAY-COMMERCIAL-USE-001-v1` | `...-v2`: not in the ledger; proposed by a pending review |
| `higgsfield-terms-of-use-agreement` | `CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1` | `...-v2`: not in the ledger; proposed by a pending review |
| `ny-gbl-396-b` | `CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1` | `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1`: governed by a different statute |
| `kling-terms-of-service` | `CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1` | `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1`: uncovered dependency; it cites the Kling Terms of Paid Service, which is not a pilot source |

A watch-only source has no mapped claim. Observing an index page or a feed does not detect a change inside a document it links to. `CLAIM-COPY-001/002/003-v1` cite a report published under the Copyright Office AI page; they are not mapped to that page and remain uncovered.

## Confirming the mapping

Every relationship and exclusion in `registry.json` has `confirmed_by: null` and `confirmed_on: null`. They are proposals, not confirmations.

M1's gate requires a named human to confirm the mapping for each pilot source. To confirm an entry, that person reviews it against the claim's "Source references" in the ledger and sets `confirmed_by` to their name and `confirmed_on` to the date, as a reviewed repository change. The tool never fills these in. An entry the reviewer disagrees with is corrected or removed, not confirmed.

## What validation checks

- **Sources:** required fields, no unknown fields, unique identifiers, exact `https` URLs, a consistent registered redirect chain, known class and retrieval method, an extraction rule for automated sources, an explicit tool or provider scope for provider and licence sources.
- **Baselines:** empty, or complete and accepted under the same extraction-rule version the entry declares.
- **Claim identity:** a mapped claim must be in the ledger. An unknown ID fails. A claim that is not approved (`Candidate`) fails. Ledger and runtime fixture must agree on a mapped claim's lifecycle.
- **Lifecycle change:** a mapped claim that has become `Deprecated` is flagged for review. The relationship stops counting as coverage and must not be used for any claim-impact conclusion. The registry is not `INVALID`.
- **Scope:** a scoped source is mapped only to claims that name the same tool or provider.
- **Source identity:** each relationship states `source_identity`.
  - `address_in_ledger`: the source's registered address must appear, as a complete address, in the claim's own "Source references". An index page does not match a document beneath it.
  - `attested`: not checked by the tool. The confirmer attests it and `basis_note` explains why.
- **Exclusions:** each states a `category`. `not_a_dependency` and `depends_on_unregistered_source` require a claim in the ledger. `not_in_ledger` requires that the source's manifest, or the file named in `evidence_path`, names that exact identifier.
- **Matrix identifiers:** rejected in relationships and exclusions.
- **Cross-checks:** every runtime claim naming a registered tool or provider is mapped or excluded; every claim ID named in a pointed-to evidence manifest is mapped or excluded.
- **Evidence:** if the ledger, a fixture or the Creator Record ledger cannot be read exactly as expected, the run is `INVALID`.

## Known limits

- **An address match is not documentary identity.** It shows the ledger names the same address. It does not show the page still holds the document the claim was governed against, and it reads addresses only, not titles or section numbers.
- A ledger entry that cites its source without an address cannot pass `address_in_ledger`; such a relationship needs `attested`.
- The mapping covers only the sources listed. Other dependencies may exist, and the report says so. Several mapped claims also cite authorities that are not registered (for example a pricing page or a bill-status page).
- `scope` identifiers are checked against the tool and provider names governed claims use. A source for a tool that no runtime claim names cannot be registered with a scope.
- `min_extracted_length`, `identity_markers` and `version_locator` are empty for every pilot source. They must be set before a first baseline is accepted (M4, not authorized).
- `cadence_class` values are labels only. Intervals are an open decision (OPEN-1).
- The extraction-rule identifiers (`html-text`, `json-feed`) name rules that do not exist yet. They are defined in M2.
- The ledger records that the New York statute page was fetched only after a challenge page, using browser-like request headers. Whether that source can stay `automated_http` under the PRD's retrieval rules is a question for M4 (OPEN-6).
