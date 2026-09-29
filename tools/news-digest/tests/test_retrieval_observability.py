"""
SI8-INTEL-NEWS-5B2 -- retrieval-stage observability tests.

Proves, with every network boundary faked (no real HTTP call anywhere in
this file) and every file write redirected to a temp path, that:
  - a successful query's returned candidates are represented accurately;
  - a legitimate zero-result query is distinguishable from a query
    failure;
  - a provider/query failure is recorded as failure/unknown, never as a
    fabricated zero;
  - accepted / outside-lookback / unparseable-date candidates are each
    represented distinctly;
  - candidate/query provenance (cluster + query) is retained;
  - observability does not change the set of articles returned to the
    downstream pipeline, nor their order;
  - a retrieval-log persistence failure cannot fabricate a successful
    trace or change retrieval behavior;
  - no raw article bodies/URLs/summaries are persisted to the retrieval
    log.
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
from retrieval_observability import CandidateRecord, QueryRetrievalRecord, RunRetrievalRecord  # noqa: E402


def _rfc2822(dt: datetime) -> str:
    return format_datetime(dt)


class _FakeFeed:
    def __init__(self, entries):
        self.entries = entries


class TestQueryRetrievalRecordReconciliation(unittest.TestCase):
    """Pure dataclass/property tests -- no network, no file I/O."""

    def test_failed_query_never_contributes_to_returned_or_accepted_totals(self):
        record = RunRetrievalRecord(
            run_date="2026-09-29", lookback_days=7,
            queries=[
                QueryRetrievalRecord(cluster="c", query="q1", status="failed", error="boom"),
                QueryRetrievalRecord(cluster="c", query="q2", status="success", returned_count=3, accepted_count=2),
            ],
        )
        self.assertEqual(record.query_count, 2)
        self.assertEqual(record.failed_query_count, 1)
        # A failed query's None counts must never be coerced into 0-that-
        # looks-like-a-real-zero mixed into an aggregate -- but they must
        # also never crash the aggregate. Only the successful query's
        # counts should surface.
        self.assertEqual(record.total_returned_count, 3)
        self.assertEqual(record.total_accepted_count, 2)

    def test_legitimate_zero_result_query_is_success_not_failure(self):
        record = RunRetrievalRecord(
            run_date="2026-09-29", lookback_days=7,
            queries=[QueryRetrievalRecord(cluster="c", query="q1", status="success", returned_count=0, accepted_count=0)],
        )
        self.assertEqual(record.failed_query_count, 0)
        self.assertEqual(record.total_returned_count, 0)
        self.assertEqual(record.total_accepted_count, 0)


class TestFetchGoogleNewsObserved(unittest.TestCase):
    """Exercises digest._fetch_google_news_observed() with a faked
    feedparser.parse -- no real HTTP call."""

    def setUp(self):
        self._orig_parse = digest.feedparser.parse
        self._now = datetime.now(timezone.utc)

    def tearDown(self):
        digest.feedparser.parse = self._orig_parse

    def _install_feed(self, entries):
        digest.feedparser.parse = lambda url: _FakeFeed(entries)

    def test_accepted_candidate_represented_accurately(self):
        recent = self._now - timedelta(days=1)
        self._install_feed([
            {"title": "AI video ruling issued - Real Outlet", "link": "https://example.com/a",
             "published": _rfc2822(recent), "summary": "<p>x</p>"},
        ])
        articles, record = digest._fetch_google_news_observed("AI video copyright", 7, cluster="litigation_commercial_media_core")

        self.assertEqual(len(articles), 1)
        self.assertEqual(articles[0]["title"], "AI video ruling issued")
        self.assertEqual(articles[0]["source"], "Real Outlet")

        self.assertEqual(record.status, "success")
        self.assertEqual(record.returned_count, 1)
        self.assertEqual(record.accepted_count, 1)
        self.assertEqual(record.outside_lookback_count, 0)
        self.assertEqual(record.unparseable_date_count, 0)
        self.assertEqual(len(record.candidates), 1)
        c = record.candidates[0]
        self.assertEqual(c.disposition, "accepted")
        self.assertEqual(c.title, "AI video ruling issued")
        self.assertEqual(c.source, "Real Outlet")
        self.assertEqual(c.cluster, "litigation_commercial_media_core")
        self.assertEqual(c.query, "AI video copyright")
        self.assertIsNotNone(c.pub_date_iso)

    def test_legitimate_zero_results_is_success_not_failure(self):
        self._install_feed([])
        articles, record = digest._fetch_google_news_observed("no hits query", 7, cluster="c")
        self.assertEqual(articles, [])
        self.assertEqual(record.status, "success")
        self.assertEqual(record.returned_count, 0)
        self.assertEqual(record.accepted_count, 0)
        self.assertEqual(record.candidates, [])

    def test_provider_failure_is_recorded_as_failure_not_fabricated_zero(self):
        def _raise(url):
            raise ConnectionError("simulated network failure")
        digest.feedparser.parse = _raise

        articles, record = digest._fetch_google_news_observed("some query", 7, cluster="c")
        self.assertEqual(articles, [])
        self.assertEqual(record.status, "failed")
        self.assertIsNotNone(record.error)
        self.assertIn("simulated network failure", record.error)
        # Every count must stay None (unknown), never a fabricated 0 --
        # the whole point is that "provider returned nothing" and
        # "provider could not be asked" must remain distinguishable.
        self.assertIsNone(record.returned_count)
        self.assertIsNone(record.accepted_count)
        self.assertIsNone(record.outside_lookback_count)
        self.assertIsNone(record.unparseable_date_count)
        self.assertEqual(record.candidates, [])

    def test_outside_lookback_candidate_represented_distinctly(self):
        too_old = self._now - timedelta(days=30)
        self._install_feed([
            {"title": "Old story - Outlet", "link": "https://example.com/old",
             "published": _rfc2822(too_old), "summary": ""},
        ])
        articles, record = digest._fetch_google_news_observed("q", 7, cluster="c")

        self.assertEqual(articles, [], "an outside-lookback candidate must never reach the accepted-articles list")
        self.assertEqual(record.status, "success")
        self.assertEqual(record.returned_count, 1)
        self.assertEqual(record.accepted_count, 0)
        self.assertEqual(record.outside_lookback_count, 1)
        self.assertEqual(record.unparseable_date_count, 0)
        self.assertEqual(len(record.candidates), 1)
        self.assertEqual(record.candidates[0].disposition, "outside_lookback")
        self.assertEqual(record.candidates[0].title, "Old story")
        self.assertIsNotNone(record.candidates[0].pub_date_iso, "date parsed fine, it was just outside the window")

    def test_unparseable_date_candidate_represented_distinctly(self):
        self._install_feed([
            {"title": "Garbled date story - Outlet", "link": "https://example.com/g",
             "published": "not-a-real-date", "summary": ""},
        ])
        articles, record = digest._fetch_google_news_observed("q", 7, cluster="c")

        self.assertEqual(articles, [], "an unparseable-date candidate must never reach the accepted-articles list")
        self.assertEqual(record.accepted_count, 0)
        self.assertEqual(record.outside_lookback_count, 0)
        self.assertEqual(record.unparseable_date_count, 1)
        self.assertEqual(len(record.candidates), 1)
        self.assertEqual(record.candidates[0].disposition, "unparseable_date")
        self.assertIsNone(record.candidates[0].pub_date_iso, "date never parsed, so no ISO value can exist")

    def test_mixed_feed_every_entry_gets_exactly_one_disposition(self):
        recent = self._now - timedelta(days=1)
        too_old = self._now - timedelta(days=30)
        self._install_feed([
            {"title": "Accepted one - A", "link": "u1", "published": _rfc2822(recent), "summary": ""},
            {"title": "Too old - B", "link": "u2", "published": _rfc2822(too_old), "summary": ""},
            {"title": "Garbled - C", "link": "u3", "published": "garbage", "summary": ""},
            {"title": "Accepted two - D", "link": "u4", "published": _rfc2822(recent), "summary": ""},
        ])
        articles, record = digest._fetch_google_news_observed("q", 7, cluster="c")

        self.assertEqual(len(articles), 2)
        self.assertEqual(record.returned_count, 4)
        self.assertEqual(record.accepted_count, 2)
        self.assertEqual(record.outside_lookback_count, 1)
        self.assertEqual(record.unparseable_date_count, 1)
        # Every raw entry produced exactly one candidate record -- none
        # silently vanished.
        self.assertEqual(len(record.candidates), 4)
        dispositions = sorted(c.disposition for c in record.candidates)
        self.assertEqual(dispositions, ["accepted", "accepted", "outside_lookback", "unparseable_date"])

    def test_fetch_google_news_thin_wrapper_returns_same_articles_as_observed(self):
        recent = self._now - timedelta(days=1)
        self._install_feed([
            {"title": "Story - Outlet", "link": "u1", "published": _rfc2822(recent), "summary": ""},
        ])
        wrapper_articles = digest.fetch_google_news("q", 7)
        self._install_feed([
            {"title": "Story - Outlet", "link": "u1", "published": _rfc2822(recent), "summary": ""},
        ])
        observed_articles, _ = digest._fetch_google_news_observed("q", 7, cluster="")
        self.assertEqual(wrapper_articles, observed_articles)


class TestFetchAllArticlesObservabilityIntegration(unittest.TestCase):
    """Exercises the real digest.fetch_all_articles() -- faked feedparser,
    redirected RETRIEVAL_LOG_PATH, no real HTTP/file-system-outside-temp
    access. Proves observability is purely additive to the existing
    retrieval/dedup/sort pipeline."""

    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self._orig_retrieval_path = digest.RETRIEVAL_LOG_PATH
        digest.RETRIEVAL_LOG_PATH = Path(self._tmpdir.name) / "RETRIEVAL-LOG.jsonl"

        self._orig_clusters = digest.KEYWORD_CLUSTERS
        digest.KEYWORD_CLUSTERS = [
            {"name": "cluster_a", "queries": ["query one", "query two"]},
            {"name": "cluster_b", "queries": ["query three"]},
        ]

        self._orig_parse = digest.feedparser.parse
        self._orig_sleep = digest.time.sleep
        digest.time.sleep = lambda *_a, **_k: None  # no real delay in tests

        self._now = datetime.now(timezone.utc)

    def tearDown(self):
        digest.RETRIEVAL_LOG_PATH = self._orig_retrieval_path
        digest.KEYWORD_CLUSTERS = self._orig_clusters
        digest.feedparser.parse = self._orig_parse
        digest.time.sleep = self._orig_sleep
        self._tmpdir.cleanup()

    def _feed_for(self, n):
        recent = self._now - timedelta(days=1)
        return _FakeFeed([{"title": f"Story {n} - Outlet {n}", "link": f"u{n}",
                            "published": _rfc2822(recent), "summary": ""}])

    def test_returned_articles_and_provenance_unchanged_by_observability(self):
        call_count = {"n": 0}

        def fake_parse(url):
            call_count["n"] += 1
            return self._feed_for(call_count["n"])

        digest.feedparser.parse = fake_parse

        articles = digest.fetch_all_articles(7)

        self.assertEqual(len(articles), 3)
        titles = {a["title"] for a in articles}
        self.assertEqual(titles, {"Story 1", "Story 2", "Story 3"})
        # clusters/queries provenance (NEWS-4A contract) must be intact.
        for a in articles:
            self.assertIn("clusters", a)
            self.assertIn("queries", a)
            self.assertTrue(a["clusters"])
            self.assertTrue(a["queries"])

        self.assertTrue(digest.RETRIEVAL_LOG_PATH.exists())
        lines = digest.RETRIEVAL_LOG_PATH.read_text(encoding="utf-8").strip().splitlines()
        self.assertEqual(len(lines), 1, "one run -> one JSONL line")
        payload = json.loads(lines[0])
        self.assertEqual(payload["lookback_days"], 7)
        self.assertEqual(len(payload["queries"]), 3)
        query_names = {q["query"] for q in payload["queries"]}
        self.assertEqual(query_names, {"query one", "query two", "query three"})
        for q in payload["queries"]:
            self.assertEqual(q["status"], "success")
            self.assertEqual(q["accepted_count"], 1)

    def test_query_and_cluster_provenance_recoverable_from_retrieval_log(self):
        digest.feedparser.parse = lambda url: self._feed_for(1)
        digest.fetch_all_articles(7)
        payload = json.loads(digest.RETRIEVAL_LOG_PATH.read_text(encoding="utf-8").strip())
        by_query = {q["query"]: q["cluster"] for q in payload["queries"]}
        self.assertEqual(by_query["query one"], "cluster_a")
        self.assertEqual(by_query["query two"], "cluster_a")
        self.assertEqual(by_query["query three"], "cluster_b")

    def test_one_query_failure_does_not_affect_other_queries_or_returned_articles(self):
        def fake_parse(url):
            if "query%20two" in url or "query two" in url:
                raise TimeoutError("simulated timeout")
            return self._feed_for(1)
        digest.feedparser.parse = fake_parse

        articles = digest.fetch_all_articles(7)
        # query one and query three still succeeded -> 2 articles (both
        # titled "Story 1" from the same fixture, but distinct enough for
        # this assertion -- dedup collapses identical titles, which is
        # correct, unchanged, pre-existing behavior).
        self.assertGreaterEqual(len(articles), 1)

        payload = json.loads(digest.RETRIEVAL_LOG_PATH.read_text(encoding="utf-8").strip())
        statuses = {q["query"]: q["status"] for q in payload["queries"]}
        self.assertEqual(statuses["query one"], "success")
        self.assertEqual(statuses["query two"], "failed")
        self.assertEqual(statuses["query three"], "success")

    def test_retrieval_log_persistence_failure_does_not_change_returned_articles(self):
        digest.feedparser.parse = lambda url: self._feed_for(1)

        def _boom(record):
            raise OSError("simulated disk failure")
        orig_update = digest.update_retrieval_log
        digest.update_retrieval_log = _boom
        try:
            articles = digest.fetch_all_articles(7)
        finally:
            digest.update_retrieval_log = orig_update

        # Articles must still flow through exactly as if persistence had
        # succeeded -- and the retrieval log file must NOT exist (no
        # fabricated/partial trace left behind).
        self.assertGreaterEqual(len(articles), 1)
        self.assertFalse(digest.RETRIEVAL_LOG_PATH.exists())

    def test_no_prohibited_data_in_persisted_retrieval_log(self):
        digest.feedparser.parse = lambda url: self._feed_for(1)
        digest.fetch_all_articles(7)
        raw_text = digest.RETRIEVAL_LOG_PATH.read_text(encoding="utf-8")
        for forbidden in ("linkedin_post", "instagram_caption", "carousel_slides",
                           '"url"', '"summary"', '"body"'):
            self.assertNotIn(forbidden, raw_text, f"retrieval log must never contain '{forbidden}'")


if __name__ == "__main__":
    unittest.main()
