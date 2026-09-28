"""
SI8 News Intelligence -- cheap Development triage (SI8-INTEL-NEWS-4B).

Triage answers exactly one question: "should we spend a bounded-
interpretation model call on this Development?" It is RESOURCE ALLOCATION,
not materiality. It must NEVER conclude "how materially important is this
Development to SI8" -- that determination is reserved exclusively for the
authoritative priority stage (prioritization.py), which runs AFTER bounded
interpretation exists.

Per the SI8-INTEL-NEWS-4B Pre-Implementation Architecture Repair:
  - article-level relevance_score is an in-domain/marketability signal, not
    Development materiality -- used here ONLY as a low exclusion floor that
    screens OUT clearly off-topic Developments, never to rank in-domain
    Developments against each other;
  - Development/source count is a weak admission nudge, never a materiality
    multiplier -- four sources never mean four times the admission priority
    of one strong source, they only feed the same max()-based score every
    other Development is ranked by;
  - cluster provenance is used ONLY as a fairness-of-consideration floor
    (guaranteeing every represented cluster gets a minimum number of
    Developments considered) -- NEVER as a materiality weight. A
    Development's cluster membership never changes its admission score.

Deterministic, no model call, no randomness. Generic across every NEWS-3
cluster and any future one -- nothing here names a jurisdiction, legal
theory, or provider. Has no import of any Living Knowledge / CRC / database
path (see tests/test_boundary.py).
"""

from __future__ import annotations

from dataclasses import dataclass

from development import Development
from policy import (
    TRIAGE_GLOBAL_ADMISSION_CAP,
    TRIAGE_PER_CLUSTER_ADMISSION_FLOOR,
    TRIAGE_RELEVANCE_FLOOR,
)


@dataclass
class TriageResult:
    """Deterministic admission decision for exactly one Development.
    `admitted=True` means "worth a bounded-interpretation call" -- nothing
    more. It is never read downstream as a materiality judgment."""

    development_id: str
    admitted: bool
    reason: str
    max_article_score: int


def max_article_score(development: Development) -> int:
    """The strongest single contributing article's trimmed relevance
    score. Deliberately max(), not sum()/average() -- a Development is
    admitted on the strength of its best evidence, never multiplied by how
    many articles happen to repeat it (the same anti-inflation discipline
    used throughout this architecture's corroboration handling)."""
    scores = [a.get("relevance_score", 0) for a in development.articles]
    return max(scores) if scores else 0


def _clusters_represented(developments: list[Development]) -> list[str]:
    clusters: set[str] = set()
    for d in developments:
        clusters |= d.clusters
    # Sorted for fully deterministic, reproducible admission order --
    # iteration order must never depend on dict/set hash ordering.
    return sorted(clusters)


def triage_developments(
    developments: list[Development],
    *,
    relevance_floor: int = TRIAGE_RELEVANCE_FLOOR,
    global_cap: int = TRIAGE_GLOBAL_ADMISSION_CAP,
    per_cluster_floor: int = TRIAGE_PER_CLUSTER_ADMISSION_FLOOR,
) -> list[TriageResult]:
    """Deterministic admission. Returns exactly one TriageResult per input
    Development -- every Development gets an explicit admitted/deferred/
    excluded decision, so nothing silently disappears from view (it may
    still be DEFERRED, i.e. not judged this cycle, but that is a visible,
    explicit outcome, not a silent drop -- see prioritization.py for the
    DEFERRED-vs-OMIT distinction)."""
    scored = [(d, max_article_score(d)) for d in developments]

    # Stage 1: off-topic exclusion. A Development below the floor is
    # excluded outright -- it never competes for a fairness-floor or
    # global-cap slot at all.
    eligible = [(d, s) for d, s in scored if s >= relevance_floor]
    excluded_ids = {d.id for d, s in scored if s < relevance_floor}

    # Stage 2: rank eligible Developments by the same score, purely for
    # volume control -- explicitly NOT the final ranking (see module
    # docstring). Python's sort is stable, so ties preserve input order
    # (already date-descending from fetch_all_articles) for determinism.
    eligible.sort(key=lambda pair: pair[1], reverse=True)

    admitted_ids: list[str] = []  # list, not set, to preserve deterministic order
    admitted_set: set[str] = set()

    def _admit(dev: Development) -> bool:
        """Admits one Development if the global cap allows it. Returns
        whether admission happened -- the cap is a hard ceiling that both
        the fairness floor and the general fill respect identically."""
        if len(admitted_set) >= global_cap or dev.id in admitted_set:
            return False
        admitted_set.add(dev.id)
        admitted_ids.append(dev.id)
        return True

    # Stage 3: per-cluster admission floor, applied generically -- no
    # cluster is named in this code, and cluster order is alphabetical for
    # determinism (not, e.g., discovery order, which would be an implicit
    # taxonomy-priority signal this stage must not carry). For each
    # cluster actually represented among ELIGIBLE Developments, admit its
    # top-scoring eligible members up to the floor -- still bounded by the
    # same global cap, so the fairness guarantee can never itself blow the
    # cost ceiling.
    for cluster in _clusters_represented([d for d, _ in eligible]):
        cluster_members = [d for d, _ in eligible if cluster in d.clusters]
        admitted_for_cluster = 0
        for d in cluster_members:
            if admitted_for_cluster >= per_cluster_floor:
                break
            if _admit(d):
                admitted_for_cluster += 1

    # Stage 4: fill any remaining global-cap slots by score, highest first.
    for d, _ in eligible:
        _admit(d)

    results: list[TriageResult] = []
    for d, score in scored:
        if d.id in excluded_ids:
            results.append(TriageResult(
                development_id=d.id, admitted=False,
                reason=f"excluded: below relevance floor ({score} < {relevance_floor})",
                max_article_score=score,
            ))
        elif d.id in admitted_set:
            results.append(TriageResult(
                development_id=d.id, admitted=True,
                reason="admitted for bounded interpretation",
                max_article_score=score,
            ))
        else:
            results.append(TriageResult(
                development_id=d.id, admitted=False,
                reason="deferred: admission capacity exhausted this cycle",
                max_article_score=score,
            ))
    return results
