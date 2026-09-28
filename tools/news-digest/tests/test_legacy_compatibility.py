"""
SI8-INTEL-NEWS-4A -- Phase 10/11 legacy Production-email compatibility test.

NEWS-4A adds `clusters`/`queries` fields to every article dict
(dedupe_and_merge_provenance) but must not change the shape or behavior of
the existing, live, scheduled email/log rendering path. This test proves
that directly: it builds article dicts through the real, current
provenance-enriched fetch/dedup shape and feeds them through the
UNCHANGED legacy `article_card` / `build_email_html` / `build_log_entry`
functions, confirming they render exactly as before (no KeyError, no
missing content, scores/actions/titles/sources present) -- the legacy
renderer simply ignores the new `clusters`/`queries` keys it doesn't read.

No network call; no real ANTHROPIC_API_KEY/RESEND_API_KEY needed beyond
the dummy values required for digest.py to import at all (pre-existing
behavior, unrelated to this milestone).
"""

import os
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("RESEND_API_KEY", "test-key")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import digest  # noqa: E402


def _scored_article():
    return {
        "title": "Some Legacy-Shaped Article Title",
        "url": "https://example.com/legacy",
        "source": "Some Outlet",
        "published": "Mon, 28 Sep 2026 00:00:00 GMT",
        "pub_date": datetime(2026, 9, 28, tzinfo=timezone.utc),
        "summary": "A short summary.",
        # NEWS-4A additions -- the legacy renderer must simply ignore these.
        "clusters": {"regulation_policy_commercial_media"},
        "queries": {"some query"},
        # legacy score_batch-shaped fields
        "relevance_score": 8,
        "relevance_reason": "Directly relevant to SI8's positioning.",
        "action": "post_and_update",
        "doc_to_update": "COMPETITIVE_ANALYSIS_CAAS_2026.md",
        "linkedin_post": "Some LinkedIn copy.",
        "linkedin_hashtags": "#AIVideo #ChainOfTitle",
        "instagram_caption": "Some IG copy.",
        "carousel_slides": [{"slide": 1, "type": "hook", "text": "Hook"}],
    }


class TestLegacyEmailAndLogRenderingUnaffected(unittest.TestCase):
    def test_article_card_renders_with_provenance_fields_present(self):
        html = digest.article_card(_scored_article())
        self.assertIn("Some Legacy-Shaped Article Title", html)
        self.assertIn("8/10", html)
        self.assertIn("Some LinkedIn copy.", html)

    def test_build_email_html_renders_end_to_end(self):
        html = digest.build_email_html([_scored_article()], "September 28, 2026", 7)
        self.assertIn("SuperImmersive 8", html)
        self.assertIn("Some Legacy-Shaped Article Title", html)
        self.assertIn("HIGH RELEVANCE", html)

    def test_build_log_entry_renders_end_to_end(self):
        entry = digest.build_log_entry([_scored_article()], "September 28, 2026", 7, "2026-09-28")
        self.assertIn("Some Legacy-Shaped Article Title", entry)
        self.assertIn("post+update", entry)

    def test_dedupe_and_merge_provenance_output_is_legacy_renderer_compatible(self):
        """End-to-end: the real NEWS-4A dedupe/provenance function feeds
        the real legacy renderer without any adaptation layer."""
        raw = [_scored_article()]
        del raw[0]["relevance_score"]  # simulate pre-scoring shape (as it exists right after fetch)
        for k in ("relevance_reason", "action", "doc_to_update", "linkedin_post",
                  "linkedin_hashtags", "instagram_caption", "carousel_slides"):
            del raw[0][k]
        deduped = digest.dedupe_and_merge_provenance(raw)
        self.assertEqual(len(deduped), 1)
        # Now simulate scoring having populated the legacy fields, and confirm
        # the legacy renderer still works on the provenance-enriched dict.
        deduped[0].update({
            "relevance_score": 5, "relevance_reason": "context", "action": "monitor",
            "doc_to_update": None, "linkedin_post": None, "linkedin_hashtags": None,
            "instagram_caption": None, "carousel_slides": None,
        })
        html = digest.build_email_html(deduped, "September 28, 2026", 7)
        self.assertIn("Some Legacy-Shaped Article Title", html)


if __name__ == "__main__":
    unittest.main()
