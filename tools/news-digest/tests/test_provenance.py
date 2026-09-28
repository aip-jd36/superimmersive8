"""
SI8-INTEL-NEWS-4A -- Phase 1 provenance tests.

digest.py reads ANTHROPIC_API_KEY / RESEND_API_KEY from the environment at
module import time (pre-existing behavior, unrelated to this milestone --
not changed here). Dummy values are supplied before import purely so this
test process can import the module; no network call is made anywhere in
this file.
"""

import os
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("RESEND_API_KEY", "test-key")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from digest import dedupe_and_merge_provenance  # noqa: E402


def _article(title, cluster, query, source="Some Outlet", when=None):
    return {
        "title": title,
        "url": f"https://example.com/{abs(hash(title))}",
        "source": source,
        "published": "Mon, 28 Sep 2026 00:00:00 GMT",
        "pub_date": when or datetime(2026, 9, 28, tzinfo=timezone.utc),
        "summary": "",
        "clusters": {cluster},
        "queries": {query},
    }


class TestProvenance(unittest.TestCase):
    def test_taxonomy_provenance_survives_retrieval(self):
        """A single article carries its originating cluster and query."""
        a = _article("Some Distinct Headline About A Topic", "litigation_commercial_media_core", "AI video copyright (...)")
        result = dedupe_and_merge_provenance([a])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["clusters"], {"litigation_commercial_media_core"})
        self.assertEqual(result[0]["queries"], {"AI video copyright (...)"})

    def test_multi_query_provenance_union(self):
        """The same article (same normalized title) discovered via two
        different queries in the SAME cluster retains the union of both
        queries, not just the first."""
        a1 = _article("Regulator Issues New AI Guidance Today", "regulation_policy_commercial_media", "query one")
        a2 = _article("Regulator Issues New AI Guidance Today", "regulation_policy_commercial_media", "query two")
        result = dedupe_and_merge_provenance([a1, a2])
        self.assertEqual(len(result), 1, "duplicate title should still collapse to one article")
        self.assertEqual(result[0]["queries"], {"query one", "query two"})
        self.assertEqual(result[0]["clusters"], {"regulation_policy_commercial_media"})

    def test_multi_cluster_provenance_union(self):
        """The same article discovered via two different clusters retains
        the union of both clusters -- no cluster is arbitrarily dropped."""
        a1 = _article("Provider Announces New Commercial Terms Update", "provider_commercial_terms", "provider query")
        a2 = _article("Provider Announces New Commercial Terms Update", "material_capability_changes", "capability query")
        result = dedupe_and_merge_provenance([a1, a2])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["clusters"], {"provider_commercial_terms", "material_capability_changes"})
        self.assertEqual(result[0]["queries"], {"provider query", "capability query"})

    def test_distinct_titles_are_not_merged_by_dedup(self):
        """Dedup-and-merge only merges on an EXACT normalized-title
        collision -- it must not merge two genuinely different articles
        just because they came from the same cluster/query."""
        a1 = _article("First Distinct Headline", "buyer_risk_governance_signals", "q")
        a2 = _article("Second Completely Different Headline", "buyer_risk_governance_signals", "q")
        result = dedupe_and_merge_provenance([a1, a2])
        self.assertEqual(len(result), 2)

    def test_provenance_sets_are_independent_after_merge(self):
        """Mutating one surviving article's provenance set must never
        retroactively affect a different survivor (defensive-copy check)."""
        a1 = _article("Alpha Headline About Something", "cluster_a", "q1")
        a2 = _article("Beta Headline About Something Else", "cluster_b", "q2")
        result = dedupe_and_merge_provenance([a1, a2])
        result[0]["clusters"].add("mutated")
        self.assertNotIn("mutated", result[1]["clusters"])


if __name__ == "__main__":
    unittest.main()
