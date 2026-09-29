"""
SI8 News Intelligence -- IntelligenceDigest composition (SI8-INTEL-NEWS-4B,
repaired).

Composition presents already-authorized intelligence. It does not, and
structurally cannot, upgrade it:

  - PRIORITY controls HIGH/MONITOR/OMIT membership, ordering, and
    prominence -- composition only reads `DevelopmentPriority.tier`, never
    assigns or recomputes it.
  - Composition never writes to a `BoundedInterpretation` or
    `DevelopmentPriority` object -- every function here is read-only over
    its inputs (see tests/test_composition.py's object-identity checks).
  - The Executive Summary is the one place composition itself calls a
    model -- and its input surface is deliberately the narrowest in the
    whole pipeline (HIGH-tier bounded fields only, see build_executive_
    summary), with an explicit MAY-SYNTHESIZE/MAY-NOT-UPGRADE contract and
    ID-provenance validation that rejects the whole summary on any
    unknown reference.

No Living Knowledge / CRC import or call of any kind (see
tests/test_boundary.py). An `action` of "review_living_knowledge" or
"review_product_implications" is projected into `lk_product_signals` as a
plain review-queue entry -- never as a claim that governed knowledge is
wrong or must change.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

from development import Development
from interpretation import BoundedInterpretation
from policy import EXECUTIVE_SUMMARY_MAX_SOURCE_DEVELOPMENTS, EXECUTIVE_SUMMARY_MAX_STATEMENTS
from prioritization import DevelopmentPriority
from triage import TriageResult, is_capacity_deferred, is_relevance_excluded

HighItem = tuple[Development, BoundedInterpretation, DevelopmentPriority]
MonitorItem = tuple[Development, BoundedInterpretation, DevelopmentPriority]
SignalItem = tuple[Development, BoundedInterpretation]

# Actions that project into the LK/Product Signals section -- a plain
# internal review queue, never a conclusion about governed knowledge.
_LK_PRODUCT_ACTIONS = {"review_living_knowledge", "review_product_implications"}
_MARKETING_ACTION = "consider_marketing_opportunity"


# ---------------------------------------------------------------------------
# Executive Summary
# ---------------------------------------------------------------------------


@dataclass
class SummaryStatement:
    text: str
    supporting_development_ids: list[str]


@dataclass
class ExecutiveSummary:
    statements: list[SummaryStatement]


SUMMARY_PROMPT = """You are synthesizing an executive intelligence summary for SuperImmersive 8 (SI8) from a set of already-interpreted, HIGH-priority developments. You are given ONLY each development's id, title, and its already-bounded interpretation (source facts, SI8 relevance, uncertainty/watch) -- no raw news articles, no article-level scores, no other developments.

YOU MAY SYNTHESIZE. YOU MAY NOT UPGRADE.

Synthesizing means noticing a genuine pattern across multiple developments, or stating a literal, countable fact about the set you were given (e.g. "Three of today's developments concern synthetic-performer disclosure").

Upgrading means turning a weaker statement into a stronger one that isn't actually supported by what you were given. You must NEVER perform any of these upgrades, even implicitly through word choice:
- uncertainty -> certainty
- allegation -> established fact
- proposal/bill -> enacted, currently-binding rule
- one isolated example -> an industry-wide trend (you may state only what the count of examples in front of you actually supports -- never that it "proves" a trend)
- possible/interpretive relevance to SI8 -> a definite commercial consequence
- a "review Living Knowledge" signal -> a claim that governed knowledge is wrong or must change

If a development's uncertainty_watch says something is unresolved, unconfirmed, alleged, or proposed, your synthesis must preserve that qualifier -- never drop it for smoother prose.

Developments:
{developments_block}

Return ONLY a JSON object with exactly one key, "statements": a JSON array of at most {max_statements} objects, each with exactly these keys:
- "text": one synthesized sentence or short clause
- "supporting_development_ids": a non-empty JSON array of the exact development id string(s), copied verbatim from the ids given above, that support this statement

Every id you use MUST be exactly one of the ids given above -- never invent one. If nothing meaningfully rises to the level of an executive synthesis, return {{"statements": []}}. No prose, no markdown fences."""

_BANNED_UPGRADE_PHRASES = (
    "proves that",
    "confirms that this is now",
    "is now legally required",
    "the law now mandates",
    "establishes that all",
    "industry-wide requirement",
    "conclusively shows",
    "is now settled law",
    "definitively shows",
)


def _format_summary_block(candidates: list[HighItem]) -> str:
    lines = []
    for development, interp, _priority in candidates:
        lines.append(
            f"- id: {development.id}\n"
            f"  title: {development.canonical_title}\n"
            f"  source_facts: {interp.source_facts}\n"
            f"  si8_relevance: {interp.si8_relevance}\n"
            f"  uncertainty_watch: {interp.uncertainty_watch}"
        )
    return "\n".join(lines)


def validate_executive_summary(raw, allowed_ids: set[str]) -> ExecutiveSummary | None:
    """Deterministic validation. ANY reference to an id outside
    `allowed_ids` rejects the ENTIRE summary (not just that statement) --
    a response that hallucinated one id is not trustworthy on the rest."""
    if not isinstance(raw, dict) or "statements" not in raw:
        return None
    statements_raw = raw["statements"]
    if not isinstance(statements_raw, list) or len(statements_raw) > EXECUTIVE_SUMMARY_MAX_STATEMENTS:
        return None
    statements: list[SummaryStatement] = []
    for item in statements_raw:
        if not isinstance(item, dict):
            return None
        text = item.get("text")
        ids = item.get("supporting_development_ids")
        if not isinstance(text, str) or not text.strip():
            return None
        if not isinstance(ids, list) or not ids:
            return None
        for dev_id in ids:
            if not isinstance(dev_id, str) or dev_id not in allowed_ids:
                return None
        statements.append(SummaryStatement(text=text.strip(), supporting_development_ids=list(ids)))
    return ExecutiveSummary(statements=statements)


def _contains_banned_upgrade_phrase(summary: ExecutiveSummary) -> bool:
    """A heuristic secondary safeguard only -- explicitly not proof of
    semantic entailment, just a cheap net for the most obvious upgrades."""
    combined = " ".join(s.text.lower() for s in summary.statements)
    return any(phrase in combined for phrase in _BANNED_UPGRADE_PHRASES)


def build_executive_summary(
    high: list[HighItem],
    *,
    client=None,
    model: str = "claude-haiku-4-5-20251001",
) -> ExecutiveSummary | None:
    """Returns None (omit) on any failure, on empty input, or when the
    model itself reports nothing worth synthesizing -- never raises, never
    fabricates. Input is strictly HIGH-tier bounded interpretation fields
    (never raw articles, never MONITOR/OMIT items, never article-level
    scores) -- this scope restriction is the primary structural defense
    against a MONITOR item being rhetorically promoted into the summary:
    it is simply absent from the summary's context."""
    if not high or client is None:
        return None

    candidates = high[:EXECUTIVE_SUMMARY_MAX_SOURCE_DEVELOPMENTS]
    allowed_ids = {development.id for development, _, _ in candidates}
    prompt = SUMMARY_PROMPT.format(
        developments_block=_format_summary_block(candidates),
        max_statements=EXECUTIVE_SUMMARY_MAX_STATEMENTS,
    )
    try:
        response = client.messages.create(
            model=model,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        if "```" in text:
            match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
            if match:
                text = match.group(1)
        raw = json.loads(text)
    except Exception:
        return None

    validated = validate_executive_summary(raw, allowed_ids)
    if validated is None:
        return None
    if _contains_banned_upgrade_phrase(validated):
        return None
    if not validated.statements:
        return None
    return validated


# ---------------------------------------------------------------------------
# IntelligenceDigest
# ---------------------------------------------------------------------------


@dataclass
class IntelligenceDigest:
    date: str
    executive_summary: ExecutiveSummary | None
    high: list[HighItem]
    monitor: list[MonitorItem]
    lk_product_signals: list[SignalItem]
    marketing_opportunities: list[SignalItem]
    deferred_count: int
    # SI8-INTEL-NEWS-4C1: `deferred_count` above is kept unchanged (still
    # the total of both dispositions, for any existing reader of that one
    # number) but is no longer the only signal available -- these two
    # fields preserve the distinction triage.py already makes, so
    # presentation can never again attribute a relevance-floor exclusion
    # to admission capacity (or vice versa). Always
    # deferred_count == relevance_excluded_count + capacity_deferred_count.
    relevance_excluded_count: int = 0
    capacity_deferred_count: int = 0
    degraded_notes: list[str] = field(default_factory=list)


def _earliest_pub_date(development: Development):
    dates = [a.get("pub_date") for a in development.articles if a.get("pub_date")]
    return max(dates) if dates else datetime.min.replace(tzinfo=timezone.utc)


def build_intelligence_digest(
    developments: list[Development],
    triage_results: list[TriageResult],
    interpreted: list[tuple[Development, BoundedInterpretation]],
    priorities: list[DevelopmentPriority],
    *,
    client=None,
    model: str = "claude-haiku-4-5-20251001",
    date_str: str,
) -> IntelligenceDigest:
    """Composes already-authorized intelligence into the structures the
    renderer needs. Reads `DevelopmentPriority.tier`/`BoundedInterpretation
    .action` -- never assigns or recomputes either."""
    interp_by_id = {development.id: interp for development, interp in interpreted}
    dev_by_id = {development.id: development for development in developments}

    high: list[HighItem] = []
    monitor: list[MonitorItem] = []
    lk_signals: list[SignalItem] = []
    marketing: list[SignalItem] = []
    degraded_notes: list[str] = []

    for priority in priorities:
        development = dev_by_id.get(priority.development_id)
        interp = interp_by_id.get(priority.development_id)
        if development is None or interp is None:
            # Defensive only -- should be structurally impossible given
            # prioritize_developments only ever sees ids it was handed.
            continue

        if priority.degraded:
            degraded_notes.append(
                f"Priority classification degraded for \"{development.canonical_title}\": {priority.rationale}"
            )

        if priority.tier == "HIGH":
            high.append((development, interp, priority))
        elif priority.tier == "MONITOR":
            monitor.append((development, interp, priority))
        # OMIT: interpreted, deliberately excluded from both sections.

        if interp.action in _LK_PRODUCT_ACTIONS:
            lk_signals.append((development, interp))
        if interp.action == _MARKETING_ACTION:
            marketing.append((development, interp))

    # Ordering is deliberately recency, not a second invented ranking on
    # top of the tier itself -- the tier IS the materiality judgment;
    # anything finer would be fake precision this repair explicitly
    # rejected for the priority stage itself (see prioritization.py).
    high.sort(key=lambda item: _earliest_pub_date(item[0]), reverse=True)
    monitor.sort(key=lambda item: _earliest_pub_date(item[0]), reverse=True)

    relevance_excluded_count = sum(1 for t in triage_results if is_relevance_excluded(t))
    capacity_deferred_count = sum(1 for t in triage_results if is_capacity_deferred(t))
    deferred_count = relevance_excluded_count + capacity_deferred_count

    executive_summary = build_executive_summary(high, client=client, model=model)

    return IntelligenceDigest(
        date=date_str,
        executive_summary=executive_summary,
        high=high,
        monitor=monitor,
        lk_product_signals=lk_signals,
        marketing_opportunities=marketing,
        deferred_count=deferred_count,
        relevance_excluded_count=relevance_excluded_count,
        capacity_deferred_count=capacity_deferred_count,
        degraded_notes=degraded_notes,
    )
