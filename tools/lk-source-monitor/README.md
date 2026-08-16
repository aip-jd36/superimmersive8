# SI8 Living Knowledge — Source Monitor

Automation-proof for the SI8 Living Knowledge Expansion (Phase 1, PRD v0.2). Watches exactly two allowlisted primary sources for U.S. copyright/AI guidance, and — when either changes — runs a six-stage pipeline that produces a **human review package**. It never adds, edits, or publishes a governed claim itself.

Mirrors `tools/news-digest/`'s pattern (fetch → process → archive → notify), adapted for legal-knowledge governance instead of marketing content.

## The six stages

1. **Observe** — fetch raw content from each source in `sources.py`
2. **Detect** — SHA-256 compare against the last-seen hash (`06_Operations/institutional-knowledge/lk-automation/state.json`); unchanged sources are skipped
3. **Archive** — save the raw snapshot immutably to `06_Operations/institutional-knowledge/lk-automation/archive/`
4. **Propose** — Claude drafts a candidate claim in `GOVERNED-CLAIMS.md`'s own entry template, quoting only text verbatim from the archived snapshot — or explicitly declines if nothing claim-worthy changed
5. **Challenge** — a deterministic check (does every quoted "Source fact" actually appear in the archived raw content?) plus a second, adversarial Claude pass looking for contradiction with existing claims, unsupported leaps from source to interpretation, or a disallowed `Applicability requirements` fact type
6. **Assess Impact** — deterministic cross-reference against `GOVERNED-CLAIMS.md`'s existing claim Topics, listing what the candidate might relate to or supersede

Output: one markdown file in `06_Operations/institutional-knowledge/lk-automation/review-packages/`, plus a short email notification (summary + file path only — never the draft claim text itself, so nothing in the inbox could be mistaken for an approved claim).

## The one invariant that matters

**This tool cannot adopt or publish a claim.** It has no write access, anywhere in its code, to `GOVERNED-CLAIMS.md` or `topic-claims-fixture.ts`. `verify_no_mutation.py` statically proves this — every line in `monitor.py` that references either file's path constant must be the constant's own definition or a read-only `.exists()`/`.read_text()` call; anything else fails the check. Run it in CI alongside `monitor.py`, same as `subsystem-boundaries.test.ts` does on the TypeScript side for CRC's own subsystem boundaries.

Adopting a proposal is always a manual, human act: edit `GOVERNED-CLAIMS.md`, mirror it into `topic-claims-fixture.ts`, run the existing fixture-consistency test, and set a real named `CRC Approver` — see each review package's own "Next step" section.

## Setup (one-time)

Same two GitHub Secrets `tools/news-digest/` already uses — no new secrets needed:

| Secret name | Value |
|-------------|-------|
| `ANTHROPIC_API_KEY` | Claude API key |
| `RESEND_API_KEY` | Resend API key (notification email only) |

## Running locally

```bash
cd tools/lk-source-monitor
pip install -r requirements.txt

export ANTHROPIC_API_KEY=sk-ant-...
export RESEND_API_KEY=re_...

# Full run
python monitor.py

# Dry run: prints the review package instead of writing it, skips email/state persistence
python monitor.py --dry-run

# Test a single source
python monitor.py --source uscoai-ai-page --dry-run

# Prove the no-mutation invariant
python verify_no_mutation.py
```

## Adding a source

Two sources only, by deliberate PM decision (LK Phase 1 scope). Adding a third is a scope decision, not a config tweak — edit `sources.py` and note the addition and its rationale in `06_Operations/institutional-knowledge/lk-automation/README.md`.
