"""
SI8 News Intelligence -- authoritative Development priority (SI8-INTEL-
NEWS-4B, repaired).

This is a SEPARATE semantic job from bounded interpretation, and a
separate model call: interpretation answers "what does the evidence
support" for one Development in isolation; priority answers "given what
the evidence supports, how should SI8 act on this relative to everything
else admitted this cycle" -- a genuinely comparative judgment, batched so
the model sees multiple already-interpreted Developments together (mirrors
digest.py's existing score_batch batching pattern, but over bounded
interpretation text, never raw articles).

REPAIR CONTEXT (SI8-INTEL-NEWS-4B Pre-Implementation Architecture Repair):
the original NEWS-4B proposal computed priority BEFORE interpretation, as
deterministic arithmetic over article-level score + a corroboration bonus +
a cluster weight. That was rejected: article relevance_score measures
in-domain plausibility, not materiality; the cluster-priority table was
design-time prose, never validated as a materiality signal; source count
is confidence evidence, not importance. None of those concepts are
reintroduced here under a different name -- this module receives ONLY
already-bounded Development interpretation, never raw articles, never
article-level relevance_score, and never cluster identity.

No numeric score is produced. Investigation found no repository dependency
that actually requires one (the legacy email/log's numeric column is
retired presentation, not a live dependency -- see digest.py's NEWS-4B
cutover). The output is a closed three-value tier plus a grounded
rationale -- honest about the precision actually available, not a
continuation of the old 1-10 scale for its own sake.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from development import Development
from interpretation import BoundedInterpretation
from policy import PRIORITY_BATCH_SIZE

PRIORITY_TIERS = {"HIGH", "MONITOR", "OMIT"}


@dataclass
class DevelopmentPriority:
    """The authoritative intelligence judgment for one Development, made
    AFTER its bounded interpretation exists. `degraded=True` marks a
    fail-closed fallback (model/parse/validation failure), never a real
    judgment -- composition/rendering surfaces this distinction rather
    than presenting a degraded default as a genuine assessment."""

    development_id: str
    tier: str  # one of PRIORITY_TIERS
    rationale: str
    degraded: bool = False


PRIORITY_PROMPT = """You are making an intelligence-triage judgment for SuperImmersive 8 (SI8) -- deciding how prominently each of the following {n} already-interpreted developments deserves to appear in today's intelligence digest.

You are given ONLY each development's already-bounded intelligence interpretation below -- not raw news articles, not any article-level relevance score, and not which taxonomy category discovered it. Judge each development strictly on the substance described.

For each development, classify it into exactly one tier:

- "HIGH" -- materially important enough to foreground prominently this cycle: a genuine legal, regulatory, or commercial development with real, current or clearly imminent consequence for SI8's business, product, market, or customers.
- "MONITOR" -- relevant and worth tracking, but the evidence or materiality does not yet justify HIGH (early-stage, low-confidence, narrow in scope, or modest consequence).
- "OMIT" -- interpreted, but not sufficiently useful or material to include in the digest at all.

IMPORTANT -- none of the following may mechanically drive your judgment upward:
- how many independent sources reported the development (more sources is evidence something happened, not evidence it matters more -- judge materiality from the substance, not the coverage volume, noted below only as "corroboration" context);
- which topic category the development happens to belong to (not shown to you at all -- it is irrelevant to this judgment);
- how confidently a source states something, if the development's own uncertainty_watch says the point remains unresolved, unconfirmed, allegation-only, or proposed-not-enacted -- an unresolved matter stays unresolved regardless of how many outlets repeat it.

A development supported by only one source can be HIGH if the underlying substance is genuinely material. A development covered by many sources can be MONITOR or OMIT if, on the substance, it isn't.

Developments:
{developments_block}

Return ONLY a JSON array of exactly {n} objects, one per development, in any order, each with exactly these keys:
- "development_id": the exact id string given below
- "priority_tier": one of "HIGH", "MONITOR", "OMIT"
- "priority_rationale": one short sentence grounded specifically in THIS development's source_facts/si8_relevance/uncertainty_watch -- never a generic sentence that could apply to any development.

No prose, no markdown fences."""


def _format_priority_block(batch: list[tuple[Development, BoundedInterpretation]]) -> str:
    lines = []
    for development, interp in batch:
        lines.append(
            f"- id: {development.id}\n"
            f"  title: {development.canonical_title}\n"
            f"  source_facts: {interp.source_facts}\n"
            f"  si8_relevance: {interp.si8_relevance}\n"
            f"  uncertainty_watch: {interp.uncertainty_watch}\n"
            f"  action: {interp.action}\n"
            f"  corroboration: {development.source_count} independent source(s)"
        )
    return "\n".join(lines)


def validate_priority_batch(raw, expected_ids: set[str]) -> list[DevelopmentPriority] | None:
    """Deterministic structured-output validation. Returns None (never
    raises) on any malformed response, unknown/duplicate/missing id, or
    invalid tier value."""
    if not isinstance(raw, list):
        return None
    seen_ids: set[str] = set()
    results: list[DevelopmentPriority] = []
    for item in raw:
        if not isinstance(item, dict):
            return None
        dev_id = item.get("development_id")
        tier = item.get("priority_tier")
        rationale = item.get("priority_rationale")
        if not isinstance(dev_id, str) or dev_id not in expected_ids or dev_id in seen_ids:
            return None
        if tier not in PRIORITY_TIERS:
            return None
        if not isinstance(rationale, str) or not rationale.strip():
            return None
        seen_ids.add(dev_id)
        results.append(DevelopmentPriority(development_id=dev_id, tier=tier, rationale=rationale.strip()))
    if seen_ids != expected_ids:
        return None
    return results


def _fallback_priority_batch(developments: list[Development], *, reason: str) -> list[DevelopmentPriority]:
    """Fail-closed default for an entire batch. Deliberately conservative:
    every Development in a failed batch degrades to MONITOR -- never HIGH,
    never OMIT (OMIT would silently drop a Development from the digest
    entirely, which is its own kind of fabricated conclusion -- "this
    doesn't matter" is not a safe default when the judgment step failed)."""
    return [
        DevelopmentPriority(
            development_id=d.id,
            tier="MONITOR",
            rationale=f"Priority classification unavailable ({reason}); shown at a conservative default tier pending review.",
            degraded=True,
        )
        for d in developments
    ]


def classify_priority_batch(
    batch: list[tuple[Development, BoundedInterpretation]],
    *,
    client,
    model: str,
) -> list[DevelopmentPriority]:
    """Classify one batch of already-interpreted Developments. On ANY
    failure (network, parse, schema, unknown id, invalid tier), the whole
    batch falls back to the conservative MONITOR default -- never raises,
    never fabricates HIGH."""
    developments = [d for d, _ in batch]
    if not developments:
        return []
    if client is None:
        return _fallback_priority_batch(developments, reason="no model client provided")

    prompt = PRIORITY_PROMPT.format(
        developments_block=_format_priority_block(batch),
        n=len(batch),
    )
    try:
        response = client.messages.create(
            model=model,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        if "```" in text:
            match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
            if match:
                text = match.group(1)
        raw = json.loads(text)
    except Exception:
        return _fallback_priority_batch(developments, reason="model call or response parsing failed")

    expected_ids = {d.id for d in developments}
    validated = validate_priority_batch(raw, expected_ids)
    if validated is None:
        return _fallback_priority_batch(developments, reason="structured output failed schema validation")
    return validated


def prioritize_developments(
    interpreted: list[tuple[Development, BoundedInterpretation]],
    *,
    client=None,
    model: str = "claude-haiku-4-5-20251001",
    batch_size: int = PRIORITY_BATCH_SIZE,
) -> list[DevelopmentPriority]:
    """Batch-classify every already-interpreted Development. Only
    triage-admitted, interpreted Developments should ever reach this
    function -- a Development that was never admitted by triage has no
    DevelopmentPriority at all (DEFERRED), which is explicitly distinct
    from OMIT (interpreted, then judged not material enough to include)."""
    results: list[DevelopmentPriority] = []
    for i in range(0, len(interpreted), batch_size):
        batch = interpreted[i : i + batch_size]
        results.extend(classify_priority_batch(batch, client=client, model=model))
    return results
