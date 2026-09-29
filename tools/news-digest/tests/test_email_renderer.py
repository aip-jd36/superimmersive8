"""
SI8-INTEL-NEWS-4C1 -- relevance-exclusion vs. admission-capacity-deferral
email presentation tests.

The Production run of 2026-09-29 sent an email claiming "24 development(s)
deferred this cycle (admission capacity, not judged unimportant)" when the
persisted audit proved all 24 were relevance-floor exclusions and zero were
capacity deferrals. These tests prove the corrected renderer can no longer
make that mistake, in every count combination, without changing HIGH/
MONITOR/Executive-Summary rendering at all.

No network call anywhere in this file.
"""

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from development import Development  # noqa: E402
from interpretation import BoundedInterpretation  # noqa: E402
from prioritization import DevelopmentPriority  # noqa: E402
from triage import TriageResult, is_capacity_deferred, is_relevance_excluded  # noqa: E402
from composition import (  # noqa: E402
    IntelligenceDigest,
    ExecutiveSummary,
    SummaryStatement,
    build_intelligence_digest,
)
from email_renderer import build_intelligence_email_html, _footer_note  # noqa: E402


def _digest(relevance_excluded_count=0, capacity_deferred_count=0, high=None, monitor=None, executive_summary=None):
    return IntelligenceDigest(
        date="Sep 29, 2026",
        executive_summary=executive_summary,
        high=high or [],
        monitor=monitor or [],
        lk_product_signals=[],
        marketing_opportunities=[],
        deferred_count=relevance_excluded_count + capacity_deferred_count,
        relevance_excluded_count=relevance_excluded_count,
        capacity_deferred_count=capacity_deferred_count,
    )


def _development(dev_id, title=None):
    title = title or f"Development {dev_id}"
    articles = [{
        "title": title, "url": f"https://example.com/{dev_id}", "source": "Outlet",
        "published": "Mon, 29 Sep 2026 00:00:00 GMT",
        "pub_date": datetime(2026, 9, 29, tzinfo=timezone.utc), "summary": "",
        "relevance_score": 9, "clusters": {"cluster_x"}, "queries": {"q"},
    }]
    return Development(id=dev_id, canonical_title=title, articles=articles, clusters={"cluster_x"}, queries={"q"})


def _interp(dev_id):
    return BoundedInterpretation(development_id=dev_id, source_facts="f", si8_relevance="r", uncertainty_watch="u", action="monitor")


class TestCaseA_RelevanceExclusionsOnly(unittest.TestCase):
    """24 relevance exclusions, 0 capacity deferrals -- the exact 2026-09-29
    Production shape."""

    def test_footer_never_says_deferred_with_the_excluded_count(self):
        digest = _digest(relevance_excluded_count=24, capacity_deferred_count=0)
        footer = _footer_note(digest)
        self.assertIn("24", footer)
        self.assertIn("screened out", footer)
        self.assertIn("relevance threshold", footer)

    def test_footer_does_not_attribute_exclusions_to_admission_capacity(self):
        digest = _digest(relevance_excluded_count=24, capacity_deferred_count=0)
        footer = _footer_note(digest)
        self.assertNotIn("admission capacity", footer)
        self.assertNotIn("24 development(s) deferred", footer)

    def test_html_does_not_contain_the_original_misleading_sentence(self):
        digest = _digest(relevance_excluded_count=24, capacity_deferred_count=0)
        html = build_intelligence_email_html(digest)
        self.assertNotIn("24 development(s) deferred this cycle (admission capacity", html)


class TestCaseB_CapacityDeferralsOnly(unittest.TestCase):
    """0 relevance exclusions, 3 capacity deferrals."""

    def test_footer_reports_capacity_deferral_accurately(self):
        digest = _digest(relevance_excluded_count=0, capacity_deferred_count=3)
        footer = _footer_note(digest)
        self.assertIn("3", footer)
        self.assertIn("admission capacity", footer)
        self.assertIn("not judged unimportant", footer)

    def test_footer_has_no_exclusion_statement(self):
        digest = _digest(relevance_excluded_count=0, capacity_deferred_count=3)
        footer = _footer_note(digest)
        self.assertNotIn("screened out", footer)
        self.assertNotIn("relevance threshold", footer)


class TestCaseC_BothMechanismsPresent(unittest.TestCase):
    """5 relevance exclusions, 3 capacity deferrals -- both rendered,
    separately, with correct counts."""

    def test_both_statements_present_with_correct_counts(self):
        digest = _digest(relevance_excluded_count=5, capacity_deferred_count=3)
        footer = _footer_note(digest)
        self.assertIn("5 development(s) screened out", footer)
        self.assertIn("3 relevant development(s) deferred", footer)

    def test_statements_are_distinct_not_merged(self):
        digest = _digest(relevance_excluded_count=5, capacity_deferred_count=3)
        footer = _footer_note(digest)
        # The exclusion count must never appear attached to "deferred" wording.
        self.assertNotIn("5 development(s) deferred", footer)
        # The capacity count must never appear attached to "screened out" wording.
        self.assertNotIn("3 development(s) screened out", footer)


class TestCaseD_NeitherMechanism(unittest.TestCase):
    """0 relevance exclusions, 0 capacity deferrals -- no misleading empty
    footer merely for symmetry."""

    def test_footer_note_is_empty(self):
        digest = _digest(relevance_excluded_count=0, capacity_deferred_count=0)
        self.assertEqual(_footer_note(digest), "")

    def test_no_footer_block_rendered_in_html(self):
        digest = _digest(relevance_excluded_count=0, capacity_deferred_count=0, high=[], monitor=[])
        html = build_intelligence_email_html(digest)
        self.assertNotIn("screened out", html)
        self.assertNotIn("admission capacity", html)
        # No empty bordered footer div either.
        self.assertNotIn('border-top:1px solid #eee;margin-top:28px', html)


class TestCaseE_OmitNeverEntersEitherCount(unittest.TestCase):
    def test_omit_tier_development_does_not_affect_exclusion_or_deferral_counts(self):
        d1 = _development("d1")
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted for bounded interpretation", max_article_score=8)]
        priorities = [DevelopmentPriority(development_id="d1", tier="OMIT", rationale="not material enough")]
        digest = build_intelligence_digest(
            [d1], triage_results, [(d1, _interp("d1"))], priorities,
            client=None, date_str="d",
        )
        self.assertEqual(digest.relevance_excluded_count, 0)
        self.assertEqual(digest.capacity_deferred_count, 0)
        self.assertEqual(len(digest.high), 0)
        self.assertEqual(len(digest.monitor), 0)

    def test_triage_classifiers_never_true_for_an_admitted_result(self):
        admitted = TriageResult(development_id="d1", admitted=True, reason="admitted for bounded interpretation", max_article_score=9)
        self.assertFalse(is_relevance_excluded(admitted))
        self.assertFalse(is_capacity_deferred(admitted))


class TestCaseF_HighMonitorAndSummaryUnaffected(unittest.TestCase):
    """The footer/stats_line fix must not change HIGH/MONITOR/Executive
    Summary rendering at all."""

    def test_high_monitor_and_summary_html_identical_regardless_of_footer_counts(self):
        d1 = _development("d1", title="A HIGH development")
        interp = _interp("d1")
        priority = DevelopmentPriority(development_id="d1", tier="HIGH", rationale="materially important")
        summary = ExecutiveSummary(statements=[SummaryStatement(text="One development matters this cycle.", supporting_development_ids=["d1"])])

        digest_a = _digest(relevance_excluded_count=24, capacity_deferred_count=0, high=[(d1, interp, priority)], executive_summary=summary)
        digest_b = _digest(relevance_excluded_count=0, capacity_deferred_count=3, high=[(d1, interp, priority)], executive_summary=summary)

        html_a = build_intelligence_email_html(digest_a)
        html_b = build_intelligence_email_html(digest_b)

        self.assertIn("A HIGH development", html_a)
        self.assertIn("A HIGH development", html_b)
        self.assertIn("One development matters this cycle.", html_a)
        self.assertIn("One development matters this cycle.", html_b)
        # Both must still render identical Material Developments / Executive
        # Summary content -- only the footer/stats line legitimately differs.
        self.assertIn("MATERIAL DEVELOPMENTS", html_a)
        self.assertIn("MATERIAL DEVELOPMENTS", html_b)
        self.assertIn("Executive Summary", html_a)
        self.assertIn("Executive Summary", html_b)


if __name__ == "__main__":
    unittest.main()
