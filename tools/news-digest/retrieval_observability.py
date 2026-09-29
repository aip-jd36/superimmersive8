"""
SI8 News Intelligence -- retrieval-stage observability (SI8-INTEL-NEWS-5B2).

OBSERVABILITY ONLY. This module makes the retrieval layer's own already-
existing accept/reject decisions durable -- it introduces no new retrieval
decision, no new query, no new provider, no new date/lookback policy, and
no network/model call of its own. It is a pure data-carrying layer: every
value it holds is populated by digest.py's existing fetch_google_news()
logic (see SI8-INTEL-NEWS-5B1/5B2), which already decides, per RSS entry,
whether a publication date parses and whether it falls inside the
configured lookback window. This module simply gives that existing,
already-computed decision a durable shape instead of discarding the
rejected half of it via a silent `continue`.

DIFFERENT EPISTEMIC BOUNDARY FROM audit.py (SI8-INTEL-NEWS-4C). audit.py
records what every retrieved DEVELOPMENT candidate WAS -- title, cluster,
source count, triage/priority disposition -- for the population that
SURVIVED to become a Development (see development.py: grouping never
drops an article once retrieval accepts it). This module records what the
PROVIDER RETURNED, per query, before grouping/triage/priority exist at
all -- including raw candidates that were REJECTED before ever reaching
Development formation (outside lookback, unparseable date) or that a
query fetch failed to retrieve at all. Collapsing these two into one
persisted artifact would misrepresent a retrieval-rejected raw candidate
as if it had ever been a Development audit subject. They are deliberately
kept as two separate data models and two separate persisted files
(DIGEST-AUDIT.md vs. RETRIEVAL-LOG.jsonl).

DATA MINIMIZATION (SI8-INTEL-NEWS-5B2's own explicit constraint): this
module never carries an article URL, summary, body, or any RSS payload
beyond title/source/publication-date -- the minimum needed to diagnose
"was a given story returned by the provider, and if so, what happened to
it," never a raw-news archive. It contains no Living Knowledge / CRC
import of any kind, and no network/database client construction --
see tests/test_boundary.py, whose import allowlist and forbidden-
substring checks were extended to cover this file.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class CandidateRecord:
    """One raw RSS entry a provider query returned, and what happened to
    it at the existing date/lookback boundary. `disposition` is exactly
    one of "accepted" / "outside_lookback" / "unparseable_date" -- the
    same three-way outcome fetch_google_news() already computes today,
    simply no longer discarded for the two rejected cases."""

    title: str
    source: str
    published_raw: str
    pub_date_iso: str | None
    cluster: str
    query: str
    disposition: str


@dataclass
class QueryRetrievalRecord:
    """One governed production query's retrieval outcome for this run.
    `status="failed"` and every count left as None is deliberately
    distinct from `status="success"` with `returned_count=0` -- a
    provider/query failure must never be silently recorded as though the
    provider legitimately returned zero results (SI8-INTEL-NEWS-5B2's
    explicit "do not silently turn unknown into zero" requirement)."""

    cluster: str
    query: str
    status: str  # "success" | "failed"
    error: str | None = None
    returned_count: int | None = None
    accepted_count: int | None = None
    outside_lookback_count: int | None = None
    unparseable_date_count: int | None = None
    candidates: list[CandidateRecord] = field(default_factory=list)


@dataclass
class RunRetrievalRecord:
    """One run's complete retrieval-stage observability record -- every
    governed query that executed, its outcome, and (where the query
    succeeded) every raw candidate it returned with its date/lookback
    disposition. Reconciliation properties below are all None-safe over
    failed queries, so a failed query can never masquerade as a
    zero-candidate success in an aggregate count."""

    run_date: str
    lookback_days: int
    queries: list[QueryRetrievalRecord] = field(default_factory=list)

    @property
    def query_count(self) -> int:
        return len(self.queries)

    @property
    def failed_query_count(self) -> int:
        return sum(1 for q in self.queries if q.status == "failed")

    @property
    def total_returned_count(self) -> int:
        return sum(q.returned_count or 0 for q in self.queries if q.status == "success")

    @property
    def total_accepted_count(self) -> int:
        return sum(q.accepted_count or 0 for q in self.queries if q.status == "success")
