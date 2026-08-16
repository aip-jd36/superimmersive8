# LK Source Monitor — data directory

Output of `tools/lk-source-monitor/monitor.py` (LK Phase 1, 2026-08-16). See that tool's own README for the full six-stage pipeline description.

## Contents

- `state.json` — last-seen content hash per source, so unchanged sources are skipped on the next run. Committed to the repo, same pattern as `DIGEST-LOG.md` for `tools/news-digest/`.
- `archive/` — immutable raw-content snapshots, one file per detected change, named `<source-id>_<timestamp>_<hash-prefix>.<ext>`. Never edited after being written; this is the permanent record of exactly what a source said at a given moment.
- `review-packages/` — one markdown file per detected change, containing the drafted candidate claim (or an explicit "no claim warranted" note), the deterministic quote-verification result, an adversarial Claude review, and an impact-assessment cross-reference against existing `GOVERNED-CLAIMS.md` entries.

## Nothing here is governed knowledge

Everything in this directory is automation output awaiting human review. A file existing in `review-packages/` means a candidate was drafted — it does **not** mean anything has been adopted, published, or made CRC-eligible. `GOVERNED-CLAIMS.md` and `topic-claims-fixture.ts` are edited manually, by a human, after independent primary-source re-verification — never by this pipeline. See `tools/lk-source-monitor/verify_no_mutation.py` for the static proof that the pipeline has no code path to do otherwise.

## Sources monitored

Exactly two, by deliberate PM decision (LK Phase 1 scope) — see `tools/lk-source-monitor/sources.py`:
1. U.S. Copyright Office AI Initiative page (`copyright.gov/ai/`)
2. Federal Register — U.S. Copyright Office documents (official API, agency-filtered)
