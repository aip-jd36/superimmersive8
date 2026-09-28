"""
SI8-INTEL-NEWS-4A -- Phase 3/4 development-grouping tests.

The fixture below reproduces the STRUCTURE of the real 2026-09-28
Production run (02_Marketing/intelligence/DIGEST-LOG.md, "Week of
September 28, 2026"): 4 differently-titled/sourced articles about the
California SB 1050 synthetic-performer disclosure law, 2 differently-
titled/sourced articles about the Japanese voice-actor/TikTok lawsuit, and
2 genuinely unrelated developments (an insurer product launch, an EU AI Act
compliance explainer) that must never be merged into either group. Titles
are the real, short, factual headlines already stored (and linked to) in
DIGEST-LOG.md -- no article body text is reproduced.

No network call is made anywhere in this file. The Anthropic client
boundary is a hand-written FakeClient with deterministic, injectable
responses.
"""

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from development import (  # noqa: E402
    build_developments,
    candidate_buckets,
    group_bucket_via_model,
    validate_partition,
)


def _article(title, source, clusters=("litigation_commercial_media_core",), queries=("q",), when=None):
    return {
        "title": title,
        "url": f"https://example.com/{abs(hash((title, source)))}",
        "source": source,
        "published": "Mon, 28 Sep 2026 00:00:00 GMT",
        "pub_date": when or datetime(2026, 9, 28, tzinfo=timezone.utc),
        "summary": "",
        "clusters": set(clusters),
        "queries": set(queries),
    }


# The 2026-09-28-style fixture, in Production order.
CA_SB1050_TITLES = [
    ("California Enacts SB 1050, Requiring AI 'Synthetic Performers' Disclosures in Advertising", "The National Law Review"),
    ("California Requires Disclosure of AI-Generated People in Advertising", "Foley Hoag"),
    ("Roll the Disclosures: California Enacts Synthetic Performer Disclosure Law", "JD Supra"),
    ("Governor Newsom Signs California Bill Requiring Disclosures of AI-generated Advertisements", "The National Law Review"),
]
JAPAN_VOICE_TITLES = [
    ("Japanese Voice Actor Sues TikTok Over AI Voice Cloning", "Digital Music News"),
    ("Japanese voice actor sues TikTok over alleged AI clone of his voice", "Türkiye Today"),
]
DISTINCT_TITLES = [
    ("CFC launches affirmative AI cover for intellectual property risks", "Insurance Times"),
    ("EU AI Act Transparency rules now apply: What businesses need to know", "Freeths"),
]


def _fixture_articles():
    articles = []
    for title, source in CA_SB1050_TITLES:
        articles.append(_article(title, source, clusters=("regulation_policy_commercial_media",), queries=("q1",)))
    for title, source in JAPAN_VOICE_TITLES:
        articles.append(_article(title, source, clusters=("litigation_commercial_media_core",), queries=("q2",)))
    for title, source in DISTINCT_TITLES:
        articles.append(_article(title, source, clusters=("buyer_risk_governance_signals",), queries=("q3",)))
    return articles


class _FakeResponse:
    def __init__(self, text: str):
        self.content = [type("C", (), {"text": text})()]


class FakeClient:
    """Deterministic fake matching the duck-typed Anthropic client contract
    (`.messages.create(...) -> response.content[0].text`). `script` maps a
    frozenset of the bucket's article titles to the raw text the "model"
    should return for that exact bucket -- so behavior is fully
    predictable per call, not order-dependent guessing."""

    def __init__(self, script: dict):
        self.script = script
        self.calls = 0
        self.messages = self  # allow client.messages.create(...)

    def create(self, *, model, max_tokens, messages):
        self.calls += 1
        prompt = messages[0]["content"]
        for key, text in self.script.items():
            if key in prompt:
                return _FakeResponse(text)
        raise AssertionError(f"FakeClient received an unscripted prompt: {prompt[:200]}...")


class TestCandidateBuckets(unittest.TestCase):
    def test_fixture_buckets_correctly_with_no_model_call(self):
        """The deterministic pre-filter alone must already separate the
        two genuinely distinct single-article developments from both
        multi-article groups, and must connect each multi-article group's
        differently-worded headlines into one candidate bucket."""
        articles = _fixture_articles()
        buckets = candidate_buckets(articles)
        sizes = sorted(len(b) for b in buckets)
        self.assertEqual(sizes, [1, 1, 2, 4])

    def test_unrelated_titles_never_share_a_bucket(self):
        articles = _fixture_articles()
        buckets = candidate_buckets(articles)
        ca_bucket = next(b for b in buckets if len(b) == 4)
        insurance_index = next(i for i, a in enumerate(articles) if "CFC" in a["title"])
        eu_index = next(i for i, a in enumerate(articles) if "EU AI Act" in a["title"])
        self.assertNotIn(insurance_index, ca_bucket)
        self.assertNotIn(eu_index, ca_bucket)


class TestBuildDevelopmentsAcceptance(unittest.TestCase):
    """The core NEWS-4A acceptance invariant: 4 articles -> 1 Development,
    2 articles -> 1 Development, distinct developments stay separate."""

    def setUp(self):
        self.articles = _fixture_articles()
        ca_titles = frozenset(t for t, _ in CA_SB1050_TITLES)
        jp_titles = frozenset(t for t, _ in JAPAN_VOICE_TITLES)
        self.client = FakeClient(script={
            # A well-behaved model fully merges each real same-event bucket.
            **{t: "[[0, 1, 2, 3]]" for t in [next(iter(ca_titles))]},
            **{t: "[[0, 1]]" for t in [next(iter(jp_titles))]},
        })

    def test_four_articles_group_into_one_development(self):
        developments = build_developments(self.articles, client=self.client)
        ca_dev = next(d for d in developments if d.source_count == 4)
        self.assertEqual(len(ca_dev.articles), 4)
        # Real Production evidence: 2 of the 4 CA SB 1050 articles are both
        # from "The National Law Review" -- sources is DISTINCT publisher
        # names (3), while articles (the real preservation guarantee) is 4.
        self.assertEqual(len(ca_dev.sources), 3)

    def test_two_articles_group_into_one_development(self):
        developments = build_developments(self.articles, client=self.client)
        jp_dev = next(d for d in developments if d.source_count == 2)
        self.assertEqual(len(jp_dev.articles), 2)
        self.assertEqual(len(jp_dev.sources), 2)

    def test_distinct_developments_remain_separate(self):
        developments = build_developments(self.articles, client=self.client)
        self.assertEqual(len(developments), 4, "expected exactly 4 Developments: CA group, JP group, insurer, EU")
        singleton_titles = {d.canonical_title for d in developments if d.source_count == 1}
        self.assertIn(DISTINCT_TITLES[0][0], singleton_titles)
        self.assertIn(DISTINCT_TITLES[1][0], singleton_titles)

    def test_no_source_lost_across_all_developments(self):
        developments = build_developments(self.articles, client=self.client)
        total_articles_out = sum(d.source_count for d in developments)
        self.assertEqual(total_articles_out, len(self.articles))

    def test_canonical_title_traces_to_a_real_article(self):
        """The canonical title is never a model invention -- it must be
        exactly one of the group's real article titles."""
        developments = build_developments(self.articles, client=self.client)
        ca_dev = next(d for d in developments if d.source_count == 4)
        real_titles = {a["title"] for a in ca_dev.articles}
        self.assertIn(ca_dev.canonical_title, real_titles)

    def test_provenance_union_across_grouped_articles(self):
        developments = build_developments(self.articles, client=self.client)
        ca_dev = next(d for d in developments if d.source_count == 4)
        self.assertEqual(ca_dev.clusters, {"regulation_policy_commercial_media"})
        self.assertEqual(ca_dev.queries, {"q1"})


class TestGroupingSafety(unittest.TestCase):
    def test_ambiguous_model_response_biases_toward_separation(self):
        """If the model itself reports it isn't confident (emits a fully
        split partition), the result must be fully split -- grouping must
        never force a merge the model didn't actually assert."""
        articles = [_article(t, s) for t, s in CA_SB1050_TITLES]
        client = FakeClient(script={CA_SB1050_TITLES[0][0]: "[[0], [1], [2], [3]]"})
        developments = build_developments(articles, client=client)
        self.assertEqual(len(developments), 4)

    def test_malformed_json_fails_safe_to_one_per_development(self):
        articles = [_article(t, s) for t, s in CA_SB1050_TITLES]
        client = FakeClient(script={CA_SB1050_TITLES[0][0]: "not valid json at all"})
        developments = build_developments(articles, client=client)
        self.assertEqual(len(developments), 4)
        self.assertEqual(sum(d.source_count for d in developments), 4)

    def test_out_of_range_index_fails_safe(self):
        articles = [_article(t, s) for t, s in CA_SB1050_TITLES]
        client = FakeClient(script={CA_SB1050_TITLES[0][0]: "[[0, 1, 2, 99]]"})
        developments = build_developments(articles, client=client)
        self.assertEqual(sum(d.source_count for d in developments), 4)

    def test_duplicate_index_assignment_fails_safe(self):
        articles = [_article(t, s) for t, s in CA_SB1050_TITLES]
        client = FakeClient(script={CA_SB1050_TITLES[0][0]: "[[0, 1], [1, 2, 3]]"})
        developments = build_developments(articles, client=client)
        self.assertEqual(sum(d.source_count for d in developments), 4)

    def test_missing_index_fails_safe(self):
        """Partition covers only 3 of 4 indices -- invalid, must fail safe."""
        articles = [_article(t, s) for t, s in CA_SB1050_TITLES]
        client = FakeClient(script={CA_SB1050_TITLES[0][0]: "[[0, 1, 2]]"})
        developments = build_developments(articles, client=client)
        self.assertEqual(sum(d.source_count for d in developments), 4)

    def test_no_article_disappears_on_repeated_grouping_failure(self):
        """Even when EVERY bucket's model call fails (simulated outage),
        every input article must still appear in exactly one
        Development -- grouping failure must never lose an article."""
        articles = _fixture_articles()

        class AlwaysFailingClient:
            def __init__(self):
                self.messages = self

            def create(self, **kwargs):
                raise RuntimeError("simulated model outage")

        developments = build_developments(articles, client=AlwaysFailingClient())
        self.assertEqual(sum(d.source_count for d in developments), len(articles))
        all_titles_out = {a["title"] for d in developments for a in d.articles}
        all_titles_in = {a["title"] for a in articles}
        self.assertEqual(all_titles_out, all_titles_in)

    def test_no_client_provided_yields_one_development_per_article(self):
        articles = _fixture_articles()
        developments = build_developments(articles, client=None)
        self.assertEqual(len(developments), len(articles))


class TestGroupBucketViaModel(unittest.TestCase):
    """Direct tests of the isolated model-invocation boundary, independent
    of the candidate-bucketing/build_developments orchestration above."""

    def test_single_article_bucket_never_calls_the_model(self):
        client = FakeClient(script={})
        result = group_bucket_via_model([_article("Solo headline", "Outlet")], client=client, model="m")
        self.assertEqual(result, [[0]])
        self.assertEqual(client.calls, 0)

    def test_well_formed_response_returned_verbatim(self):
        client = FakeClient(script={"Alpha": "[[0, 1]]"})
        articles = [_article("Alpha headline one", "A"), _article("Alpha headline two", "B")]
        result = group_bucket_via_model(articles, client=client, model="m")
        self.assertEqual(result, [[0, 1]])
        self.assertEqual(client.calls, 1)

    def test_response_wrapped_in_markdown_fence_is_parsed(self):
        client = FakeClient(script={"Alpha": "```json\n[[0, 1]]\n```"})
        articles = [_article("Alpha headline one", "A"), _article("Alpha headline two", "B")]
        result = group_bucket_via_model(articles, client=client, model="m")
        self.assertEqual(result, [[0, 1]])


class TestValidatePartition(unittest.TestCase):
    def test_valid_partition_accepted(self):
        self.assertEqual(validate_partition([[0, 2], [1]], 3), [[0, 2], [1]])

    def test_non_list_rejected(self):
        self.assertIsNone(validate_partition({"0": [1]}, 3))

    def test_empty_list_rejected(self):
        self.assertIsNone(validate_partition([], 3))

    def test_boolean_index_rejected(self):
        # bool is a subclass of int in Python -- must be explicitly excluded
        self.assertIsNone(validate_partition([[True, False], [2]], 3))

    def test_float_index_rejected(self):
        self.assertIsNone(validate_partition([[0.0, 1], [2]], 3))


if __name__ == "__main__":
    unittest.main()
