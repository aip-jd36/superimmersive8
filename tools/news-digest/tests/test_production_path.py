"""
SI8-INTEL-NEWS-4B -- production call-graph tests.

Proves, by direct source inspection of digest.main() plus a full in-process
end-to-end run with every network/model/file boundary faked or redirected,
that the live pipeline is Development-centric and that automatic social
generation is absent from it. No real network call, no real file write
outside a temp directory, anywhere in this file.
"""

import inspect
import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("RESEND_API_KEY", "test-key")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import digest  # noqa: E402


class TestMainCallGraphIsDevelopmentCentric(unittest.TestCase):
    """Static evidence: inspect main()'s actual source rather than assume
    behavior from names."""

    def setUp(self):
        self.source = inspect.getsource(digest.main)

    def test_main_calls_every_new_pipeline_stage(self):
        for call in (
            "fetch_all_articles(",
            "score_articles(",
            "build_developments(",
            "triage_developments(",
            "interpret_development(",
            "prioritize_developments(",
            "build_intelligence_digest(",
            "build_intelligence_email_html(",
            "send_email(",
            "update_development_digest_log(",
        ):
            with self.subTest(call=call):
                self.assertIn(call, self.source, f"main() does not call {call} -- pipeline stage missing from the live path")

    def test_main_does_not_call_legacy_article_centric_renderer(self):
        for call in ("build_email_html(", "article_card(", "update_digest_log("):
            with self.subTest(call=call):
                self.assertNotIn(call, self.source, f"main() still calls legacy {call} -- it must no longer be authoritative")

    def test_main_never_references_social_content_fields(self):
        for field in ("linkedin_post", "instagram_caption", "carousel_slides", "linkedin_hashtags"):
            with self.subTest(field=field):
                self.assertNotIn(field, self.source)

    def test_score_prompt_no_longer_requests_social_content(self):
        for field in ("linkedin_post", "instagram_caption", "carousel_slides", "doc_to_update"):
            with self.subTest(field=field):
                self.assertNotIn(field, digest.SCORE_PROMPT)


class TestEndToEndMainRun(unittest.TestCase):
    """Full in-process run of main() with every network/model boundary
    faked and DIGEST_LOG_PATH redirected to a temp file -- proves the
    stages actually wire together, not just that they're referenced."""

    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self._orig_log_path = digest.DIGEST_LOG_PATH
        digest.DIGEST_LOG_PATH = Path(self._tmpdir.name) / "DIGEST-LOG.md"
        self._orig_audit_path = digest.AUDIT_LOG_PATH
        digest.AUDIT_LOG_PATH = Path(self._tmpdir.name) / "DIGEST-AUDIT.md"

        self._orig_client = digest.client
        digest.client = self._FakeAnthropicClient()

        self._orig_fetch = digest.fetch_all_articles
        digest.fetch_all_articles = self._fake_fetch_all_articles

        self._orig_send_email = digest.send_email
        self.sent_html = {}

        def _fake_send_email(html, week_str, dry_run=False):
            self.sent_html["html"] = html
            return True

        digest.send_email = _fake_send_email

    def tearDown(self):
        digest.DIGEST_LOG_PATH = self._orig_log_path
        digest.AUDIT_LOG_PATH = self._orig_audit_path
        digest.client = self._orig_client
        digest.fetch_all_articles = self._orig_fetch
        digest.send_email = self._orig_send_email
        self._tmpdir.cleanup()

    @staticmethod
    def _fake_fetch_all_articles(lookback_days):
        return [{
            "title": "Regulator issues new AI advertising disclosure guidance",
            "url": "https://example.com/a1",
            "source": "Some Outlet",
            "published": "Mon, 28 Sep 2026 00:00:00 GMT",
            "pub_date": datetime(2026, 9, 28, tzinfo=timezone.utc),
            "summary": "A regulator issued draft guidance.",
            "clusters": {"regulation_policy_commercial_media"},
            "queries": {"q"},
        }]

    class _FakeAnthropicClient:
        """Answers every call type this run needs: coarse scoring,
        (no grouping call needed for 1 article), interpretation, priority,
        and an empty executive summary."""

        def __init__(self):
            self.messages = self
            self.calls = 0

        def create(self, *, model, max_tokens, messages):
            self.calls += 1
            prompt = messages[0]["content"]
            if "relevance_score" in prompt and "source_facts" not in prompt:
                # coarse triage scoring (digest.py's own SCORE_PROMPT)
                return self._resp('[{"relevance_score": 8, "relevance_reason": "in-domain"}]')
            if "source_facts" in prompt and "action" in prompt and "priority_tier" not in prompt and "MAY SYNTHESIZE" not in prompt:
                # interpretation.py's INTERPRETATION_PROMPT
                return self._resp(
                    '{"source_facts": "A regulator issued draft guidance.", '
                    '"si8_relevance": "May inform SI8 positioning.", '
                    '"uncertainty_watch": "Draft, not yet finalized.", '
                    '"action": "monitor", "action_rationale": "worth tracking"}'
                )
            if "priority_tier" in prompt:
                # prioritization.py's PRIORITY_PROMPT -- extract the id crudely
                import re
                dev_id = re.search(r"id: ([0-9a-f-]+)", prompt).group(1)
                return self._resp(f'[{{"development_id": "{dev_id}", "priority_tier": "MONITOR", "priority_rationale": "grounded"}}]')
            if "MAY SYNTHESIZE" in prompt:
                return self._resp('{"statements": []}')
            raise AssertionError(f"Unscripted prompt: {prompt[:200]}")

        @staticmethod
        def _resp(text):
            return type("R", (), {"content": [type("C", (), {"text": text})()]})()

    def test_full_run_completes_and_produces_a_development_shaped_log(self):
        old_argv = sys.argv
        sys.argv = ["digest.py", "--dry-run", "--lookback", "7"]
        try:
            digest.main()
        finally:
            sys.argv = old_argv

        self.assertTrue(digest.DIGEST_LOG_PATH.exists())
        log_text = digest.DIGEST_LOG_PATH.read_text(encoding="utf-8")
        self.assertIn("Digest Development Log", log_text)
        self.assertIn("Regulator issues new AI advertising disclosure guidance", log_text)
        # No social content field name should ever appear in the log.
        for field in ("linkedin_post", "instagram_caption", "carousel_slides"):
            self.assertNotIn(field, log_text)

        self.assertIn("html", self.sent_html)
        html = self.sent_html["html"]
        self.assertIn("News Intelligence", html)
        for field in ("linkedin_post", "instagram_caption", "carousel_slides", "Paste into Canva"):
            self.assertNotIn(field, html)

        # SI8-INTEL-NEWS-4C: the audit log is written alongside, to its own
        # redirected path (never the real project directory in a test).
        self.assertTrue(digest.AUDIT_LOG_PATH.exists())
        audit_text = digest.AUDIT_LOG_PATH.read_text(encoding="utf-8")
        self.assertIn("Run Audit Log", audit_text)
        self.assertIn("Regulator issues new AI advertising disclosure guidance", audit_text)
        for field in ("linkedin_post", "instagram_caption", "carousel_slides"):
            self.assertNotIn(field, audit_text)


if __name__ == "__main__":
    unittest.main()
