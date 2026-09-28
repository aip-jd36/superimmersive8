"""
SI8-INTEL-NEWS-4A -- Phase 5/6 bounded-interpretation tests.

No network call anywhere in this file; the Anthropic client boundary is a
hand-written deterministic fake.
"""

import dataclasses
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from development import Development  # noqa: E402
from interpretation import (  # noqa: E402
    ACTION_VALUES,
    BoundedInterpretation,
    interpret_development,
    validate_interpretation,
)


def _development(articles=None):
    articles = articles or [{
        "title": "A Regulator Issued New Guidance",
        "url": "https://example.com/1",
        "source": "Some Outlet",
        "published": "Mon, 28 Sep 2026 00:00:00 GMT",
        "pub_date": datetime(2026, 9, 28, tzinfo=timezone.utc),
        "summary": "A regulator issued guidance on AI advertising disclosures.",
        "clusters": {"regulation_policy_commercial_media"},
        "queries": {"q"},
    }]
    return Development(
        id="dev-1",
        canonical_title=articles[0]["title"],
        articles=articles,
        clusters={"regulation_policy_commercial_media"},
        queries={"q"},
    )


class _FakeResponse:
    def __init__(self, text: str):
        self.content = [type("C", (), {"text": text})()]


class FakeClient:
    def __init__(self, text: str):
        self.text = text
        self.calls = 0
        self.messages = self

    def create(self, *, model, max_tokens, messages):
        self.calls += 1
        return _FakeResponse(self.text)


VALID_JSON = """{
  "source_facts": "A state regulator issued draft guidance regarding AI-generated content disclosures in advertising.",
  "si8_relevance": "This may be relevant to SI8's regulatory-tracking positioning, though it is not yet a binding requirement.",
  "uncertainty_watch": "The guidance is a draft, not yet finalized or enforced; scope and effective date remain unresolved.",
  "action": "monitor",
  "action_rationale": "Draft guidance worth tracking but not yet actionable."
}"""


class TestBoundedInterpretationSchema(unittest.TestCase):
    def test_no_client_yields_conservative_fallback(self):
        result = interpret_development(_development(), client=None)
        self.assertEqual(result.action, "monitor")
        self.assertIn("interpretation", result.source_facts.lower())

    def test_well_formed_response_is_parsed_into_four_fields(self):
        client = FakeClient(VALID_JSON)
        result = interpret_development(_development(), client=client)
        self.assertIsInstance(result, BoundedInterpretation)
        self.assertTrue(result.source_facts)
        self.assertTrue(result.si8_relevance)
        self.assertTrue(result.uncertainty_watch)
        self.assertIn(result.action, ACTION_VALUES)

    def test_markdown_fenced_response_is_parsed(self):
        client = FakeClient(f"```json\n{VALID_JSON}\n```")
        result = interpret_development(_development(), client=client)
        self.assertEqual(result.action, "monitor")

    def test_malformed_json_fails_safe(self):
        client = FakeClient("this is not json")
        result = interpret_development(_development(), client=client)
        self.assertEqual(result.action, "monitor")
        self.assertIn("interpretation", result.source_facts.lower())

    def test_missing_required_field_fails_safe(self):
        bad = VALID_JSON.replace('"uncertainty_watch"', '"something_else"')
        client = FakeClient(bad)
        result = interpret_development(_development(), client=client)
        self.assertEqual(result.action, "monitor")

    def test_invalid_action_value_fails_safe(self):
        bad = VALID_JSON.replace('"monitor"', '"take_over_the_company"')
        client = FakeClient(bad)
        result = interpret_development(_development(), client=client)
        self.assertEqual(result.action, "monitor")
        self.assertIn("Fail-closed", result.action_rationale)

    def test_empty_text_field_fails_safe(self):
        bad = VALID_JSON.replace(
            '"source_facts": "A state regulator issued draft guidance regarding AI-generated content disclosures in advertising."',
            '"source_facts": "   "',
        )
        client = FakeClient(bad)
        result = interpret_development(_development(), client=client)
        self.assertEqual(result.action, "monitor")


class TestSocialContentAbsence(unittest.TestCase):
    """Q: social collateral must be structurally absent from the
    Development interpretation contract -- checked two ways: (1) the
    dataclass itself has no such field, (2) a model response that
    smuggles one in is actively rejected, not silently stripped."""

    def test_dataclass_has_no_marketing_fields(self):
        field_names = {f.name for f in dataclasses.fields(BoundedInterpretation)}
        forbidden = {"linkedin_post", "linkedin_hashtags", "instagram_caption", "carousel_slides"}
        self.assertEqual(field_names & forbidden, set())

    def test_response_smuggling_linkedin_post_is_rejected(self):
        smuggled = VALID_JSON[:-1] + ',\n  "linkedin_post": "Buy Chain of Title now!"\n}'
        client = FakeClient(smuggled)
        result = interpret_development(_development(), client=client)
        # Rejected wholesale -> conservative fallback, not a partial accept.
        self.assertEqual(result.action, "monitor")
        self.assertIn("Fail-closed", result.action_rationale)

    def test_validate_interpretation_directly_rejects_forbidden_keys(self):
        raw = {
            "source_facts": "x facts here", "si8_relevance": "y relevance here",
            "uncertainty_watch": "z watch here", "action": "monitor",
            "carousel_slides": [{"slide": 1, "text": "hi"}],
        }
        self.assertIsNone(validate_interpretation(raw, "dev-1"))


class TestConclusionStrengthGuardrailsPresentInPrompt(unittest.TestCase):
    """These assert the guardrail LANGUAGE required by Phase 6 is actually
    present in the shipped prompt text -- a cheap, direct regression check
    that the specific allegation/finding, proposal/enacted, and
    individual/industry distinctions aren't silently dropped in a future
    edit of interpretation.py."""

    def test_prompt_requires_allegation_vs_finding_distinction(self):
        from interpretation import INTERPRETATION_PROMPT
        self.assertIn("ALLEGATION", INTERPRETATION_PROMPT)
        self.assertIn("FINDING", INTERPRETATION_PROMPT)

    def test_prompt_requires_proposed_vs_enacted_distinction(self):
        from interpretation import INTERPRETATION_PROMPT
        self.assertIn("PROPOSED", INTERPRETATION_PROMPT)
        self.assertIn("ENACTED", INTERPRETATION_PROMPT)

    def test_prompt_requires_individual_vs_industry_distinction(self):
        from interpretation import INTERPRETATION_PROMPT
        self.assertIn("INDUSTRY-WIDE", INTERPRETATION_PROMPT)

    def test_prompt_forbids_marketing_copy(self):
        from interpretation import INTERPRETATION_PROMPT
        self.assertIn("Do NOT generate a LinkedIn post", INTERPRETATION_PROMPT)

    def test_prompt_forbids_automatic_living_knowledge_action(self):
        from interpretation import INTERPRETATION_PROMPT
        self.assertIn("never something you or any automated system acts on directly", INTERPRETATION_PROMPT)


if __name__ == "__main__":
    unittest.main()
