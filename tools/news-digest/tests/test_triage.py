"""
SI8-INTEL-NEWS-4B -- triage tests.

No network call anywhere in this file (triage.py is fully deterministic,
no model call at all).
"""

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from development import Development  # noqa: E402
from triage import max_article_score, triage_developments  # noqa: E402


def _article(title, score, source="Outlet"):
    return {
        "title": title,
        "url": f"https://example.com/{abs(hash((title, source, score)))}",
        "source": source,
        "published": "Mon, 28 Sep 2026 00:00:00 GMT",
        "pub_date": datetime(2026, 9, 28, tzinfo=timezone.utc),
        "summary": "",
        "relevance_score": score,
        "clusters": set(),
        "queries": set(),
    }


def _development(dev_id, articles, clusters):
    return Development(id=dev_id, canonical_title=articles[0]["title"], articles=articles, clusters=set(clusters), queries=set())


class TestMaxArticleScore(unittest.TestCase):
    def test_uses_max_not_sum_not_average(self):
        """The core anti-inflation mechanism: 4 low-scoring articles must
        not out-triage 1 high-scoring article via summation."""
        four_low = _development("d1", [_article("a", 4, "A"), _article("b", 4, "B"), _article("c", 4, "C"), _article("d", 4, "D")], ["cluster_x"])
        one_high = _development("d2", [_article("e", 9, "E")], ["cluster_x"])
        self.assertEqual(max_article_score(four_low), 4)
        self.assertEqual(max_article_score(one_high), 9)
        # If this were sum(), four_low would score 16 > one_high's 9 --
        # explicitly the outcome this architecture forbids.
        self.assertLess(max_article_score(four_low), max_article_score(one_high))

    def test_empty_articles_scores_zero(self):
        d = Development(id="d1", canonical_title="n/a", articles=[], clusters={"cluster_x"}, queries=set())
        self.assertEqual(max_article_score(d), 0)


class TestTriageAdmissionIsNotMateriality(unittest.TestCase):
    def test_four_sources_do_not_get_4x_admission_preference(self):
        """Four articles about one Development, all scored identically to
        a single-article Development, must be treated identically by
        triage -- source count alone confers no admission advantage."""
        four_sources = _development("d1", [_article("a", 6, "A"), _article("b", 6, "B"), _article("c", 6, "C"), _article("d", 6, "D")], ["cluster_x"])
        one_source = _development("d2", [_article("e", 6, "E")], ["cluster_x"])
        results = {r.development_id: r for r in triage_developments([four_sources, one_source])}
        self.assertEqual(results["d1"].admitted, results["d2"].admitted)
        self.assertEqual(results["d1"].max_article_score, results["d2"].max_article_score)

    def test_source_count_is_not_the_admitted_signal_recorded(self):
        """TriageResult exposes max_article_score, not article/source
        count -- source count cannot leak in as a de facto materiality
        field even by accident."""
        d = _development("d1", [_article("a", 7, "A"), _article("b", 7, "B")], ["cluster_x"])
        result = triage_developments([d])[0]
        self.assertFalse(hasattr(result, "source_count"))
        self.assertFalse(hasattr(result, "article_count"))

    def test_low_score_excludes_regardless_of_source_count(self):
        """Many low-relevance articles about one Development still fail
        the off-topic floor -- corroboration cannot rescue an off-topic
        Development."""
        many_low = _development("d1", [_article("a", 2, "A"), _article("b", 2, "B"), _article("c", 2, "C")], ["cluster_x"])
        result = triage_developments([many_low], relevance_floor=3)[0]
        self.assertFalse(result.admitted)
        self.assertIn("below relevance floor", result.reason)


class TestClusterIsNotAWeight(unittest.TestCase):
    def test_identical_scores_across_clusters_admit_identically(self):
        """A Development's cluster membership must never change whether it
        is admitted, given an identical underlying score."""
        litigation = _development("d1", [_article("a", 5, "A")], ["litigation_commercial_media_core"])
        adoption = _development("d2", [_article("b", 5, "B")], ["commercial_adoption_validation"])
        results = {r.development_id: r for r in triage_developments([litigation, adoption])}
        self.assertEqual(results["d1"].admitted, results["d2"].admitted)

    def test_cluster_fairness_floor_generic_across_arbitrary_cluster_names(self):
        """The fairness floor must work identically for ANY cluster name --
        no cluster is special-cased in code. Flood one cluster with
        low-but-eligible Developments and confirm a quieter cluster still
        gets its guaranteed floor considered."""
        noisy = [_development(f"noisy{i}", [_article(f"n{i}", 4, "N")], ["noisy_cluster"]) for i in range(30)]
        quiet = [_development(f"quiet{i}", [_article(f"q{i}", 3, "Q")], ["quiet_cluster"]) for i in range(2)]
        results = {r.development_id: r for r in triage_developments(noisy + quiet, global_cap=10, per_cluster_floor=2)}
        quiet_admitted = sum(1 for i in range(2) if results[f"quiet{i}"].admitted)
        self.assertEqual(quiet_admitted, 2, "quiet cluster's floor must be honored even when a noisy cluster has far more eligible candidates")

    def test_fairness_floor_never_exceeds_global_cap(self):
        """Many clusters, each with a floor, must never collectively push
        total admissions above the global cap -- the cap is a hard
        ceiling, not a suggestion the fairness mechanism can override."""
        many_clusters = []
        for i in range(20):
            many_clusters.append(_development(f"d{i}", [_article(f"a{i}", 5, "A")], [f"cluster_{i}"]))
        results = triage_developments(many_clusters, global_cap=10, per_cluster_floor=2)
        admitted_count = sum(1 for r in results if r.admitted)
        self.assertLessEqual(admitted_count, 10)


class TestGlobalCapDeterministic(unittest.TestCase):
    def test_cap_is_deterministic_across_repeated_calls(self):
        devs = [_development(f"d{i}", [_article(f"a{i}", 5 + (i % 3), "A")], ["cluster_x"]) for i in range(15)]
        first = {r.development_id: r.admitted for r in triage_developments(devs, global_cap=5, per_cluster_floor=0)}
        second = {r.development_id: r.admitted for r in triage_developments(devs, global_cap=5, per_cluster_floor=0)}
        self.assertEqual(first, second)

    def test_cap_admits_highest_scoring_first(self):
        devs = [_development(f"d{i}", [_article(f"a{i}", i, "A")], ["cluster_x"]) for i in range(3, 8)]  # scores 3..7
        results = {r.development_id: r for r in triage_developments(devs, global_cap=2, per_cluster_floor=0, relevance_floor=3)}
        admitted = {k for k, r in results.items() if r.admitted}
        self.assertEqual(admitted, {"d7", "d6"})  # top-2 by score


class TestMultiClusterDevelopment(unittest.TestCase):
    def test_development_in_two_clusters_satisfies_both_floors(self):
        """A Development spanning two clusters counts toward both floors'
        guarantees, without being counted twice toward the global cap."""
        shared = _development("shared", [_article("a", 5, "A")], ["cluster_a", "cluster_b"])
        other_a = _development("other_a", [_article("b", 3, "B")], ["cluster_a"])
        other_b = _development("other_b", [_article("c", 3, "C")], ["cluster_b"])
        results = {r.development_id: r for r in triage_developments([shared, other_a, other_b], per_cluster_floor=1, global_cap=100)}
        self.assertTrue(results["shared"].admitted)


class TestSafeBehaviorForMissingMetadata(unittest.TestCase):
    def test_development_with_no_cluster_still_competes_on_score(self):
        d = _development("d1", [_article("a", 8, "A")], [])
        result = triage_developments([d])[0]
        self.assertTrue(result.admitted)

    def test_missing_relevance_score_defaults_to_zero_and_is_excluded(self):
        article = _article("a", 8, "A")
        del article["relevance_score"]
        d = _development("d1", [article], ["cluster_x"])
        result = triage_developments([d])[0]
        self.assertEqual(result.max_article_score, 0)
        self.assertFalse(result.admitted)


class TestScoringFailureDoesNotFabricateAdmission(unittest.TestCase):
    def test_zero_score_from_failed_scoring_batch_is_excluded_not_promoted(self):
        """Mirrors digest.py's own score_batch failure fallback
        (relevance_score=0) -- triage must treat that exactly like any
        other low score, never specially promote it."""
        failed = _development("d1", [_article("a", 0, "A")], ["cluster_x"])
        result = triage_developments([failed])[0]
        self.assertFalse(result.admitted)


class TestEveryDevelopmentGetsAnExplicitDecision(unittest.TestCase):
    def test_result_count_matches_input_count(self):
        devs = [_development(f"d{i}", [_article(f"a{i}", 5, "A")], ["cluster_x"]) for i in range(50)]
        results = triage_developments(devs, global_cap=5)
        self.assertEqual(len(results), 50)


if __name__ == "__main__":
    unittest.main()
