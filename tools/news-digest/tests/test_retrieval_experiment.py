"""
SI8-INTEL-NEWS-5B5 -- retrieval recall experiment: pure logic tests.

No network, no model call, no file I/O anywhere in this file. Proves the
evidence-equivalence/reuse contract from retrieval_experiment.py's module
docstring: two Developments are "evidence-equivalent" iff they share the
exact same SET of constituent-article identity keys -- never by
Development.id, canonical_title, or any semantic/model-based comparison.
"""

import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("RESEND_API_KEY", "test-key")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from development import Development  # noqa: E402
from triage import TriageResult  # noqa: E402
from prioritization import DevelopmentPriority  # noqa: E402
from retrieval_experiment import (  # noqa: E402
    CONTROL,
    RECENCY_7D,
    RealConclusion,
    _article_identity_key,
    build_real_conclusion_index,
    classify_variant_label,
    development_evidence_fingerprint,
    resolve_experimental_development,
)
import digest  # noqa: E402


def _dev(dev_id, articles, variants=None):
    return Development(
        id=dev_id, canonical_title=articles[0]["title"] if articles else "n/a",
        articles=articles, clusters={"c"}, queries={"q"},
        retrieval_variants=set(variants or set()),
    )


def _article(title, variants=()):
    return {"title": title, "source": "Outlet", "retrieval_variants": set(variants)}


class TestArticleIdentityKeySyncedWithDigest(unittest.TestCase):
    def test_matches_digest_title_dedup_key_for_a_variety_of_titles(self):
        for title in [
            "Simple Title", "Title With Punctuation!!! And Numbers 123",
            "  Leading/trailing whitespace  ", "UPPERCASE TITLE", "",
            "A very long title " * 10,
        ]:
            with self.subTest(title=title):
                self.assertEqual(_article_identity_key(title), digest._title_dedup_key(title))


class TestEvidenceFingerprint(unittest.TestCase):
    def test_identical_evidence_sets_compare_equivalent_regardless_of_ordering(self):
        d1 = _dev("id-1", [_article("Alpha Story"), _article("Beta Story")])
        d2 = _dev("id-2-completely-different-random-id", [_article("Beta Story"), _article("Alpha Story")])
        self.assertEqual(development_evidence_fingerprint(d1), development_evidence_fingerprint(d2))

    def test_changed_article_evidence_compares_non_equivalent(self):
        d1 = _dev("id-1", [_article("Alpha Story"), _article("Beta Story")])
        d2 = _dev("id-2", [_article("Alpha Story"), _article("Gamma Story")])
        self.assertNotEqual(development_evidence_fingerprint(d1), development_evidence_fingerprint(d2))

    def test_unstable_fields_excluded_do_not_create_false_differences(self):
        """Development.id (random uuid4) and canonical_title differing
        must never affect the fingerprint -- only constituent-article
        identity keys matter."""
        d1 = Development(id="random-uuid-aaaa", canonical_title="Some Canonical Title",
                          articles=[_article("Same Story Here")], clusters={"x"}, queries={"q"})
        d2 = Development(id="random-uuid-bbbb", canonical_title="A Totally Different Canonical Title",
                          articles=[_article("Same Story Here")], clusters={"y"}, queries={"q2"})
        self.assertEqual(development_evidence_fingerprint(d1), development_evidence_fingerprint(d2))

    def test_no_semantic_or_model_comparison_is_used(self):
        """Two DIFFERENTLY-WORDED titles about the same real event, which
        a human or model might judge 'the same story', must NOT fingerprint
        equal -- fingerprinting is evidence-identity only, never semantic."""
        d1 = _dev("id-1", [_article("Court Rules Against AI Company In Landmark Case")])
        d2 = _dev("id-2", [_article("Landmark Ruling Goes Against AI Firm")])
        self.assertNotEqual(development_evidence_fingerprint(d1), development_evidence_fingerprint(d2))


class TestClassifyVariantLabel(unittest.TestCase):
    def test_control_only_is_a_only(self):
        self.assertEqual(classify_variant_label({"control"}), "a_only")

    def test_recency_only_is_b_only(self):
        self.assertEqual(classify_variant_label({"recency_7d"}), "b_only")

    def test_both_present_is_both(self):
        self.assertEqual(classify_variant_label({"control", "recency_7d"}), "both")


class TestRealConclusionIndex(unittest.TestCase):
    def test_pure_join_no_mutation_of_inputs(self):
        articles = [_article("Story One")]
        d = _dev("real-1", articles)
        t = TriageResult(development_id="real-1", admitted=True, reason="admitted for bounded interpretation", max_article_score=8)
        p = DevelopmentPriority(development_id="real-1", tier="MONITOR", rationale="grounded")
        developments, triage, priorities = [d], [t], [p]
        snapshot_dev = list(developments)
        index = build_real_conclusion_index(developments, triage, priorities)
        self.assertEqual(developments, snapshot_dev)
        fp = development_evidence_fingerprint(d)
        self.assertIn(fp, index)
        self.assertEqual(index[fp].tier, "MONITOR")
        self.assertTrue(index[fp].admitted)

    def test_excluded_development_has_none_tier(self):
        d = _dev("real-2", [_article("Excluded Story")])
        t = TriageResult(development_id="real-2", admitted=False, reason="excluded: below relevance floor (1 < 3)", max_article_score=1)
        index = build_real_conclusion_index([d], [t], [])
        fp = development_evidence_fingerprint(d)
        self.assertFalse(index[fp].admitted)
        self.assertIsNone(index[fp].tier)


class TestResolveExperimentalDevelopment(unittest.TestCase):
    def _real_index(self, dev_id, articles, tier="MONITOR"):
        d = _dev(dev_id, articles)
        t = TriageResult(development_id=dev_id, admitted=True, reason="admitted for bounded interpretation", max_article_score=8)
        p = DevelopmentPriority(development_id=dev_id, tier=tier, rationale="grounded")
        return build_real_conclusion_index([d], [t], [p])

    def test_a_only_reuses_when_fingerprint_matches_real_index(self):
        real_index = self._real_index("real-1", [_article("Story One")])
        exp_dev = _dev("exp-1", [_article("Story One")], variants={"control"})
        label, matched, real = resolve_experimental_development(exp_dev, real_index)
        self.assertEqual(label, "a_only")
        self.assertTrue(matched)
        self.assertEqual(real.tier, "MONITOR")

    def test_both_equivalent_evidence_reuses(self):
        """A 'both' Development whose evidence set happens to be identical
        to a real Development's (e.g. B rediscovered exactly the same
        article set A already found) reuses the real conclusion."""
        real_index = self._real_index("real-1", [_article("Story One")])
        exp_dev = _dev("exp-1", [_article("Story One")], variants={"control", "recency_7d"})
        label, matched, real = resolve_experimental_development(exp_dev, real_index)
        self.assertEqual(label, "both")
        self.assertTrue(matched)
        self.assertEqual(real.tier, "MONITOR")

    def test_both_changed_evidence_does_not_reuse(self):
        """A 'both' Development that ALSO contains a B-only article (a
        superset of what the real run saw) must NOT reuse -- its
        fingerprint differs."""
        real_index = self._real_index("real-1", [_article("Story One")])
        exp_dev = _dev("exp-1", [_article("Story One"), _article("Extra B-Found Article")],
                        variants={"control", "recency_7d"})
        label, matched, real = resolve_experimental_development(exp_dev, real_index)
        self.assertEqual(label, "both")
        self.assertFalse(matched)
        self.assertIsNone(real)

    def test_b_only_never_reuses(self):
        """A genuinely B-only Development's fingerprint contains an
        article-identity-key the real Control-A run never fetched at all
        -- it structurally cannot match any real Development."""
        real_index = self._real_index("real-1", [_article("Story One")])
        exp_dev = _dev("exp-2", [_article("Brand New B-Only Story")], variants={"recency_7d"})
        label, matched, real = resolve_experimental_development(exp_dev, real_index)
        self.assertEqual(label, "b_only")
        self.assertFalse(matched)
        self.assertIsNone(real)

    def test_a_only_with_no_matching_real_development_does_not_reuse(self):
        """Grouping non-determinism edge case: an A-only-tagged diagnostic
        Development whose evidence set does not exactly match any real
        Development must NOT be assumed reusable just because its variant
        label is 'a_only'."""
        real_index = self._real_index("real-1", [_article("Story One")])
        exp_dev = _dev("exp-3", [_article("Story One"), _article("Story Two (grouped differently)")],
                        variants={"control"})
        label, matched, real = resolve_experimental_development(exp_dev, real_index)
        self.assertEqual(label, "a_only")
        self.assertFalse(matched)

    def test_reused_real_conclusion_object_is_not_mutated(self):
        real_index = self._real_index("real-1", [_article("Story One")], tier="HIGH")
        exp_dev = _dev("exp-1", [_article("Story One")], variants={"control"})
        _label, _matched, real = resolve_experimental_development(exp_dev, real_index)
        original_tier = real.tier
        # Simulate a caller reading the conclusion; the index itself must
        # remain the single source of truth, unmutated by this read.
        fp = development_evidence_fingerprint(exp_dev)
        self.assertIs(real_index[fp], real)
        self.assertEqual(real_index[fp].tier, original_tier)


if __name__ == "__main__":
    unittest.main()
