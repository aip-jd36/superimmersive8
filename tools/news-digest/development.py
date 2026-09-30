"""
SI8 News Intelligence -- Development abstraction and article grouping
(SI8-INTEL-NEWS-4A).

Groups retrieved articles that describe the same underlying real-world
development (one lawsuit, one enacted law, one provider terms change, one
insurer product launch, etc.) while preserving every contributing source
article and its NEWS-3 taxonomy provenance (see digest.py's
`dedupe_and_merge_provenance`).

CURRENT-RUN INTELLIGENCE ARCHITECTURE ONLY. A Development's `id` is a
random, ephemeral identifier scoped to a single digest.py invocation -- it
is NOT a durable cross-run event identity. Cross-run development memory
(recognizing "we already reported this three days ago") is explicitly
deferred to a later milestone. Nothing here persists to a database or to
DIGEST-LOG.md.

SAFETY DISCIPLINE (SI8-INTEL-NEWS-4A):
  - False split is always preferred over false merge. Grouping two
    unrelated articles into one Development would silently make SI8 look
    less informed than it is; keeping two articles about the same event
    separate merely wastes a little space. The asymmetry is deliberate.
  - No article can ever be dropped by a grouping failure. Every code path
    below either returns a valid partition of the input articles or falls
    back to one-article-per-Development -- there is no path that discards
    an article.
  - Grouping is entirely generic: nothing here references a jurisdiction,
    legal theory, provider name, or NEWS-3 cluster by name. The same code
    handles every cluster identically.

This module has NO Living Knowledge / CRC import or call of any kind (see
tools/news-digest/tests/test_boundary.py, which statically enforces an
import allowlist for exactly this reason). It is an intelligence-detection
tool only -- see PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md's own boundary:
discovery is not governance.
"""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------


@dataclass
class Development:
    """One underlying real-world development, with every contributing
    source article preserved (never summarized away or discarded)."""

    id: str
    canonical_title: str
    articles: list[dict]
    clusters: set[str]
    queries: set[str]
    # SI8-INTEL-NEWS-5B5: which retrieval-mechanism variant(s) (see
    # retrieval_experiment.py) discovered this Development's constituent
    # articles -- e.g. {"control"}, {"recency_7d"}, or both. Orthogonal to
    # clusters/queries (taxonomy provenance, not retrieval-mechanism
    # provenance); defaults to empty for any caller not running a
    # retrieval experiment, so this field never affects existing behavior.
    retrieval_variants: set[str] = field(default_factory=set)

    @property
    def source_count(self) -> int:
        return len(self.articles)

    @property
    def sources(self) -> list[str]:
        """Distinct publisher names, sorted for deterministic output."""
        return sorted({a.get("source", "Unknown") for a in self.articles})


def _new_development(group_articles: list[dict]) -> Development:
    """Build a Development from a confirmed group of articles. The
    canonical title is the title of the earliest-published article in the
    group -- a deterministic, source-grounded choice, not a model
    invention, so the digest can never display a "canonical" headline that
    doesn't trace to a real article."""
    ordered = sorted(
        group_articles,
        key=lambda a: a.get("pub_date") or datetime.min.replace(tzinfo=timezone.utc),
    )
    clusters: set[str] = set()
    queries: set[str] = set()
    retrieval_variants: set[str] = set()
    for a in group_articles:
        clusters |= set(a.get("clusters", set()))
        queries |= set(a.get("queries", set()))
        retrieval_variants |= set(a.get("retrieval_variants", set()))
    return Development(
        id=str(uuid.uuid4()),
        canonical_title=ordered[0]["title"],
        articles=list(group_articles),
        clusters=clusters,
        queries=queries,
        retrieval_variants=retrieval_variants,
    )


def _one_per_development(articles: list[dict]) -> list[Development]:
    """The universal safe fallback: every article becomes its own
    Development. Used whenever grouping is skipped, ambiguous, or fails
    validation -- never loses an article."""
    return [_new_development([a]) for a in articles]


# ---------------------------------------------------------------------------
# Stage 1: deterministic candidate reduction (no model call)
# ---------------------------------------------------------------------------

# Deliberately generic and short -- ordinary English function words plus a
# few terms so common in this feed's own domain vocabulary (ai, video, new,
# says, after, amid, law, act) that they would otherwise dominate every
# candidate bucket and defeat the whole point of the overlap check. None of
# these are jurisdiction-, provider-, or topic-specific.
_STOPWORDS = {
    "a", "an", "the", "of", "in", "on", "for", "to", "and", "or", "is",
    "are", "was", "were", "be", "over", "with", "as", "at", "by", "from",
    "its", "his", "her", "their", "this", "that", "new", "says", "after",
    "amid", "how", "what", "why", "who", "will", "can", "could", "should",
    "may", "not", "no", "ai", "law", "act", "news", "update", "report",
}


def _significant_tokens(title: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", title.lower())
    return {w for w in words if w not in _STOPWORDS and len(w) > 2}


def candidate_buckets(articles: list[dict], min_overlap: int = 2) -> list[list[int]]:
    """Deterministic, generic pre-filter. Partitions article INDICES into
    candidate buckets using nothing but shared significant title tokens --
    no jurisdiction/topic/provider-specific rule of any kind.

    This step never decides two articles are the same development; it only
    narrows which articles are worth asking the model to compare, bounding
    cost. A bucket of size 1 needs no model call at all. Two articles in
    different buckets are NEVER merged later -- the model only ever
    confirms or further splits a candidate bucket it was given.

    min_overlap defaults to 2, not 3: real headlines about the same event
    routinely differ in verb form ("requires" vs "requiring") or article
    structure enough that a stricter threshold silently fails to bucket
    genuinely-same-event articles together at all -- which would deny the
    model even the chance to group them (confirmed against real production
    headlines during SI8-INTEL-NEWS-4A's own fixture, see
    tests/test_development.py). A looser bucket is safe here specifically
    because this step never merges anything by itself -- it only proposes
    candidates the model must still independently confirm under the strict
    "if not confident, keep separate" instruction in GROUPING_PROMPT."""
    n = len(articles)
    if n == 0:
        return []
    token_sets = [_significant_tokens(a.get("title", "")) for a in articles]

    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int) -> None:
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    for i in range(n):
        for j in range(i + 1, n):
            if len(token_sets[i] & token_sets[j]) >= min_overlap:
                union(i, j)

    buckets: dict[int, list[int]] = {}
    for i in range(n):
        buckets.setdefault(find(i), []).append(i)
    # Deterministic ordering (by first member index) for reproducible tests.
    return [buckets[root] for root in sorted(buckets, key=lambda r: buckets[r][0])]


# ---------------------------------------------------------------------------
# Stage 2: model-assisted grouping within one candidate bucket
# ---------------------------------------------------------------------------

GROUPING_PROMPT = """You are grouping news articles that were retrieved together because their titles share some vocabulary. Your ONLY job is to decide which of these articles report the SAME underlying real-world development (the same specific occurrence -- e.g. the same lawsuit being filed, the same law being enacted, the same company's specific announcement) versus articles that merely share a general topic, jurisdiction, company, or provider name but describe genuinely DIFFERENT occurrences.

STRICT RULE: If you are not clearly confident two articles describe the exact same specific occurrence, put them in SEPARATE groups. None of the following, by itself, is sufficient evidence to group two articles together:
- the same company, provider, or organization is mentioned;
- the same jurisdiction or country is mentioned;
- the same general legal or regulatory topic is mentioned;
- the titles share broad keywords.
Only genuine evidence that two articles are reporting the identical specific occurrence or a direct follow-up on the identical occurrence justifies grouping them.

Articles (index: title | source | date | summary):
{articles_block}

Return ONLY a JSON array of groups. Each group is a JSON array of the integer indices that belong together. Every index from 0 to {max_index} must appear in EXACTLY ONE group, with no index repeated and none omitted. A group may contain a single index.

Example (3 articles where 0 and 2 are the same development, 1 is different):
[[0, 2], [1]]"""


def _format_articles_block(articles: list[dict]) -> str:
    lines = []
    for i, a in enumerate(articles):
        summary = (a.get("summary") or "").strip()[:200]
        lines.append(
            f"{i}: {a.get('title', '')} | {a.get('source', 'Unknown')} | "
            f"{a.get('published', '')} | {summary or '(no summary)'}"
        )
    return "\n".join(lines)


def validate_partition(raw, n: int) -> list[list[int]] | None:
    """Deterministic structured-output validation. Returns None (never
    raises) on ANY malformed, out-of-range, duplicate, or incomplete
    partition -- the caller is responsible for falling back safely."""
    if not isinstance(raw, list) or not raw:
        return None
    seen: set[int] = set()
    groups: list[list[int]] = []
    for group in raw:
        if not isinstance(group, list) or not group:
            return None
        idxs: list[int] = []
        for x in group:
            if not isinstance(x, int) or isinstance(x, bool):
                return None
            if not (0 <= x < n) or x in seen:
                return None
            seen.add(x)
            idxs.append(x)
        groups.append(idxs)
    if seen != set(range(n)):
        return None
    return groups


def group_bucket_via_model(bucket_articles: list[dict], *, client, model: str) -> list[list[int]]:
    """Ask the model to confirm/refine grouping within one candidate
    bucket. On ANY failure (network, parse, schema, invalid partition),
    fails closed to one-article-per-Development for this bucket -- never
    raises, never drops an article."""
    n = len(bucket_articles)
    if n <= 1:
        return [[i] for i in range(n)]

    prompt = GROUPING_PROMPT.format(
        articles_block=_format_articles_block(bucket_articles),
        max_index=n - 1,
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
        return [[i] for i in range(n)]

    validated = validate_partition(raw, n)
    if validated is None:
        return [[i] for i in range(n)]
    return validated


# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------


def build_developments(
    articles: list[dict],
    *,
    client=None,
    model: str = "claude-haiku-4-5-20251001",
    min_overlap: int = 2,
) -> list[Development]:
    """Group retrieved articles into Developments.

    `client` is an injected Anthropic-client-shaped object (duck-typed:
    must expose `.messages.create(...)` returning `.content[0].text`) so
    tests can supply a deterministic fake without any network access. If
    `client` is None, every candidate bucket falls back to
    one-article-per-Development with no model call at all -- a legitimate,
    fully safe mode (e.g. for a caller that hasn't wired up interpretation
    yet), not an error state."""
    if not articles:
        return []

    buckets = candidate_buckets(articles, min_overlap=min_overlap)
    developments: list[Development] = []

    for bucket_indices in buckets:
        bucket_articles = [articles[i] for i in bucket_indices]
        if len(bucket_articles) == 1 or client is None:
            groups = [[i] for i in range(len(bucket_articles))]
        else:
            groups = group_bucket_via_model(bucket_articles, client=client, model=model)

        for group in groups:
            group_articles = [bucket_articles[i] for i in group]
            developments.append(_new_development(group_articles))

    return developments
