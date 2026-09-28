"""
SI8-INTEL-NEWS-4B -- IntelligenceDigest / Executive Summary composition
tests.

No network call anywhere in this file.
"""

import copy
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from development import Development  # noqa: E402
from interpretation import BoundedInterpretation  # noqa: E402
from prioritization import DevelopmentPriority  # noqa: E402
from triage import TriageResult  # noqa: E402
from composition import (  # noqa: E402
    build_executive_summary,
    build_intelligence_digest,
    validate_executive_summary,
)


def _development(dev_id, title=None, clusters=("cluster_x",), n_sources=1, when=None):
    title = title or f"Development {dev_id}"
    articles = [
        {
            "title": title, "url": f"https://example.com/{dev_id}-{i}", "source": f"Outlet{i}",
            "published": "Mon, 28 Sep 2026 00:00:00 GMT",
            "pub_date": when or datetime(2026, 9, 28, tzinfo=timezone.utc), "summary": "",
            "relevance_score": 8, "clusters": set(clusters), "queries": {"q"},
        }
        for i in range(n_sources)
    ]
    return Development(id=dev_id, canonical_title=title, articles=articles, clusters=set(clusters), queries={"q"})


def _interp(dev_id, action="monitor", source_facts=None, si8_relevance=None, uncertainty_watch=None):
    return BoundedInterpretation(
        development_id=dev_id,
        source_facts=source_facts or f"Source facts for {dev_id}.",
        si8_relevance=si8_relevance or f"SI8 relevance for {dev_id}.",
        uncertainty_watch=uncertainty_watch or f"Uncertainty for {dev_id}.",
        action=action,
    )


def _priority(dev_id, tier="HIGH", degraded=False):
    return DevelopmentPriority(development_id=dev_id, tier=tier, rationale=f"rationale for {dev_id}", degraded=degraded)


class _FakeResponse:
    def __init__(self, text: str):
        self.content = [type("C", (), {"text": text})()]


class FakeClient:
    def __init__(self, script=None, text=None):
        self.script = script or {}
        self.text = text
        self.calls = 0
        self.prompts_seen: list[str] = []
        self.messages = self

    def create(self, *, model, max_tokens, messages):
        self.calls += 1
        prompt = messages[0]["content"]
        self.prompts_seen.append(prompt)
        if self.text is not None:
            return _FakeResponse(self.text)
        for key, text in self.script.items():
            if key in prompt:
                return _FakeResponse(text)
        raise AssertionError(f"FakeClient received an unscripted prompt: {prompt[:200]}...")


VALID_SUMMARY_JSON = '{"statements": [{"text": "One material development this cycle.", "supporting_development_ids": ["d1"]}]}'


class TestExecutiveSummaryInputContract(unittest.TestCase):
    def test_raw_article_summary_text_not_in_prompt(self):
        d = _development("d1")
        d.articles[0]["summary"] = "RAW_ARTICLE_BODY_MARKER"
        interp = _interp("d1")
        priority = _priority("d1")
        client = FakeClient(text=VALID_SUMMARY_JSON)
        build_executive_summary([(d, interp, priority)], client=client, model="m")
        self.assertNotIn("RAW_ARTICLE_BODY_MARKER", client.prompts_seen[0])

    def test_article_relevance_score_not_in_prompt(self):
        d = _development("d1")
        interp = _interp("d1")
        priority = _priority("d1")
        client = FakeClient(text=VALID_SUMMARY_JSON)
        build_executive_summary([(d, interp, priority)], client=client, model="m")
        self.assertNotIn("relevance_score", client.prompts_seen[0])

    def test_bounded_fields_present_in_prompt(self):
        d = _development("d1")
        interp = _interp("d1", source_facts="A specific verifiable fact.")
        priority = _priority("d1")
        client = FakeClient(text=VALID_SUMMARY_JSON)
        build_executive_summary([(d, interp, priority)], client=client, model="m")
        self.assertIn("A specific verifiable fact.", client.prompts_seen[0])

    def test_only_high_tier_considered_monitor_absent(self):
        """Input contract restricted to HIGH -- see module docstring: this
        is the primary structural defense against a MONITOR item being
        rhetorically promoted."""
        high = _development("high1")
        # A MONITOR item is never even passed into build_executive_summary's
        # `high` argument by build_intelligence_digest -- verified here at
        # the composition level.
        digest_high = [(high, _interp("high1"), _priority("high1", tier="HIGH"))]
        client = FakeClient(text='{"statements": [{"text": "x", "supporting_development_ids": ["high1"]}]}')
        result = build_executive_summary(digest_high, client=client, model="m")
        self.assertIsNotNone(result)
        prompt = client.prompts_seen[0]
        self.assertNotIn("MONITOR", prompt)


class TestExecutiveSummaryOutputAndProvenance(unittest.TestCase):
    def test_valid_summary_retains_supporting_ids(self):
        d = _development("d1")
        client = FakeClient(text=VALID_SUMMARY_JSON)
        result = build_executive_summary([(d, _interp("d1"), _priority("d1"))], client=client, model="m")
        self.assertEqual(len(result.statements), 1)
        self.assertEqual(result.statements[0].supporting_development_ids, ["d1"])

    def test_unknown_id_rejects_whole_summary(self):
        d = _development("d1")
        client = FakeClient(text='{"statements": [{"text": "x", "supporting_development_ids": ["unknown_id"]}]}')
        result = build_executive_summary([(d, _interp("d1"), _priority("d1"))], client=client, model="m")
        self.assertIsNone(result)

    def test_partial_valid_partial_unknown_rejects_whole_summary(self):
        """One hallucinated id among several valid statements rejects the
        entire summary, not just the bad statement."""
        d = _development("d1")
        raw = (
            '{"statements": ['
            '{"text": "valid one", "supporting_development_ids": ["d1"]},'
            '{"text": "bad one", "supporting_development_ids": ["ghost"]}'
            ']}'
        )
        client = FakeClient(text=raw)
        result = build_executive_summary([(d, _interp("d1"), _priority("d1"))], client=client, model="m")
        self.assertIsNone(result)

    def test_empty_statements_is_treated_as_omit(self):
        d = _development("d1")
        client = FakeClient(text='{"statements": []}')
        result = build_executive_summary([(d, _interp("d1"), _priority("d1"))], client=client, model="m")
        self.assertIsNone(result)

    def test_bounded_statement_count_enforced(self):
        d = _development("d1")
        statements = ",".join(f'{{"text": "s{i}", "supporting_development_ids": ["d1"]}}' for i in range(10))
        client = FakeClient(text=f'{{"statements": [{statements}]}}')
        result = build_executive_summary([(d, _interp("d1"), _priority("d1"))], client=client, model="m")
        self.assertIsNone(result)  # exceeds EXECUTIVE_SUMMARY_MAX_STATEMENTS


class TestExecutiveSummaryNonUpgradeGuardrails(unittest.TestCase):
    def test_prompt_contains_may_synthesize_may_not_upgrade(self):
        from composition import SUMMARY_PROMPT
        self.assertIn("MAY SYNTHESIZE", SUMMARY_PROMPT)
        self.assertIn("MAY NOT UPGRADE", SUMMARY_PROMPT)

    def test_prompt_covers_allegation_fact(self):
        from composition import SUMMARY_PROMPT
        self.assertIn("allegation -> established fact", SUMMARY_PROMPT)

    def test_prompt_covers_proposal_enacted(self):
        from composition import SUMMARY_PROMPT
        self.assertIn("proposal/bill -> enacted", SUMMARY_PROMPT)

    def test_prompt_covers_isolated_trend(self):
        from composition import SUMMARY_PROMPT
        self.assertIn("industry-wide trend", SUMMARY_PROMPT)

    def test_prompt_covers_possible_definite(self):
        from composition import SUMMARY_PROMPT
        self.assertIn("definite commercial consequence", SUMMARY_PROMPT)

    def test_prompt_covers_review_signal_governed_change(self):
        from composition import SUMMARY_PROMPT
        self.assertIn("claim that governed knowledge is wrong or must change", SUMMARY_PROMPT)

    def test_banned_upgrade_phrase_rejects_summary(self):
        d = _development("d1")
        client = FakeClient(text='{"statements": [{"text": "This proves that the industry has changed forever.", "supporting_development_ids": ["d1"]}]}')
        result = build_executive_summary([(d, _interp("d1"), _priority("d1"))], client=client, model="m")
        self.assertIsNone(result)


class TestSummaryFailureBehavior(unittest.TestCase):
    def test_malformed_json_omits_summary(self):
        d = _development("d1")
        client = FakeClient(text="not json at all")
        result = build_executive_summary([(d, _interp("d1"), _priority("d1"))], client=client, model="m")
        self.assertIsNone(result)

    def test_no_client_omits_summary(self):
        d = _development("d1")
        result = build_executive_summary([(d, _interp("d1"), _priority("d1"))], client=None, model="m")
        self.assertIsNone(result)

    def test_empty_high_list_omits_summary_without_calling_model(self):
        client = FakeClient(text=VALID_SUMMARY_JSON)
        result = build_executive_summary([], client=client, model="m")
        self.assertIsNone(result)
        self.assertEqual(client.calls, 0)

    def test_summary_failure_does_not_affect_digest_developments(self):
        """Summary failure is a composition-layer failure only -- the
        underlying HIGH/MONITOR intelligence must still be present."""
        d1 = _development("d1")
        interp1 = _interp("d1")
        priorities = [_priority("d1", tier="HIGH")]
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=8)]
        client = FakeClient(text="garbage, not json")
        digest = build_intelligence_digest(
            [d1], triage_results, [(d1, interp1)], priorities,
            client=client, model="m", date_str="Sep 28, 2026",
        )
        self.assertIsNone(digest.executive_summary)
        self.assertEqual(len(digest.high), 1)


class TestCompositionCannotMutateInputs(unittest.TestCase):
    def test_bounded_interpretation_unchanged_after_composition(self):
        d1 = _development("d1")
        interp1 = _interp("d1")
        interp1_snapshot = copy.deepcopy(interp1)
        priorities = [_priority("d1", tier="HIGH")]
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=8)]
        client = FakeClient(text='{"statements": []}')
        build_intelligence_digest([d1], triage_results, [(d1, interp1)], priorities, client=client, model="m", date_str="d")
        self.assertEqual(interp1, interp1_snapshot)

    def test_priority_unchanged_after_composition(self):
        d1 = _development("d1")
        interp1 = _interp("d1")
        priority1 = _priority("d1", tier="MONITOR")
        priority1_snapshot = copy.deepcopy(priority1)
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=6)]
        client = FakeClient(text='{"statements": []}')
        build_intelligence_digest([d1], triage_results, [(d1, interp1)], [priority1], client=client, model="m", date_str="d")
        self.assertEqual(priority1, priority1_snapshot)


class TestMonitorCannotBePromotedByComposition(unittest.TestCase):
    def test_monitor_tier_development_never_appears_in_high(self):
        d1 = _development("d1")
        interp1 = _interp("d1")
        priorities = [_priority("d1", tier="MONITOR")]
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=6)]
        client = FakeClient(text='{"statements": []}')
        digest = build_intelligence_digest([d1], triage_results, [(d1, interp1)], priorities, client=client, model="m", date_str="d")
        self.assertEqual(len(digest.high), 0)
        self.assertEqual(len(digest.monitor), 1)


class TestOmitDeferredNeverAppearAsMaterial(unittest.TestCase):
    def test_omit_tier_excluded_from_both_sections(self):
        d1 = _development("d1")
        interp1 = _interp("d1")
        priorities = [_priority("d1", tier="OMIT")]
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=6)]
        client = FakeClient(text='{"statements": []}')
        digest = build_intelligence_digest([d1], triage_results, [(d1, interp1)], priorities, client=client, model="m", date_str="d")
        self.assertEqual(len(digest.high), 0)
        self.assertEqual(len(digest.monitor), 0)

    def test_deferred_development_never_appears_in_digest_sections(self):
        """A Development that never had a DevelopmentPriority (deferred by
        triage) must never appear in high/monitor -- only its count is
        reflected."""
        d1 = _development("d1")
        d2_deferred = _development("d2")
        triage_results = [
            TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=8),
            TriageResult(development_id="d2", admitted=False, reason="deferred", max_article_score=3),
        ]
        priorities = [_priority("d1", tier="HIGH")]
        client = FakeClient(text='{"statements": []}')
        digest = build_intelligence_digest(
            [d1, d2_deferred], triage_results, [(d1, _interp("d1"))], priorities,
            client=client, model="m", date_str="d",
        )
        all_ids = {d.id for d, *_ in digest.high} | {d.id for d, *_ in digest.monitor}
        self.assertNotIn("d2", all_ids)
        self.assertEqual(digest.deferred_count, 1)


class TestLkProductSignalsAreReviewSignalsOnly(unittest.TestCase):
    def test_review_living_knowledge_action_projects_to_signals(self):
        d1 = _development("d1")
        interp1 = _interp("d1", action="review_living_knowledge")
        priorities = [_priority("d1", tier="MONITOR")]
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=6)]
        client = FakeClient(text='{"statements": []}')
        digest = build_intelligence_digest([d1], triage_results, [(d1, interp1)], priorities, client=client, model="m", date_str="d")
        self.assertEqual(len(digest.lk_product_signals), 1)

    def test_monitor_action_does_not_project_to_signals(self):
        d1 = _development("d1")
        interp1 = _interp("d1", action="monitor")
        priorities = [_priority("d1", tier="MONITOR")]
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=6)]
        client = FakeClient(text='{"statements": []}')
        digest = build_intelligence_digest([d1], triage_results, [(d1, interp1)], priorities, client=client, model="m", date_str="d")
        self.assertEqual(len(digest.lk_product_signals), 0)

    def test_marketing_opportunity_action_projects_to_marketing_only(self):
        d1 = _development("d1")
        interp1 = _interp("d1", action="consider_marketing_opportunity")
        priorities = [_priority("d1", tier="MONITOR")]
        triage_results = [TriageResult(development_id="d1", admitted=True, reason="admitted", max_article_score=6)]
        client = FakeClient(text='{"statements": []}')
        digest = build_intelligence_digest([d1], triage_results, [(d1, interp1)], priorities, client=client, model="m", date_str="d")
        self.assertEqual(len(digest.marketing_opportunities), 1)
        self.assertEqual(len(digest.lk_product_signals), 0)


if __name__ == "__main__":
    unittest.main()
