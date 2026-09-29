"""
SI8-INTEL-NEWS-4C -- editorial audit trail tests.

Proves the audit mechanism is a pure, deterministic projection of objects
the pipeline already computes -- no new decision, no new model call, no
effect on the email or DIGEST-LOG.md. No network call anywhere in this
file.
"""

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from development import Development  # noqa: E402
from interpretation import BoundedInterpretation  # noqa: E402
from prioritization import DevelopmentPriority  # noqa: E402
from triage import TriageResult  # noqa: E402
from composition import IntelligenceDigest, ExecutiveSummary, SummaryStatement  # noqa: E402
from email_renderer import build_intelligence_email_html  # noqa: E402
from audit import RunAudit, build_run_audit  # noqa: E402


def _development(dev_id, title=None, clusters=("cluster_x",), n_sources=1):
    title = title or f"Development {dev_id}"
    articles = [
        {
            "title": title, "url": f"https://example.com/{dev_id}-{i}", "source": f"Outlet{i}",
            "published": "Mon, 28 Sep 2026 00:00:00 GMT",
            "pub_date": datetime(2026, 9, 28, tzinfo=timezone.utc),
            "summary": "RAW_ARTICLE_SUMMARY_SHOULD_NEVER_BE_PERSISTED_BY_AUDIT",
            "relevance_score": 8, "clusters": set(clusters), "queries": {"q"},
        }
        for i in range(n_sources)
    ]
    return Development(id=dev_id, canonical_title=title, articles=articles, clusters=set(clusters), queries={"q"})


def _interp(dev_id, action="monitor"):
    return BoundedInterpretation(
        development_id=dev_id, source_facts="facts", si8_relevance="relevance",
        uncertainty_watch="watch", action=action,
    )


class TestTriageDispositionDistinctness(unittest.TestCase):
    """Cases 1/2 (Phase 5): relevance-floor exclusion stays distinguishable
    from admission-capacity deferral -- never collapsed into one ambiguous
    'deferred' bucket."""

    def test_relevance_floor_exclusion_identifiable(self):
        d1, d2 = _development("d1"), _development("d2")
        triage_results = [
            TriageResult(development_id="d1", admitted=False, reason="excluded: below relevance floor (2 < 3)", max_article_score=2),
            TriageResult(development_id="d2", admitted=True, reason="admitted for bounded interpretation", max_article_score=8),
        ]
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=1)
        audit = build_run_audit([d1, d2], triage_results, [], digest, date_str="Sep 28, 2026")
        self.assertEqual(audit.excluded_count, 1)
        self.assertEqual(audit.capacity_deferred_count, 0)
        self.assertEqual(audit.excluded[0].canonical_title, "Development d1")
        self.assertEqual(audit.excluded[0].max_article_score, 2)

    def test_admission_capacity_deferral_identifiable_and_distinct(self):
        d1 = _development("d1")
        triage_results = [
            TriageResult(development_id="d1", admitted=False, reason="deferred: admission capacity exhausted this cycle", max_article_score=7),
        ]
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=1)
        audit = build_run_audit([d1], triage_results, [], digest, date_str="d")
        self.assertEqual(audit.capacity_deferred_count, 1)
        self.assertEqual(audit.excluded_count, 0)
        self.assertEqual(audit.capacity_deferred[0].max_article_score, 7)

    def test_mixed_dispositions_not_collapsed(self):
        d1, d2, d3 = _development("d1"), _development("d2"), _development("d3")
        triage_results = [
            TriageResult(development_id="d1", admitted=False, reason="excluded: below relevance floor (1 < 3)", max_article_score=1),
            TriageResult(development_id="d2", admitted=False, reason="deferred: admission capacity exhausted this cycle", max_article_score=6),
            TriageResult(development_id="d3", admitted=True, reason="admitted for bounded interpretation", max_article_score=9),
        ]
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=2)
        audit = build_run_audit([d1, d2, d3], triage_results, [], digest, date_str="d")
        self.assertEqual(audit.excluded_count, 1)
        self.assertEqual(audit.capacity_deferred_count, 1)


class TestOmitIdentifiableAndCounted(unittest.TestCase):
    """Case 3: a priority OMIT remains identifiable and counted -- the
    exact gap SI8-INTEL-NEWS-4C0 found (composition.py's deferred_count
    never included OMIT at all)."""

    def test_omit_tier_present_in_prioritized_and_counted(self):
        d1 = _development("d1")
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=8)]
        priorities = [DevelopmentPriority(development_id="d1", tier="OMIT", rationale="not material enough")]
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=0)
        audit = build_run_audit([d1], triage_results, priorities, digest, date_str="d")
        self.assertEqual(audit.omit_count, 1)
        self.assertEqual(len(audit.prioritized), 1)
        self.assertEqual(audit.prioritized[0].tier, "OMIT")
        self.assertEqual(audit.prioritized[0].rationale, "not material enough")


class TestHighMonitorRepresentation(unittest.TestCase):
    """Case 4."""

    def test_high_and_monitor_both_represented(self):
        d1, d2 = _development("d1"), _development("d2")
        triage_results = [
            TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=9),
            TriageResult(development_id="d2", admitted=True, reason="admitted", max_article_score=6),
        ]
        priorities = [
            DevelopmentPriority(development_id="d1", tier="HIGH", rationale="materially important"),
            DevelopmentPriority(development_id="d2", tier="MONITOR", rationale="worth tracking"),
        ]
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=0)
        audit = build_run_audit([d1, d2], triage_results, priorities, digest, date_str="d")
        self.assertEqual(audit.high_count, 1)
        self.assertEqual(audit.monitor_count, 1)
        tiers = {p.canonical_title: p.tier for p in audit.prioritized}
        self.assertEqual(tiers, {"Development d1": "HIGH", "Development d2": "MONITOR"})


class TestExecutiveSummaryPreservedExactly(unittest.TestCase):
    """Case 5."""

    def test_summary_statements_and_provenance_preserved(self):
        summary = ExecutiveSummary(statements=[
            SummaryStatement(text="Two developments concern disclosure obligations.", supporting_development_ids=["d1", "d2"]),
        ])
        digest = IntelligenceDigest(date="d", executive_summary=summary, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=0)
        audit = build_run_audit([], [], [], digest, date_str="d")
        self.assertEqual(len(audit.executive_summary_statements), 1)
        text, ids = audit.executive_summary_statements[0]
        self.assertEqual(text, "Two developments concern disclosure obligations.")
        self.assertEqual(ids, ["d1", "d2"])

    def test_no_summary_represented_as_empty_not_fabricated(self):
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=0)
        audit = build_run_audit([], [], [], digest, date_str="d")
        self.assertEqual(audit.executive_summary_statements, [])


class TestCountReconciliation(unittest.TestCase):
    """Case 6: audit counts reconcile with the represented decisions."""

    def test_total_candidate_count_matches_input_developments(self):
        devs = [_development(f"d{i}") for i in range(5)]
        triage_results = [
            TriageResult(development_id="d0", admitted=False, reason="excluded: below relevance floor (1 < 3)", max_article_score=1),
            TriageResult(development_id="d1", admitted=False, reason="deferred: admission capacity exhausted this cycle", max_article_score=5),
            TriageResult(development_id="d2", admitted=True, reason="admitted", max_article_score=9),
            TriageResult(development_id="d3", admitted=True, reason="admitted", max_article_score=7),
            TriageResult(development_id="d4", admitted=True, reason="admitted", max_article_score=6),
        ]
        priorities = [
            DevelopmentPriority(development_id="d2", tier="HIGH", rationale="x"),
            DevelopmentPriority(development_id="d3", tier="MONITOR", rationale="y"),
            DevelopmentPriority(development_id="d4", tier="OMIT", rationale="z"),
        ]
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=2)
        audit = build_run_audit(devs, triage_results, priorities, digest, date_str="d")
        self.assertEqual(audit.total_candidate_count, len(devs))
        self.assertEqual(audit.high_count + audit.monitor_count + audit.omit_count, 3)
        self.assertEqual(audit.excluded_count + audit.capacity_deferred_count, 2)


class TestNoRawArticleBodyPersisted(unittest.TestCase):
    """Case 7."""

    def test_no_summary_text_or_url_in_any_audit_record(self):
        d1 = _development("d1", n_sources=3)
        triage_results = [TriageResult(development_id="d1", admitted=False, reason="excluded: below relevance floor (2 < 3)", max_article_score=2)]
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=1)
        audit = build_run_audit([d1], triage_results, [], digest, date_str="d")
        record = audit.excluded[0]
        # The record must not carry the raw article summary/url at all --
        # only title/cluster/source_count/score/reason.
        for field_name in ("canonical_title", "clusters", "source_count", "max_article_score", "reason"):
            self.assertTrue(hasattr(record, field_name))
        self.assertFalse(hasattr(record, "url"))
        self.assertFalse(hasattr(record, "summary"))
        self.assertFalse(hasattr(record, "articles"))

    def test_prioritized_record_has_no_raw_article_fields(self):
        d1 = _development("d1")
        priorities = [DevelopmentPriority(development_id="d1", tier="MONITOR", rationale="x")]
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=6)]
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=0)
        audit = build_run_audit([d1], triage_results, priorities, digest, date_str="d")
        record = audit.prioritized[0]
        self.assertFalse(hasattr(record, "url"))
        self.assertFalse(hasattr(record, "articles"))


class TestAuditCannotMutateInputs(unittest.TestCase):
    """Phase 6: recording a decision must never become making one --
    build_run_audit must never write to any object it reads."""

    def test_development_priority_and_triage_result_unchanged_after_audit(self):
        import copy
        d1 = _development("d1")
        triage_result = TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=8)
        priority = DevelopmentPriority(development_id="d1", tier="HIGH", rationale="x")
        d1_snapshot = copy.deepcopy(d1)
        triage_snapshot = copy.deepcopy(triage_result)
        priority_snapshot = copy.deepcopy(priority)
        digest = IntelligenceDigest(date="d", executive_summary=None, high=[], monitor=[], lk_product_signals=[], marketing_opportunities=[], deferred_count=0)
        build_run_audit([d1], [triage_result], [priority], digest, date_str="d")
        self.assertEqual(d1, d1_snapshot)
        self.assertEqual(triage_result, triage_snapshot)
        self.assertEqual(priority, priority_snapshot)


class TestEmailUnaffectedByAudit(unittest.TestCase):
    """Cases 8/9 (structural): building the audit must never change the
    email HTML -- proves observability is a pure side-observation, not a
    new decision affecting presentation."""

    def test_email_html_identical_with_and_without_building_audit(self):
        d1 = _development("d1")
        priorities = [DevelopmentPriority(development_id="d1", tier="HIGH", rationale="x")]
        interp = _interp("d1")
        digest = IntelligenceDigest(
            date="Sep 28, 2026", executive_summary=None,
            high=[(d1, interp, priorities[0])], monitor=[], lk_product_signals=[], marketing_opportunities=[],
            deferred_count=0,
        )
        html_before = build_intelligence_email_html(digest)
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=9)]
        build_run_audit([d1], triage_results, priorities, digest, date_str="Sep 28, 2026")
        html_after = build_intelligence_email_html(digest)
        self.assertEqual(html_before, html_after)


if __name__ == "__main__":
    unittest.main()
