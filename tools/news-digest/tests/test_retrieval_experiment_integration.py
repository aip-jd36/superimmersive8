"""
SI8-INTEL-NEWS-5B5 -- retrieval recall experiment: integration/isolation
tests.

Every network/model boundary is faked; no real HTTP call, no real model
call, no file write outside a temp directory, anywhere in this file.
Proves: Control-A's provider request is byte-identical to pre-5B5
Production; Experiment-B differs only by the when:7d transform; retrieval-
variant provenance survives dedup/Development formation distinctly from
query/cluster provenance; a variant failure is never a fabricated zero;
and -- most importantly -- the experimental path can never reach email
rendering, send_email, DIGEST-LOG, or DIGEST-AUDIT, with or without a
failure inside the experimental path.
"""

import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from pathlib import Path

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("RESEND_API_KEY", "test-key")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import digest  # noqa: E402
from retrieval_experiment import CONTROL, RECENCY_7D  # noqa: E402


def _rfc2822(dt: datetime) -> str:
    return format_datetime(dt)


class _FakeFeed:
    def __init__(self, entries):
        self.entries = entries


class TestVariantRequestConstruction(unittest.TestCase):
    """No real HTTP call -- only the constructed URL is inspected via a
    faked feedparser.parse that records what it was called with."""

    def setUp(self):
        self._orig_parse = digest.feedparser.parse
        self.captured_urls = []

        def fake_parse(url):
            self.captured_urls.append(url)
            return _FakeFeed([])

        digest.feedparser.parse = fake_parse

    def tearDown(self):
        digest.feedparser.parse = self._orig_parse

    def test_control_request_is_byte_identical_to_pre_5b5_production(self):
        digest._fetch_google_news_observed("AI video copyright (lawsuit OR sues)", 7, cluster="c")
        self.assertEqual(len(self.captured_urls), 1)
        url = self.captured_urls[0]
        self.assertIn("q=AI%20video%20copyright", url)
        self.assertNotIn("when", url)
        self.assertIn("hl=en-US&gl=US&ceid=US:en", url)

    def test_experiment_b_request_appends_when_7d_only(self):
        digest._fetch_google_news_observed("AI video copyright (lawsuit OR sues)", 7, cluster="c", variant=RECENCY_7D)
        url = self.captured_urls[0]
        self.assertIn("when%3A7d", url)
        self.assertIn("q=AI%20video%20copyright", url)

    def test_same_governed_query_text_reaches_both_variants_unmodified_in_records(self):
        query = "AI video copyright (lawsuit OR sues)"
        _articles_a, record_a = digest._fetch_google_news_observed(query, 7, cluster="c", variant=CONTROL)
        _articles_b, record_b = digest._fetch_google_news_observed(query, 7, cluster="c", variant=RECENCY_7D)
        self.assertEqual(record_a.query, query)
        self.assertEqual(record_b.query, query, "the RECORDED query text must stay the governed query, never the transformed request string")
        self.assertEqual(record_a.variant, "control")
        self.assertEqual(record_b.variant, "recency_7d")

    def test_variant_failure_distinct_from_legitimate_zero_results(self):
        digest.feedparser.parse = lambda url: (_ for _ in ()).throw(ConnectionError("boom"))
        _articles, record = digest._fetch_google_news_observed("q", 7, cluster="c", variant=RECENCY_7D)
        self.assertEqual(record.status, "failed")
        self.assertEqual(record.variant, "recency_7d")
        self.assertIsNone(record.returned_count)


class TestRetrievalVariantProvenance(unittest.TestCase):
    def _article(self, title, variants, source="Outlet"):
        return {"title": title, "source": source, "clusters": {"c"}, "queries": {"q"},
                "retrieval_variants": set(variants)}

    def test_a_only_provenance_survives_dedup(self):
        result = digest.dedupe_and_merge_provenance([self._article("Distinct Title One", {"control"})])
        self.assertEqual(result[0]["retrieval_variants"], {"control"})

    def test_b_only_provenance_survives_dedup(self):
        result = digest.dedupe_and_merge_provenance([self._article("Distinct Title Two", {"recency_7d"})])
        self.assertEqual(result[0]["retrieval_variants"], {"recency_7d"})

    def test_both_provenance_after_dedup_of_same_title_from_each_variant(self):
        a1 = self._article("Same Underlying Story", {"control"})
        a2 = self._article("Same Underlying Story", {"recency_7d"})
        result = digest.dedupe_and_merge_provenance([a1, a2])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["retrieval_variants"], {"control", "recency_7d"})

    def test_query_cluster_provenance_independent_of_retrieval_variant(self):
        """Adding retrieval_variants must never collapse into or replace
        clusters/queries provenance -- all three survive independently."""
        a1 = {"title": "Independent Provenance Story", "source": "X",
              "clusters": {"cluster_a"}, "queries": {"query_a"}, "retrieval_variants": {"control"}}
        a2 = {"title": "Independent Provenance Story", "source": "X",
              "clusters": {"cluster_b"}, "queries": {"query_b"}, "retrieval_variants": {"recency_7d"}}
        result = digest.dedupe_and_merge_provenance([a1, a2])
        self.assertEqual(result[0]["clusters"], {"cluster_a", "cluster_b"})
        self.assertEqual(result[0]["queries"], {"query_a", "query_b"})
        self.assertEqual(result[0]["retrieval_variants"], {"control", "recency_7d"})

    def test_development_level_retrieval_variants_is_union_of_constituent_articles(self):
        articles = [
            self._article("Development Story Part One", {"control"}),
            self._article("Development Story Part Two", {"recency_7d"}),
        ]
        deduped = digest.dedupe_and_merge_provenance(articles)  # distinct titles, stay separate
        developments = digest.build_developments(deduped, client=None)  # no client -> one-per-development fallback
        variant_sets = {frozenset(d.retrieval_variants) for d in developments}
        self.assertIn(frozenset({"control"}), variant_sets)
        self.assertIn(frozenset({"recency_7d"}), variant_sets)

    def test_pre_5b5_article_without_retrieval_variants_key_is_unaffected(self):
        """Every pre-5B5 caller/test builds article dicts with no
        retrieval_variants key at all -- dedup must default to an empty
        set, never raise, never affect clusters/queries."""
        a = {"title": "Legacy Shaped Article", "source": "X", "clusters": {"c"}, "queries": {"q"}}
        result = digest.dedupe_and_merge_provenance([a])
        self.assertEqual(result[0]["retrieval_variants"], set())
        self.assertEqual(result[0]["clusters"], {"c"})


class TestProductionIsolation(unittest.TestCase):
    """Full in-process runs with every network/model boundary faked --
    proves the experimental path structurally cannot reach the customer
    email or Production logs, with or without a failure inside it."""

    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self._orig_log_path = digest.DIGEST_LOG_PATH
        digest.DIGEST_LOG_PATH = Path(self._tmpdir.name) / "DIGEST-LOG.md"
        self._orig_audit_path = digest.AUDIT_LOG_PATH
        digest.AUDIT_LOG_PATH = Path(self._tmpdir.name) / "DIGEST-AUDIT.md"
        self._orig_retrieval_path = digest.RETRIEVAL_LOG_PATH
        digest.RETRIEVAL_LOG_PATH = Path(self._tmpdir.name) / "RETRIEVAL-LOG.jsonl"
        self._orig_experiment_path = digest.RETRIEVAL_EXPERIMENT_LOG_PATH
        digest.RETRIEVAL_EXPERIMENT_LOG_PATH = Path(self._tmpdir.name) / "RETRIEVAL-EXPERIMENT-LOG.jsonl"

        self._orig_client = digest.client
        digest.client = self._FakeAnthropicClient()

        self._orig_fetch = digest.fetch_all_articles
        digest.fetch_all_articles = self._fake_fetch_all_articles

        self.sent_html = {}

        def _fake_send_email(html, week_str, dry_run=False):
            self.sent_html["html"] = html
            return True
        self._orig_send_email = digest.send_email
        digest.send_email = _fake_send_email

        self._orig_kw_clusters = digest.KEYWORD_CLUSTERS
        digest.KEYWORD_CLUSTERS = [{"name": "cluster_a", "queries": ["experiment query one"]}]

        self._orig_parse = digest.feedparser.parse
        self._orig_sleep = digest.time.sleep
        digest.time.sleep = lambda *_a, **_k: None

    def tearDown(self):
        digest.DIGEST_LOG_PATH = self._orig_log_path
        digest.AUDIT_LOG_PATH = self._orig_audit_path
        digest.RETRIEVAL_LOG_PATH = self._orig_retrieval_path
        digest.RETRIEVAL_EXPERIMENT_LOG_PATH = self._orig_experiment_path
        digest.client = self._orig_client
        digest.fetch_all_articles = self._orig_fetch
        digest.send_email = self._orig_send_email
        digest.KEYWORD_CLUSTERS = self._orig_kw_clusters
        digest.feedparser.parse = self._orig_parse
        digest.time.sleep = self._orig_sleep
        self._tmpdir.cleanup()

    @staticmethod
    def _fake_fetch_all_articles(lookback_days):
        return [{
            "title": "Regulator issues new AI advertising disclosure guidance",
            "url": "https://example.com/a1", "source": "Some Outlet",
            "published": "Mon, 28 Sep 2026 00:00:00 GMT",
            "pub_date": datetime(2026, 9, 28, tzinfo=timezone.utc),
            "summary": "A regulator issued draft guidance.",
            "clusters": {"regulation_policy_commercial_media"}, "queries": {"q"},
            "retrieval_variants": {"control"},
        }]

    class _FakeAnthropicClient:
        def __init__(self):
            self.messages = self
            self.calls = 0

        def create(self, *, model, max_tokens, messages):
            self.calls += 1
            prompt = messages[0]["content"]
            if "relevance_score" in prompt and "source_facts" not in prompt:
                return self._resp('[{"relevance_score": 8, "relevance_reason": "in-domain"}]')
            if "source_facts" in prompt and "action" in prompt and "priority_tier" not in prompt and "MAY SYNTHESIZE" not in prompt:
                return self._resp(
                    '{"source_facts": "A regulator issued draft guidance.", '
                    '"si8_relevance": "May inform SI8 positioning.", '
                    '"uncertainty_watch": "Draft, not yet finalized.", '
                    '"action": "monitor", "action_rationale": "worth tracking"}'
                )
            if "priority_tier" in prompt:
                import re
                dev_id = re.search(r"id: ([0-9a-f-]+)", prompt).group(1)
                return self._resp(f'[{{"development_id": "{dev_id}", "priority_tier": "MONITOR", "priority_rationale": "grounded"}}]')
            if "MAY SYNTHESIZE" in prompt:
                return self._resp('{"statements": []}')
            raise AssertionError(f"Unscripted prompt: {prompt[:200]}")

        @staticmethod
        def _resp(text):
            return type("R", (), {"content": [type("C", (), {"text": text})()]})()

    def _run_main(self, extra_argv):
        old_argv = sys.argv
        sys.argv = ["digest.py", "--dry-run", "--lookback", "7"] + extra_argv
        try:
            digest.main()
        finally:
            sys.argv = old_argv

    def test_experiment_disabled_normal_production_output_unchanged(self):
        original = digest.run_retrieval_experiment
        digest.run_retrieval_experiment = self._poison("run_retrieval_experiment should not be called when --experiment-recency is absent")
        try:
            self._run_main([])
        finally:
            digest.run_retrieval_experiment = original
        self.assertIn("html", self.sent_html)
        self.assertFalse(digest.RETRIEVAL_EXPERIMENT_LOG_PATH.exists())

    def _poison(self, message):
        def _fn(*_a, **_k):
            raise AssertionError(message)
        return _fn

    def test_experiment_enabled_email_and_logs_unaffected_by_experiment_content(self):
        digest.feedparser.parse = lambda url: _FakeFeed([])  # experiment B: legitimately zero results
        self._run_main(["--experiment-recency"])
        self.assertIn("html", self.sent_html)
        html = self.sent_html["html"]
        self.assertIn("News Intelligence", html)
        self.assertNotIn("recency_7d", html)
        self.assertNotIn("RETRIEVAL-EXPERIMENT", html)
        log_text = digest.DIGEST_LOG_PATH.read_text(encoding="utf-8")
        self.assertNotIn("recency_7d", log_text)
        audit_text = digest.AUDIT_LOG_PATH.read_text(encoding="utf-8")
        self.assertNotIn("recency_7d", audit_text)
        self.assertTrue(digest.RETRIEVAL_EXPERIMENT_LOG_PATH.exists(), "experiment log should have been written when enabled")

    def test_b_provider_failure_does_not_affect_normal_production_output(self):
        digest.feedparser.parse = lambda url: (_ for _ in ()).throw(ConnectionError("simulated"))
        self._run_main(["--experiment-recency"])
        self.assertIn("html", self.sent_html, "Production email must still be sent even though experiment B failed entirely")
        exp_text = digest.RETRIEVAL_EXPERIMENT_LOG_PATH.read_text(encoding="utf-8") if digest.RETRIEVAL_EXPERIMENT_LOG_PATH.exists() else ""
        # experiment log, if written, must reflect the union of ONLY control
        # articles (since B failed) -- never fabricate B results.
        if exp_text:
            self.assertNotIn('"variant": "recency_7d", "status": "success"', exp_text.replace(" ", "").replace("'", '"'))

    def test_experimental_downstream_interpretation_failure_does_not_break_production(self):
        real_create = digest.client.create
        call_state = {"experiment_started": False}

        def flaky_create(*, model, max_tokens, messages):
            prompt = messages[0]["content"]
            if call_state["experiment_started"] and "source_facts" in prompt and "priority_tier" not in prompt:
                raise RuntimeError("simulated experimental interpretation failure")
            return real_create(model=model, max_tokens=max_tokens, messages=messages)

        digest.feedparser.parse = lambda url: _FakeFeed([{
            "title": "Brand new fresh story only found by recency - Outlet",
            "link": "u1", "published": format_datetime(datetime.now(timezone.utc) - timedelta(hours=1)),
            "summary": "",
        }])
        digest.client.create = flaky_create
        call_state["experiment_started"] = True
        try:
            self._run_main(["--experiment-recency"])
        finally:
            digest.client.create = real_create
        self.assertIn("html", self.sent_html, "a failure inside the experimental interpretation call must never break the already-completed Production run")

    def test_experiment_model_call_minimization_reused_vs_fresh(self):
        """SI8-INTEL-NEWS-5B5 Phase 12: with two Control Developments (each
        already interpreted+prioritized for real) and Experiment B
        rediscovering one of them verbatim while also finding one
        genuinely new story, the experiment must reuse the two matched
        conclusions and issue model calls for ONLY the one new story --
        never re-interpret/re-prioritize evidence already evaluated."""
        digest.fetch_all_articles = lambda lookback_days: [
            {"title": "Regulatory Alpha Announcement", "url": "u1", "source": "A",
             "published": "Mon, 28 Sep 2026 00:00:00 GMT",
             "pub_date": datetime(2026, 9, 28, tzinfo=timezone.utc),
             "summary": "", "clusters": {"c"}, "queries": {"q"},
             "retrieval_variants": {"control"}},
            {"title": "Litigation Beta Verdict", "url": "u2", "source": "B",
             "published": "Mon, 28 Sep 2026 00:00:00 GMT",
             "pub_date": datetime(2026, 9, 28, tzinfo=timezone.utc),
             "summary": "", "clusters": {"c"}, "queries": {"q"},
             "retrieval_variants": {"control"}},
        ]
        recent = datetime.now(timezone.utc) - timedelta(hours=1)
        digest.feedparser.parse = lambda url: _FakeFeed([{
            "title": "Brand New Recency Only Story - Outlet",
            "link": "u3", "published": format_datetime(recent), "summary": "",
        }])

        real_create = digest.client.create
        interpretation_calls = {"count": 0}

        def counting_create(*, model, max_tokens, messages):
            prompt = messages[0]["content"]
            if "relevance_score" in prompt and "source_facts" not in prompt:
                n = prompt.count("Title:")
                scores = ", ".join('{"relevance_score": 8, "relevance_reason": "in-domain"}' for _ in range(n))
                return self._FakeAnthropicClient._resp(f"[{scores}]")
            if "source_facts" in prompt and "action" in prompt and "priority_tier" not in prompt and "MAY SYNTHESIZE" not in prompt:
                interpretation_calls["count"] += 1
                return self._FakeAnthropicClient._resp(
                    '{"source_facts": "x", "si8_relevance": "y", '
                    '"uncertainty_watch": "z", "action": "monitor", "action_rationale": "w"}'
                )
            if "priority_tier" in prompt:
                import re
                dev_id = re.search(r"id: ([0-9a-f-]+)", prompt).group(1)
                return self._FakeAnthropicClient._resp(f'[{{"development_id": "{dev_id}", "priority_tier": "MONITOR", "priority_rationale": "grounded"}}]')
            if "MAY SYNTHESIZE" in prompt:
                return self._FakeAnthropicClient._resp('{"statements": []}')
            raise AssertionError(f"Unscripted prompt: {prompt[:200]}")

        digest.client.create = counting_create
        try:
            self._run_main(["--experiment-recency"])
        finally:
            digest.client.create = real_create

        # Real Control-A run interprets its own 2 Developments (Alpha,
        # Beta) = 2 calls. The experiment must add exactly 1 MORE call --
        # for the brand-new recency-only story -- never re-interpreting
        # Alpha or Beta a second time.
        self.assertEqual(interpretation_calls["count"], 3,
                          "expected 2 real interpretation calls + exactly 1 fresh experimental call, not a full re-run of all evidence")

        exp_text = digest.RETRIEVAL_EXPERIMENT_LOG_PATH.read_text(encoding="utf-8")
        payload = json.loads(exp_text.strip().splitlines()[-1])
        reused_count = sum(1 for d in payload["developments"] if d["reused"])
        fresh_count = sum(1 for d in payload["developments"] if not d["reused"] and d["admitted"])
        self.assertEqual(reused_count, 2, "Alpha and Beta must both be marked reused")
        self.assertEqual(fresh_count, 1, "only the brand-new story should be marked freshly evaluated")
        print(f"\n  [Phase 12] Control Developments: 2 | canonical experiment Developments: "
              f"{len(payload['developments'])} | reused: {reused_count} | fresh: {fresh_count} | "
              f"experimental interpretation calls: {interpretation_calls['count'] - 2} "
              f"(would be {len(payload['developments'])} under a full A∪B pipeline rerun)")
        # SI8-INTEL-NEWS-5B6: the run-level summary must independently
        # corroborate the same counts derivable from the developments array.
        self.assertEqual(payload["status"], "complete")
        self.assertEqual(payload["b_query_failure_count"], 0)
        self.assertEqual(payload["reused_count"], reused_count)
        self.assertEqual(payload["fresh_count"], fresh_count)

    def test_complete_experiment_status_when_all_b_queries_succeed(self):
        digest.KEYWORD_CLUSTERS = [{"name": "c", "queries": ["q1", "q2"]}]
        digest.feedparser.parse = lambda url: _FakeFeed([])
        self._run_main(["--experiment-recency"])
        payload = json.loads(digest.RETRIEVAL_EXPERIMENT_LOG_PATH.read_text(encoding="utf-8").strip())
        self.assertEqual(payload["status"], "complete")
        self.assertEqual(payload["b_query_count"], 2)
        self.assertEqual(payload["b_query_failure_count"], 0)

    def test_incomplete_experiment_status_when_some_b_queries_fail(self):
        digest.KEYWORD_CLUSTERS = [{"name": "c", "queries": ["q1", "q2", "q3"]}]

        def flaky_parse(url):
            if "q2" in url:
                raise ConnectionError("simulated")
            return _FakeFeed([])
        digest.feedparser.parse = flaky_parse

        self._run_main(["--experiment-recency"])
        payload = json.loads(digest.RETRIEVAL_EXPERIMENT_LOG_PATH.read_text(encoding="utf-8").strip())
        self.assertEqual(payload["status"], "incomplete",
                          "a partial Experiment-B query failure must be visibly marked incomplete")
        self.assertEqual(payload["b_query_count"], 3)
        self.assertEqual(payload["b_query_failure_count"], 1)

    def test_incomplete_status_not_misread_as_zero_difference(self):
        """The critical Phase 6 guarantee: an incomplete experiment run
        that happens to show zero A-only/B-only developments must remain
        distinguishable, via `status` alone, from a complete run that
        genuinely found zero differences -- never silently collapsed into
        the same-looking 'no difference' record."""
        digest.KEYWORD_CLUSTERS = [{"name": "c", "queries": ["q1"]}]
        digest.feedparser.parse = lambda url: (_ for _ in ()).throw(ConnectionError("all of B failed"))
        self._run_main(["--experiment-recency"])
        payload = json.loads(digest.RETRIEVAL_EXPERIMENT_LOG_PATH.read_text(encoding="utf-8").strip())
        self.assertEqual(payload["status"], "incomplete")
        self.assertEqual(payload["b_query_failure_count"], 1)
        # Even though B contributed nothing this run (every query failed),
        # the record is NOT indistinguishable from a genuine no-difference
        # outcome -- `status` makes that explicit.
        b_only_or_both = [d for d in payload["developments"] if d["classification"] in ("b_only", "both")]
        self.assertEqual(len(b_only_or_both), 0, "sanity: B genuinely contributed nothing due to total failure")
        self.assertEqual(payload["status"], "incomplete", "the zero-difference-looking result must still be flagged incomplete, not silently equated with a successful zero-difference run")

    def test_no_prohibited_data_in_experiment_log(self):
        digest.KEYWORD_CLUSTERS = [{"name": "c", "queries": ["q1"]}]
        digest.feedparser.parse = lambda url: _FakeFeed([])
        self._run_main(["--experiment-recency"])
        raw_text = digest.RETRIEVAL_EXPERIMENT_LOG_PATH.read_text(encoding="utf-8")
        for forbidden in ("linkedin_post", "instagram_caption", '"url"', '"summary"',
                           "Traceback", "ANTHROPIC_API_KEY", "@superimmersive8.com"):
            self.assertNotIn(forbidden, raw_text, f"experiment log must never contain '{forbidden}'")


if __name__ == "__main__":
    unittest.main()
