# Living Knowledge source registry (Source Monitoring, Phase A, M1)

Offline registry of monitored sources and the human-confirmed mapping from each source to the governed Living Knowledge claims that depend on it.

Contract: `08_Platform/prds/PRD_LK_SOURCE_MONITORING_v0.2.md` (M1: §5.1 FR-1 to FR-4, FR-8, FR-17 to FR-23, §6.1, §6.2, §9.1, §12.2).

## What this is, and is not

- It **observes records**. It reads the registry, the governed ledger, the runtime fixtures, the Creator Record ledger and evidence manifests, and reports whether they agree.
- It is **not a claim authority**. Claim identity and lifecycle come from `GOVERNED-CLAIMS.md`. Nothing about a claim is stored here except its ID.
- It **writes nothing**, fetches nothing and calls no model. There is no source retrieval, schedule, change detection or alert in M1.
- It says nothing about whether a claim is valid, current, stale or cleared. An accepted mapping is not a review of any claim.
- The Legacy Matrix is frozen and is **not mapped**. CRC-eligible Matrix claims are listed in a separate "CRC-reachable, not monitored" section, as an observation only.

## Files

| File | Purpose |
|---|---|
| `registry.json` | The six pilot sources, proposed relationships and exclusions. All baselines are empty |
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
| 0 | `VALID` | No error and every relationship and exclusion is confirmed by a named human |
| 2 | `VALID_PENDING_CONFIRMATION` | No error, but at least one relationship or exclusion is still only proposed |
| 1 | `INVALID` | At least one error. The source and coverage sections are withheld; the Matrix section is still printed |

No CI job runs these tests. Run them locally before changing the registry.

## Confirming the mapping

Every relationship and exclusion in `registry.json` currently has `confirmed_by: null` and `confirmed_on: null`. They are proposals read from the ledger and manifests, not confirmations.

M1's gate requires a named human to confirm the mapping for each pilot source. To confirm an entry, that person reviews it and sets `confirmed_by` to their name and `confirmed_on` to the date, as a reviewed repository change. The tool never fills these in. An entry the reviewer disagrees with is corrected or removed, not confirmed.

Three proposed relationships map the Copyright Office AI page to `CLAIM-COPY-001/002/003-v1`. Their basis is indirect (the claims cite a report published under that page) and deserves particular attention at confirmation.

## What validation checks

- **Sources:** required fields, no unknown fields, unique identifiers, exact `https` URLs, a consistent registered redirect chain, known class and retrieval method, an extraction rule for automated sources, an explicit tool or provider scope for provider and licence sources.
- **Baselines:** empty, or complete and accepted under the same extraction-rule version the entry declares.
- **Relationships:** the claim exists in the ledger and is `Adopted`; ledger and runtime fixture agree on its lifecycle; the basis path exists; a scoped source is mapped only to claims that name the same tool or provider.
- **Matrix identifiers:** rejected in relationships and exclusions.
- **Cross-checks:** every runtime claim naming a registered tool or provider is mapped or excluded; every claim ID named in a pointed-to evidence manifest is mapped or excluded.
- **Evidence:** if the ledger, a fixture or the Creator Record ledger cannot be read exactly as expected, the run is `INVALID`.

## Known limits

- The mapping is confirmed only for the sources listed. Other dependencies may exist, and the report says so.
- `scope` identifiers are checked against the tool and provider names governed claims use. A source for a tool that no runtime claim names cannot be registered with a scope.
- `min_extracted_length`, `identity_markers` and `version_locator` are empty for every pilot source. They must be set before a first baseline is accepted (M4, not authorized).
- `cadence_class` values are labels only. Intervals are an open decision (OPEN-1).
- The extraction-rule identifiers (`html-text`, `json-feed`) name rules that do not exist yet. They are defined in M2.
