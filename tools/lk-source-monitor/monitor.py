#!/usr/bin/env python3
"""
SI8 Living Knowledge -- Source Monitor (LK Phase 1, 2026-08-16)
-----------------------------------------------------------------
Six-stage automation-proof pipeline, per PM's Phase E approval:

  1. Observe    -- fetch the two allowlisted copyright sources (sources.py)
  2. Detect     -- hash-compare against the last-seen state; skip unchanged
  3. Archive    -- save the raw snapshot to lk-automation/archive/, immutable
  4. Propose    -- Claude drafts a candidate claim in the GOVERNED-CLAIMS.md
                   template shape, or explicitly declines if nothing
                   claim-worthy changed
  5. Challenge  -- deterministic quote-verification (every "Source fact"
                   quote must appear verbatim in the archived raw content)
                   + Claude adversarial review against existing claims
  6. Assess     -- deterministic cross-reference against existing claim
     Impact        Topics in GOVERNED-CLAIMS.md, listing what might be
                   affected

Output is a single human review package (markdown, written to
lk-automation/review-packages/) plus a short email notification. This
script NEVER writes to GOVERNED-CLAIMS.md or topic-claims-fixture.ts --
see verify_no_mutation.py, which statically proves that invariant, and
run it as part of the same CI job that runs this script.
"""

import os
import re
import sys
import json
import hashlib
import argparse
from datetime import datetime, timezone
from pathlib import Path

import requests
from anthropic import Anthropic

from sources import SOURCES

REPO_ROOT = Path(__file__).parent.parent.parent
LK_AUTOMATION_DIR = REPO_ROOT / "06_Operations" / "institutional-knowledge" / "lk-automation"
STATE_PATH = LK_AUTOMATION_DIR / "state.json"
ARCHIVE_DIR = LK_AUTOMATION_DIR / "archive"
REVIEW_PACKAGES_DIR = LK_AUTOMATION_DIR / "review-packages"

# Read-only reference paths -- loaded to give Propose/Challenge/Assess Impact
# context on existing governed knowledge. verify_no_mutation.py statically
# checks every code line referencing either constant and fails unless that
# line is the definition itself or a read-only `.exists()`/`.read_text(...)`
# call -- never open either path in a write/append mode.
GOVERNED_CLAIMS_PATH = REPO_ROOT / "06_Operations" / "institutional-knowledge" / "notebook" / "GOVERNED-CLAIMS.md"
TOPIC_CLAIMS_FIXTURE_PATH = REPO_ROOT / "08_Platform" / "app" / "lib" / "retrieval-engine" / "topic-claims-fixture.ts"

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
TO_EMAIL = os.environ.get("LK_MONITOR_TO_EMAIL", "jd@superimmersive8.com")
FROM_EMAIL = os.environ.get("LK_MONITOR_FROM_EMAIL", "digest@superimmersive8.com")

client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


# ---------------------------------------------------------------------------
# Stage 1: Observe
# ---------------------------------------------------------------------------

def observe(source: dict) -> str:
    """Fetch raw content for one source. Returns the raw text as-is --
    no parsing, no summarization. What gets hashed and archived is exactly
    what the source returned."""
    response = requests.get(source["url"], timeout=30, headers={"User-Agent": "SI8-LK-Source-Monitor/1.0"})
    response.raise_for_status()
    return response.text


# ---------------------------------------------------------------------------
# Stage 2: Detect
# ---------------------------------------------------------------------------

def content_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


# Fields the Federal Register API rewrites between otherwise-identical calls
# (observed live, 2026-08-16: `next_page_url`/`previous_page_url` flip
# http<->https on successive requests to the same query with no content
# change at all). Hashing raw JSON directly would false-positive "changed"
# on every single scheduled run. Stripped only for the CHANGE-DETECTION
# hash below -- the archived snapshot and everything Propose/Challenge see
# still get the untouched raw content.
VOLATILE_JSON_KEYS = {"next_page_url", "previous_page_url"}


def _strip_volatile_keys(value):
    if isinstance(value, dict):
        return {k: _strip_volatile_keys(v) for k, v in value.items() if k not in VOLATILE_JSON_KEYS}
    if isinstance(value, list):
        return [_strip_volatile_keys(v) for v in value]
    return value


def stable_hash(source: dict, raw: str) -> str:
    """The hash used for change detection -- normalized to ignore fields
    known to vary independently of actual content. Falls back to a plain
    content hash for non-JSON sources, or if the JSON fails to parse (a
    parse failure is itself worth surfacing as a change, not silently
    swallowed)."""
    if source["kind"] != "json":
        return content_hash(raw)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return content_hash(raw)
    normalized = json.dumps(_strip_volatile_keys(parsed), sort_keys=True)
    return content_hash(normalized)


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    return {}


def save_state(state: dict) -> None:
    LK_AUTOMATION_DIR.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def detect_change(source: dict, raw: str, state: dict) -> bool:
    """True if this content's stable hash differs from the last-seen stable
    hash for this source (or there is no last-seen hash yet)."""
    return state.get(source["id"], {}).get("last_hash") != stable_hash(source, raw)


# ---------------------------------------------------------------------------
# Stage 3: Archive
# ---------------------------------------------------------------------------

def archive_snapshot(source: dict, raw: str, run_timestamp: str, dry_run: bool = False) -> Path:
    """Immutable raw-content snapshot. Never overwritten, never edited by any
    later stage -- the permanent record of exactly what the source said at
    this moment. In --dry-run, computes and returns the path that WOULD be
    used but never touches disk -- dry-run must leave this repo-tracked
    directory exactly as it found it."""
    ext = "json" if source["kind"] == "json" else "html"
    filename = f"{source['id']}_{run_timestamp}_{content_hash(raw)[:12]}.{ext}"
    path = ARCHIVE_DIR / filename
    if not dry_run:
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        path.write_text(raw, encoding="utf-8")
    return path


# ---------------------------------------------------------------------------
# Read-only context loaders (see the GOVERNED_CLAIMS_PATH /
# TOPIC_CLAIMS_FIXTURE_PATH comment above -- these are the one permitted
# reference site for each constant)
# ---------------------------------------------------------------------------

def load_existing_claims_text() -> str:
    if not GOVERNED_CLAIMS_PATH.exists():
        return ""
    return GOVERNED_CLAIMS_PATH.read_text(encoding="utf-8")


def load_existing_fixture_text() -> str:
    if not TOPIC_CLAIMS_FIXTURE_PATH.exists():
        return ""
    return TOPIC_CLAIMS_FIXTURE_PATH.read_text(encoding="utf-8")


def parse_existing_claim_headers(claims_text: str) -> list[dict]:
    """Regex-based, not a real markdown parser -- deliberately mirrors the
    same precedent already established by topic-claims-fixture-consistency
    .test.ts on the TypeScript side. Extracts claim_id/Topic/Lifecycle for
    Assess Impact cross-referencing only; never mutates the source text."""
    claims = []
    for block in claims_text.split("### ")[1:]:
        id_match = re.match(r"([A-Za-z0-9-]+)", block)
        topic_match = re.search(r"^Topic:\s*(.+)$", block, re.MULTILINE)
        lifecycle_match = re.search(r"^Lifecycle:\s*(\S+)", block, re.MULTILINE)
        if id_match and topic_match:
            claims.append({
                "claim_id": id_match.group(1).strip(),
                "topic": topic_match.group(1).strip(),
                "lifecycle": lifecycle_match.group(1).strip() if lifecycle_match else "unknown",
            })
    return claims


# ---------------------------------------------------------------------------
# Stage 4: Propose
# ---------------------------------------------------------------------------

PROPOSE_PROMPT = """You are drafting a CANDIDATE governed-knowledge claim for SuperImmersive 8's Living Knowledge system, following the exact entry template below. This is a DRAFT PROPOSAL ONLY for human review -- it is never auto-published, never auto-adopted, and never presented to any SI8 customer.

## Source that changed

Source: {source_name} ({source_url})
Raw content (verbatim, this is the ONLY evidence you may cite -- do not use outside knowledge):

{raw_content}

## Your task

Determine whether this content contains a legally-relevant fact, guidance update, ruling, or report that would justify a NEW or REVISED SI8 governed claim about AI video copyright/authorship in the U.S. If the change is not substantively new (e.g. a navigation update, unrelated blog post, formatting change, a document already covered by an existing claim below), say so explicitly and propose NOTHING -- do not manufacture a claim to have something to report.

## Existing claims already in the system (for context -- do not duplicate)

{existing_claims_summary}

## If a claim IS warranted, draft exactly one candidate claim using this template. Every "Source fact" quote must be copied VERBATIM from the raw content above -- word for word, not paraphrased, not reconstructed from memory. If you cannot find a verbatim quote supporting the claim, do not propose the claim.

```
### CLAIM-COPY-XXX-v1
Domain:
Topic:
Subtopic:
Claim character: established | conditional | unsettled
Jurisdiction:
Context:
Claim proposition: >

Source references:
  - primary: {source_name} -- {source_url}
Source authority/type: Primary legal/official authority
Source fact: >
  <VERBATIM quote from the raw content above -- copy exactly, do not paraphrase>

SI8 interpretation: >

Applicability requirements:
  - fact: jurisdiction
    operator: equals
    value:
Prohibited conclusions: >

Lifecycle: Candidate
Publication scope: Internal/research
```

Respond with ONLY one of:
(a) "NO CLAIM WARRANTED: <one sentence why>"
(b) the filled-in template above, nothing else."""


def propose_claim(source: dict, raw: str, existing_claims: list[dict]) -> str:
    if client is None:
        return "NO CLAIM WARRANTED: ANTHROPIC_API_KEY not configured -- Propose stage skipped, not a substantive assessment of this source's content."

    existing_summary = "\n".join(f"- {c['claim_id']} (Topic: {c['topic']}, Lifecycle: {c['lifecycle']})" for c in existing_claims) or "(none yet)"

    # Raw HTML/JSON can be large; cap what's sent to keep the call cheap and
    # keep the model's verbatim-quote requirement honest (it can't quote
    # content it never saw).
    truncated_raw = raw[:40000]

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=2000,
        messages=[{"role": "user", "content": PROPOSE_PROMPT.format(
            source_name=source["name"],
            source_url=source["url"],
            raw_content=truncated_raw,
            existing_claims_summary=existing_summary,
        )}],
    )
    return response.content[0].text.strip()


# ---------------------------------------------------------------------------
# Stage 5: Challenge
# ---------------------------------------------------------------------------

def extract_source_fact_quotes(proposal_text: str) -> list[str]:
    """Pulls the 'Source fact:' block's quoted content out of a proposal for
    deterministic verbatim-quote verification. Not an LLM call -- a proposal
    either contains a verifiable quote or it doesn't."""
    match = re.search(r"^Source fact:\s*>\s*\n((?:^\s{2,}.+\n?)+)", proposal_text, re.MULTILINE)
    if not match:
        return []
    block = match.group(1)
    # A single logical quote may span multiple indented lines; treat the
    # whole block as one quote (matches how the template's own examples read).
    return [re.sub(r"\s+", " ", block).strip()]


def verify_quotes_verbatim(quotes: list[str], raw: str) -> list[dict]:
    """Deterministic check: does each claimed quote actually appear in the
    archived raw content? Whitespace-normalized on both sides since HTML/JSON
    reflows whitespace; NOT fuzzy-matched -- a quote that isn't a real
    substring fails, full stop."""
    normalized_raw = re.sub(r"\s+", " ", raw)
    results = []
    for quote in quotes:
        results.append({
            "quote": quote,
            "verbatim_match": quote in normalized_raw,
        })
    return results


CHALLENGE_PROMPT = """You are an adversarial reviewer for SuperImmersive 8's Living Knowledge system. A candidate claim has been drafted from a source update. Your job is to find problems, not to approve it.

## Candidate claim

{proposal}

## Existing claims already in the system

{existing_claims_summary}

## Check for and report on:
1. Does this candidate CONTRADICT or DUPLICATE the substance of any existing claim listed above? Name the claim_id if so.
2. Does the "SI8 interpretation" or "Claim proposition" go further than the "Source fact" quote actually supports -- i.e. does it draw a conclusion the source didn't state?
3. Is the "Applicability requirements" section using only `jurisdiction` or `tool_plan_tier` as the fact type (these are the only two implemented in Phase 1 -- anything else silently breaks)?
4. Any other reason a human reviewer should be skeptical before adopting this.

Be terse. Bullet points only. If you find nothing wrong, say "No issues found" -- do not invent a problem to seem thorough."""


def challenge_claim(proposal_text: str, existing_claims: list[dict]) -> str:
    if client is None:
        return "Challenge step skipped (no ANTHROPIC_API_KEY)."
    existing_summary = "\n".join(f"- {c['claim_id']} (Topic: {c['topic']}, Lifecycle: {c['lifecycle']})" for c in existing_claims) or "(none yet)"
    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1000,
        messages=[{"role": "user", "content": CHALLENGE_PROMPT.format(proposal=proposal_text, existing_claims_summary=existing_summary)}],
    )
    return response.content[0].text.strip()


# ---------------------------------------------------------------------------
# Stage 6: Assess Impact
# ---------------------------------------------------------------------------

def assess_impact(proposal_text: str, existing_claims: list[dict]) -> list[dict]:
    """Deterministic, not LLM-based: pulls the proposal's own Topic: line and
    lists every existing claim sharing that same Topic, so a human reviewer
    sees at a glance what this might supersede, conflict with, or relate to."""
    topic_match = re.search(r"^Topic:\s*(.+)$", proposal_text, re.MULTILINE)
    if not topic_match:
        return []
    proposal_topic = topic_match.group(1).strip()
    return [c for c in existing_claims if c["topic"] == proposal_topic]


# ---------------------------------------------------------------------------
# Build + write the human review package
# ---------------------------------------------------------------------------

def build_review_package(
    source: dict,
    archive_path: Path,
    raw_hash: str,
    proposal_text: str,
    quote_checks: list[dict],
    challenge_text: str,
    impacted_claims: list[dict],
    run_timestamp: str,
) -> str:
    no_claim = proposal_text.startswith("NO CLAIM WARRANTED")

    quote_check_lines = "\n".join(
        f"- {'PASS' if q['verbatim_match'] else 'FAIL -- not found verbatim in archived source'}: \"{q['quote'][:200]}{'...' if len(q['quote']) > 200 else ''}\""
        for q in quote_checks
    ) or "(no quotes to verify)"

    impact_lines = "\n".join(f"- {c['claim_id']} (Lifecycle: {c['lifecycle']})" for c in impacted_claims) or "(none -- no existing claim shares this Topic)"

    any_quote_failed = any(not q["verbatim_match"] for q in quote_checks)

    return f"""# LK Source Monitor -- Human Review Package

**Source:** {source['name']} ({source['url']})
**Run:** {run_timestamp}
**Archived snapshot:** `{archive_path.relative_to(REPO_ROOT).as_posix()}` (sha256: `{raw_hash}`)

**Status:** {"NO CLAIM PROPOSED" if no_claim else "CANDIDATE CLAIM DRAFTED -- awaiting human review"}

---

## Stage 4 -- Propose

{proposal_text}

---

## Stage 5 -- Challenge

### Deterministic verbatim-quote verification
{"**⚠️ AT LEAST ONE QUOTE FAILED VERIFICATION -- do not adopt without manual re-check.**" if any_quote_failed else ""}
{quote_check_lines}

### Adversarial review (Claude)
{challenge_text}

---

## Stage 6 -- Assess Impact

Existing claims sharing this candidate's Topic:
{impact_lines}

---

## Next step (human-only -- this pipeline cannot do this step)

This package is informational only. Nothing in this repository's Lifecycle, Publication scope, or CRC-eligible fields has been changed by this run. To adopt any part of this proposal:

1. Independently re-verify the primary source yourself (this pipeline's quote check proves the quote exists in the archived snapshot, not that the snapshot is being read correctly or that the claim is legally sound).
2. Manually add/edit the entry in `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md`.
3. Manually mirror it into `08_Platform/app/lib/retrieval-engine/topic-claims-fixture.ts`.
4. Run the fixture-consistency test (`topic-claims-fixture-consistency.test.ts`) to confirm the two stay in sync.
5. Set `CRC Approver` to a real named human and `CRC Decision Date` before any `Lifecycle: Adopted` or `Publication scope: CRC eligible` change.
"""


# ---------------------------------------------------------------------------
# Email notification (summary only -- never the full draft claim text, to
# avoid any appearance that an emailed claim is "approved")
# ---------------------------------------------------------------------------

def send_notification(source: dict, package_path: Path, no_claim: bool, dry_run: bool) -> None:
    if dry_run or not RESEND_API_KEY:
        print(f"  [notify skipped -- dry_run={dry_run}, resend_key_present={bool(RESEND_API_KEY)}]")
        return

    subject = f"LK Source Monitor: {'no claim proposed' if no_claim else 'candidate claim drafted'} -- {source['name']}"
    html = f"""<p>The SI8 Living Knowledge source monitor detected a change at <b>{source['name']}</b>.</p>
<p>{'No candidate claim was proposed for this change.' if no_claim else 'A candidate claim was drafted and needs human review.'}</p>
<p>Review package: <code>{package_path.relative_to(REPO_ROOT).as_posix()}</code></p>
<p style="color:#888;font-size:12px;">This is an automated notification. No claim, lifecycle, or publication field has been changed. Nothing here is CRC-visible.</p>"""

    response = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={"from": FROM_EMAIL, "to": [TO_EMAIL], "subject": subject, "html": html},
        timeout=15,
    )
    if response.status_code in (200, 201):
        print(f"  ✓ Notification sent to {TO_EMAIL}")
    else:
        print(f"  ✗ Notification failed: {response.status_code} {response.text}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="SI8 Living Knowledge Source Monitor")
    parser.add_argument("--dry-run", action="store_true", help="Run the full pipeline but do not send email or persist state")
    parser.add_argument("--source", type=str, default=None, help="Only process this source id (for local testing)")
    args = parser.parse_args()

    run_timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    print(f"LK Source Monitor -- run {run_timestamp} (dry_run={args.dry_run})\n")

    state = load_state()
    existing_claims = parse_existing_claim_headers(load_existing_claims_text())
    sources = [s for s in SOURCES if args.source is None or s["id"] == args.source]

    any_processed = False

    for source in sources:
        print(f"Observing: {source['name']}")
        try:
            raw = observe(source)
        except Exception as e:
            print(f"  ✗ Fetch failed: {e}", file=sys.stderr)
            continue

        if not detect_change(source, raw, state):
            print("  → no change since last run, skipping\n")
            continue

        any_processed = True
        print("  → change detected")

        archive_path = archive_snapshot(source, raw, run_timestamp, dry_run=args.dry_run)
        print(f"  → {'[dry-run] would archive' if args.dry_run else 'archived'}: {archive_path.relative_to(REPO_ROOT)}")

        proposal_text = propose_claim(source, raw, existing_claims)
        no_claim = proposal_text.startswith("NO CLAIM WARRANTED")
        print(f"  → propose: {'no claim warranted' if no_claim else 'candidate claim drafted'}")

        quotes = extract_source_fact_quotes(proposal_text) if not no_claim else []
        quote_checks = verify_quotes_verbatim(quotes, raw)

        challenge_text = challenge_claim(proposal_text, existing_claims) if not no_claim else "(skipped -- no claim to challenge)"

        impacted = assess_impact(proposal_text, existing_claims) if not no_claim else []

        package_md = build_review_package(
            source, archive_path, content_hash(raw), proposal_text,
            quote_checks, challenge_text, impacted, run_timestamp,
        )

        package_path = REVIEW_PACKAGES_DIR / f"REVIEW-{run_timestamp}-{source['id']}.md"
        if not args.dry_run:
            REVIEW_PACKAGES_DIR.mkdir(parents=True, exist_ok=True)
            package_path.write_text(package_md, encoding="utf-8")
            print(f"  → review package written: {package_path.relative_to(REPO_ROOT)}")
        else:
            print("  → [dry-run] review package not written; preview follows:\n")
            print(package_md)

        send_notification(source, package_path, no_claim, args.dry_run)

        if not args.dry_run:
            state[source["id"]] = {"last_hash": stable_hash(source, raw), "last_checked": run_timestamp}

        print()

    if not any_processed:
        print("No changes detected at any source. Nothing to do.")

    if not args.dry_run:
        save_state(state)
        print("State updated.")


if __name__ == "__main__":
    main()
