"""
SI8 News Intelligence -- retrieval recall experiment (SI8-INTEL-NEWS-5B5).

Pure, deterministic comparison/reuse logic only. No network, no model call,
no file I/O -- digest.py owns orchestration (fetching Experiment B,
persisting the comparison artifact), exactly mirroring audit.py's and
retrieval_observability.py's existing pure/impure split. Contains no
Living Knowledge / CRC import of any kind, and constructs no network/model
client of its own (see tests/test_boundary.py, whose import allowlist and
forbidden-substring checks were extended to cover this file).

EVIDENCE-EQUIVALENCE CONTRACT (the one thing this module exists to get
right): two Developments are "evidence-equivalent" if and only if they are
built from the exact same SET of constituent articles, each identified by
the same normalized-title key digest.py's own dedupe_and_merge_provenance()
already uses for deduplication. This is a deterministic SET comparison --
no model call, no semantic judgment, no fuzzy matching, no domain
vocabulary. It answers "was this Development built from the same raw
evidence," never "is this the same real-world story" or "is this legally/
commercially equivalent."

Development.id (development.py) is a random uuid4, regenerated on every
build_developments() invocation, and canonical_title is derived from a
single constituent article and can shift if the group's composition shifts
even slightly -- both are explicitly UNSAFE identity signals for this
purpose and are never used here. Grouping itself (build_developments's
model-assisted bucket confirmation) is not guaranteed deterministic across
separate invocations, so even a Development containing only
retrieval_variants == {"control"} is not assumed equivalent to a
same-cycle real Production Development without an exact fingerprint match
-- reuse is decided by evidence identity alone, never by the variant label.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable

from development import Development
from prioritization import DevelopmentPriority
from triage import TriageResult


def _article_identity_key(title: str) -> str:
    """Identical algorithm to digest.py's _title_dedup_key(): normalized,
    lowercased, non-alphanumeric-stripped, 80-char-truncated title.
    Duplicated rather than imported because digest.py is the orchestration
    layer (network/file I/O) and this module must stay pure/import-
    restricted (see tests/test_boundary.py); kept in sync by
    tests/test_retrieval_experiment.py's own cross-check against
    digest._title_dedup_key."""
    return re.sub(r"[^a-z0-9]", "", title.lower())[:80]


def development_evidence_fingerprint(development: Development) -> frozenset[str]:
    """Deterministic, order-independent evidence identity for a
    Development: the set of its constituent articles' identity keys. Two
    Developments with equal fingerprints were built from the same raw
    evidence, regardless of Development.id or canonical_title."""
    return frozenset(_article_identity_key(a.get("title", "")) for a in development.articles)


@dataclass
class RetrievalVariant:
    """A named, generic request transformation applied to a governed
    query's text before it reaches the provider. Adding a future retrieval
    experiment (e.g. an edition/language variant) means adding one more
    RetrievalVariant value -- never a parallel fetch_*_news() pipeline."""

    id: str
    transform: Callable[[str], str]


CONTROL = RetrievalVariant(id="control", transform=lambda q: q)
RECENCY_7D = RetrievalVariant(id="recency_7d", transform=lambda q: f"{q} when:7d")


@dataclass
class RealConclusion:
    """One already-computed Control-A Development's disposition, indexed
    by evidence fingerprint -- captured from the SAME already-executed
    Production run, never re-derived or re-evaluated."""

    fingerprint: frozenset[str]
    admitted: bool
    triage_reason: str
    tier: str | None = None
    rationale: str | None = None
    degraded: bool = False


def build_real_conclusion_index(
    developments: list[Development],
    triage_results: list[TriageResult],
    priorities: list[DevelopmentPriority],
) -> dict[frozenset[str], RealConclusion]:
    """Pure join over the REAL Production run's own already-computed
    results -- no new computation, no model call. Mirrors audit.py's
    build_run_audit() pattern exactly. Read-only over its inputs."""
    triage_by_dev = {t.development_id: t for t in triage_results}
    priority_by_dev = {p.development_id: p for p in priorities}
    index: dict[frozenset[str], RealConclusion] = {}
    for d in developments:
        fp = development_evidence_fingerprint(d)
        t = triage_by_dev.get(d.id)
        p = priority_by_dev.get(d.id)
        index[fp] = RealConclusion(
            fingerprint=fp,
            admitted=bool(t.admitted) if t else False,
            triage_reason=t.reason if t else "",
            tier=p.tier if p else None,
            rationale=p.rationale if p else None,
            degraded=p.degraded if p else False,
        )
    return index


def classify_variant_label(retrieval_variants: set[str]) -> str:
    """Human-readable A-only/B-only/both label from raw variant tags --
    REPORTING only. Reuse eligibility is decided separately, by exact
    evidence-fingerprint match (see resolve_experimental_development),
    never by this label alone."""
    has_control = "control" in retrieval_variants
    has_recency = "recency_7d" in retrieval_variants
    if has_control and has_recency:
        return "both"
    if has_recency:
        return "b_only"
    return "a_only"


def resolve_experimental_development(
    development: Development,
    real_index: dict[frozenset[str], RealConclusion],
) -> tuple[str, bool, RealConclusion | None]:
    """Returns (variant_label, evidence_matched, real_conclusion_or_None).

    `evidence_matched` is decided ONLY by exact evidence-fingerprint match
    against the REAL Production run's own index -- never by the variant
    label alone. This is deliberately stricter than "A-only always
    reuses": grouping (build_developments) makes a model call and is not
    guaranteed deterministic across separate invocations, so even a
    nominally A-only diagnostic Development is not safely assumed
    identical to a same-cycle real Development unless their evidence sets
    literally match (see module docstring). A B-only or changed-evidence
    Development can never coincidentally match: its fingerprint contains
    at least one article-identity-key the real run's Control-A population
    never fetched at all, so no real Development could share it."""
    label = classify_variant_label(development.retrieval_variants)
    fp = development_evidence_fingerprint(development)
    real = real_index.get(fp)
    return label, real is not None, real


@dataclass
class ExperimentDevelopmentRecord:
    """One diagnostic-pass Development's comparison outcome -- persisted
    only to a temporary, experiment-scoped artifact, never to
    DIGEST-AUDIT.md (see digest.py's update_retrieval_experiment_log()).
    Deliberately excludes raw article URLs/bodies/summaries -- the same
    data-minimization discipline as audit.py and retrieval_observability.py."""

    canonical_title: str
    clusters: list[str]
    evidence_keys: list[str]
    retrieval_variants: list[str]
    classification: str  # "a_only" | "b_only" | "both"
    reused: bool
    admitted: bool
    tier: str | None = None
