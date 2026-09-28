"""
SI8-INTEL-NEWS-4B -- authoritative Development priority tests.

No network call anywhere in this file; the Anthropic client boundary is a
hand-written deterministic fake.
"""

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from development import Development  # noqa: E402
from interpretation import BoundedInterpretation  # noqa: E402
from prioritization import (  # noqa: E402
    PRIORITY_TIERS,
    classify_priority_batch,
    prioritize_developments,
    validate_priority_batch,
)


def _development(dev_id, title="Some development", clusters=("cluster_x",), n_sources=1):
    articles = [
        {
            "title": title, "url": f"https://example.com/{dev_id}-{i}", "source": f"Outlet{i}",
            "published": "Mon, 28 Sep 2026 00:00:00 GMT",
            "pub_date": datetime(2026, 9, 28, tzinfo=timezone.utc), "summary": "",
            "relevance_score": 8, "clusters": set(clusters), "queries": {"q"},
        }
        for i in range(n_sources)
    ]
    return Development(id=dev_id, canonical_title=title, articles=articles, clusters=set(clusters), queries={"q"})


def _interp(dev_id, action="monitor"):
    return BoundedInterpretation(
        development_id=dev_id,
        source_facts=f"Source facts for {dev_id}.",
        si8_relevance=f"SI8 relevance for {dev_id}.",
        uncertainty_watch=f"Uncertainty for {dev_id}.",
        action=action,
    )


class _FakeResponse:
    def __init__(self, text: str):
        self.content = [type("C", (), {"text": text})()]


class FakeClient:
    """Deterministic fake. `script` maps a substring expected in the
    prompt to the raw text the "model" should return."""

    def __init__(self, script: dict):
        self.script = script
        self.calls = 0
        self.prompts_seen: list[str] = []
        self.messages = self

    def create(self, *, model, max_tokens, messages):
        self.calls += 1
        prompt = messages[0]["content"]
        self.prompts_seen.append(prompt)
        for key, text in self.script.items():
            if key in prompt:
                return _FakeResponse(text)
        raise AssertionError(f"FakeClient received an unscripted prompt: {prompt[:200]}...")


class TestPriorityOperatesOnBoundedInputsOnly(unittest.TestCase):
    def test_raw_article_body_not_present_in_prompt(self):
        d = _development("d1")
        d.articles[0]["summary"] = "RAW_ARTICLE_BODY_MARKER_SHOULD_NEVER_APPEAR"
        interp = _interp("d1")
        client = FakeClient(script={"Some development": '[{"development_id":"d1","priority_tier":"MONITOR","priority_rationale":"ok"}]'})
        classify_priority_batch([(d, interp)], client=client, model="m")
        self.assertNotIn("RAW_ARTICLE_BODY_MARKER_SHOULD_NEVER_APPEAR", client.prompts_seen[0])

    def test_article_relevance_score_not_present_in_prompt(self):
        d = _development("d1")
        interp = _interp("d1")
        client = FakeClient(script={"Some development": '[{"development_id":"d1","priority_tier":"MONITOR","priority_rationale":"ok"}]'})
        classify_priority_batch([(d, interp)], client=client, model="m")
        # "relevance_score" as a labeled field/word must not appear -- the
        # numeric article score is not part of this call's semantic surface.
        self.assertNotIn("relevance_score", client.prompts_seen[0])

    def test_cluster_identity_not_present_in_prompt(self):
        d = _development("d1", clusters=("litigation_commercial_media_core",))
        interp = _interp("d1")
        client = FakeClient(script={"Some development": '[{"development_id":"d1","priority_tier":"MONITOR","priority_rationale":"ok"}]'})
        classify_priority_batch([(d, interp)], client=client, model="m")
        self.assertNotIn("litigation_commercial_media_core", client.prompts_seen[0])
        self.assertNotIn("cluster", client.prompts_seen[0].lower())

    def test_bounded_interpretation_fields_are_present(self):
        d = _development("d1")
        interp = _interp("d1")
        client = FakeClient(script={"Some development": '[{"development_id":"d1","priority_tier":"MONITOR","priority_rationale":"ok"}]'})
        classify_priority_batch([(d, interp)], client=client, model="m")
        prompt = client.prompts_seen[0]
        self.assertIn("Source facts for d1", prompt)
        self.assertIn("SI8 relevance for d1", prompt)
        self.assertIn("Uncertainty for d1", prompt)


class TestCorroborationConstrainsConfidenceNotMateriality(unittest.TestCase):
    def test_corroboration_count_labeled_but_prompt_forbids_using_it_to_inflate(self):
        d = _development("d1", n_sources=4)
        interp = _interp("d1")
        client = FakeClient(script={"Some development": '[{"development_id":"d1","priority_tier":"MONITOR","priority_rationale":"ok"}]'})
        classify_priority_batch([(d, interp)], client=client, model="m")
        prompt = client.prompts_seen[0]
        self.assertIn("4 independent source(s)", prompt)
        # The explicit anti-inflation instruction must be present in the prompt.
        self.assertIn("not evidence it matters more", prompt)


class TestValidatePriorityBatch(unittest.TestCase):
    def test_valid_batch_accepted(self):
        raw = [{"development_id": "d1", "priority_tier": "HIGH", "priority_rationale": "grounded reason"}]
        result = validate_priority_batch(raw, {"d1"})
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].tier, "HIGH")

    def test_unknown_id_rejected(self):
        raw = [{"development_id": "unknown", "priority_tier": "HIGH", "priority_rationale": "x"}]
        self.assertIsNone(validate_priority_batch(raw, {"d1"}))

    def test_invalid_tier_rejected(self):
        raw = [{"development_id": "d1", "priority_tier": "CRITICAL", "priority_rationale": "x"}]
        self.assertIsNone(validate_priority_batch(raw, {"d1"}))

    def test_duplicate_id_rejected(self):
        raw = [
            {"development_id": "d1", "priority_tier": "HIGH", "priority_rationale": "x"},
            {"development_id": "d1", "priority_tier": "MONITOR", "priority_rationale": "y"},
        ]
        self.assertIsNone(validate_priority_batch(raw, {"d1"}))

    def test_missing_id_rejected(self):
        raw = [{"development_id": "d1", "priority_tier": "HIGH", "priority_rationale": "x"}]
        self.assertIsNone(validate_priority_batch(raw, {"d1", "d2"}))

    def test_empty_rationale_rejected(self):
        raw = [{"development_id": "d1", "priority_tier": "HIGH", "priority_rationale": "   "}]
        self.assertIsNone(validate_priority_batch(raw, {"d1"}))


class TestPriorityFailureNeverFabricatesHigh(unittest.TestCase):
    def test_malformed_json_falls_back_to_monitor(self):
        d = _development("d1")
        client = FakeClient(script={"Some development": "not json"})
        result = classify_priority_batch([(d, _interp("d1"))], client=client, model="m")
        self.assertEqual(result[0].tier, "MONITOR")
        self.assertTrue(result[0].degraded)

    def test_model_exception_falls_back_to_monitor(self):
        class AlwaysFailingClient:
            def __init__(self):
                self.messages = self

            def create(self, **kwargs):
                raise RuntimeError("simulated outage")

        d = _development("d1")
        result = classify_priority_batch([(d, _interp("d1"))], client=AlwaysFailingClient(), model="m")
        self.assertEqual(result[0].tier, "MONITOR")
        self.assertTrue(result[0].degraded)

    def test_unknown_id_in_response_falls_back_to_monitor_for_whole_batch(self):
        d1, d2 = _development("d1"), _development("d2")
        client = FakeClient(script={"Some development": '[{"development_id":"d1","priority_tier":"HIGH","priority_rationale":"x"},{"development_id":"unknown","priority_tier":"HIGH","priority_rationale":"y"}]'})
        result = classify_priority_batch([(d1, _interp("d1")), (d2, _interp("d2"))], client=client, model="m")
        self.assertTrue(all(r.tier == "MONITOR" and r.degraded for r in result))

    def test_no_client_falls_back_to_monitor(self):
        d = _development("d1")
        result = classify_priority_batch([(d, _interp("d1"))], client=None, model="m")
        self.assertEqual(result[0].tier, "MONITOR")
        self.assertTrue(result[0].degraded)

    def test_fallback_never_produces_omit(self):
        """OMIT would silently drop a Development from the digest entirely
        -- a failed judgment must never masquerade as 'not material'."""
        d = _development("d1")
        client = FakeClient(script={"Some development": "garbage"})
        result = classify_priority_batch([(d, _interp("d1"))], client=client, model="m")
        self.assertNotEqual(result[0].tier, "OMIT")


class TestHighMonitorOmitAreDeterministicOutcomes(unittest.TestCase):
    def test_valid_output_of_each_tier_is_respected_verbatim(self):
        devs = [_development(f"d{i}") for i in range(3)]
        interps = [_interp(d.id) for d in devs]
        raw = (
            '[{"development_id":"d0","priority_tier":"HIGH","priority_rationale":"a"},'
            '{"development_id":"d1","priority_tier":"MONITOR","priority_rationale":"b"},'
            '{"development_id":"d2","priority_tier":"OMIT","priority_rationale":"c"}]'
        )
        client = FakeClient(script={"Some development": raw})
        result = classify_priority_batch(list(zip(devs, interps)), client=client, model="m")
        tiers = {r.development_id: r.tier for r in result}
        self.assertEqual(tiers, {"d0": "HIGH", "d1": "MONITOR", "d2": "OMIT"})
        self.assertTrue(all(t in PRIORITY_TIERS for t in tiers.values()))


class TestDeferredDistinctFromOmit(unittest.TestCase):
    def test_prioritize_developments_only_ever_sees_what_it_is_given(self):
        """A Development never admitted by triage is never passed to
        prioritize_developments at all -- DEFERRED Developments have no
        DevelopmentPriority object whatsoever, distinct from an OMIT
        Development (which DOES have one)."""
        admitted_dev = _development("d1")
        client = FakeClient(script={"Some development": '[{"development_id":"d1","priority_tier":"OMIT","priority_rationale":"x"}]'})
        result = prioritize_developments([(admitted_dev, _interp("d1"))], client=client, model="m")
        self.assertEqual(len(result), 1)  # only the admitted one was ever considered
        self.assertEqual(result[0].tier, "OMIT")


class TestBatching(unittest.TestCase):
    def test_batches_split_per_batch_size(self):
        devs = [_development(f"d{i}") for i in range(10)]
        interps = [_interp(d.id) for d in devs]

        class CountingClient:
            def __init__(self):
                self.calls = 0
                self.messages = self

            def create(self, *, model, max_tokens, messages):
                self.calls += 1
                prompt = messages[0]["content"]
                ids_in_prompt = [d.id for d in devs if f"id: {d.id}" in prompt]
                items = ",".join(
                    f'{{"development_id":"{i}","priority_tier":"MONITOR","priority_rationale":"ok"}}' for i in ids_in_prompt
                )
                return _FakeResponse(f"[{items}]")

        client = CountingClient()
        result = prioritize_developments(list(zip(devs, interps)), client=client, model="m", batch_size=4)
        self.assertEqual(len(result), 10)
        self.assertEqual(client.calls, 3)  # ceil(10/4) = 3 batches


if __name__ == "__main__":
    unittest.main()
