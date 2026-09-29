"""
SI8 News Intelligence -- run audit trail (SI8-INTEL-NEWS-4C).

OBSERVABILITY ONLY. This module makes already-computed pipeline decisions
durable -- it introduces no new editorial judgment, no new triage/priority/
interpretation logic, no new model call, and no new network call. Every
value captured here already exists as the return value of an existing
pipeline stage:

  - triage.py's TriageResult (already computed by triage_developments(),
    already distinguishes "excluded: below relevance floor" from
    "deferred: admission capacity exhausted" in its own `reason` string --
    this module reads that string, it does not invent a new taxonomy);
  - prioritization.py's DevelopmentPriority (already computed by
    prioritize_developments(), including OMIT -- which main()'s pre-4C
    reporting never counted or surfaced anywhere at all);
  - composition.py's IntelligenceDigest.executive_summary (already
    computed; its structured statements, with their supporting Development
    IDs, are simply carried forward instead of being discarded after
    rendering).

Recording that a Development was HIGH, MONITOR, OMIT, excluded, or
capacity-deferred is recording what the existing system already decided --
it is NOT a new decision, and this module must never become one. It
contains no Living Knowledge / CRC import of any kind (see
tests/test_boundary.py, whose import allowlist and forbidden-substring
checks were extended to cover this file).

Deliberately excludes (see SI8-INTEL-NEWS-4C0's own recommendation and the
NEWS-4C task's explicit "no raw article-body archive" constraint): raw
article URLs, article summaries/bodies, and anything not already present
on Development / TriageResult / DevelopmentPriority / the composed digest.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from composition import IntelligenceDigest
from development import Development
from prioritization import DevelopmentPriority
from triage import TriageResult

_EXCLUDED_REASON_PREFIX = "excluded:"


@dataclass
class TriageDispositionRecord:
    """One Development triage did NOT admit -- enough context to review it
    without needing the original (never persisted) article data. `reason`
    is the exact, unmodified TriageResult.reason string, which already
    distinguishes the off-topic floor from the admission-capacity cap."""

    canonical_title: str
    clusters: set[str]
    source_count: int
    max_article_score: int
    reason: str


@dataclass
class PrioritizedRecord:
    """One Development that reached bounded interpretation and priority
    classification -- whatever tier it ended up at, INCLUDING OMIT, which
    prior to this milestone was invisible in every persisted/emailed
    output (see SI8-INTEL-NEWS-4C0, Finding H)."""

    canonical_title: str
    clusters: set[str]
    source_count: int
    tier: str
    rationale: str
    degraded: bool


@dataclass
class RunAudit:
    date: str
    excluded: list[TriageDispositionRecord] = field(default_factory=list)
    capacity_deferred: list[TriageDispositionRecord] = field(default_factory=list)
    prioritized: list[PrioritizedRecord] = field(default_factory=list)
    executive_summary_statements: list[tuple[str, list[str]]] = field(default_factory=list)

    @property
    def high_count(self) -> int:
        return sum(1 for p in self.prioritized if p.tier == "HIGH")

    @property
    def monitor_count(self) -> int:
        return sum(1 for p in self.prioritized if p.tier == "MONITOR")

    @property
    def omit_count(self) -> int:
        return sum(1 for p in self.prioritized if p.tier == "OMIT")

    @property
    def excluded_count(self) -> int:
        return len(self.excluded)

    @property
    def capacity_deferred_count(self) -> int:
        return len(self.capacity_deferred)

    @property
    def total_candidate_count(self) -> int:
        """Reconciliation total: every Development the run ever formed,
        regardless of eventual disposition. Should always equal the number
        of Development objects build_developments() produced."""
        return (
            self.excluded_count
            + self.capacity_deferred_count
            + len(self.prioritized)
        )


def build_run_audit(
    developments: list[Development],
    triage_results: list[TriageResult],
    priorities: list[DevelopmentPriority],
    digest: IntelligenceDigest,
    *,
    date_str: str,
) -> RunAudit:
    """Pure, deterministic join over objects the pipeline already computed
    -- no new computation, no model call, no network call. Given the same
    inputs, always produces the same RunAudit."""
    dev_by_id = {d.id: d for d in developments}

    excluded: list[TriageDispositionRecord] = []
    capacity_deferred: list[TriageDispositionRecord] = []
    for t in triage_results:
        if t.admitted:
            continue
        d = dev_by_id[t.development_id]
        record = TriageDispositionRecord(
            canonical_title=d.canonical_title,
            clusters=set(d.clusters),
            source_count=d.source_count,
            max_article_score=t.max_article_score,
            reason=t.reason,
        )
        if t.reason.startswith(_EXCLUDED_REASON_PREFIX):
            excluded.append(record)
        else:
            capacity_deferred.append(record)

    prioritized: list[PrioritizedRecord] = []
    for p in priorities:
        d = dev_by_id[p.development_id]
        prioritized.append(PrioritizedRecord(
            canonical_title=d.canonical_title,
            clusters=set(d.clusters),
            source_count=d.source_count,
            tier=p.tier,
            rationale=p.rationale,
            degraded=p.degraded,
        ))

    executive_summary_statements: list[tuple[str, list[str]]] = []
    if digest.executive_summary is not None:
        executive_summary_statements = [
            (s.text, list(s.supporting_development_ids))
            for s in digest.executive_summary.statements
        ]

    return RunAudit(
        date=date_str,
        excluded=excluded,
        capacity_deferred=capacity_deferred,
        prioritized=prioritized,
        executive_summary_statements=executive_summary_statements,
    )
