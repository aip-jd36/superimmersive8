"""
SI8 News Intelligence -- bounded intelligence interpretation at the
Development level (SI8-INTEL-NEWS-4A).

Replaces, for THIS new architectural layer only, the old article-level
SCORE_PROMPT's habit of mixing intelligence judgment with LinkedIn/
Instagram/carousel marketing copy in one undifferentiated model call. This
module produces exactly four bounded fields and NOTHING ELSE -- no social
or marketing content field exists on `BoundedInterpretation`, and the
validator actively rejects any model response that smuggles one in.

digest.py's existing SCORE_PROMPT / score_batch (the live, scheduled
Production email path) is UNCHANGED by this module -- see NEWS-4A's own
scope boundary: this milestone proves the Development + bounded
interpretation layer without redesigning the Production email. NEWS-4B is
expected to wire this into composition and retire the old monolithic
prompt for that purpose.

LIVING KNOWLEDGE BOUNDARY: an `action` of "review_living_knowledge" is a
signal for a HUMAN to consider running the existing, separate LK
review/governance workflow (tools/lk-source-monitor/, GOVERNED-CLAIMS.md).
This module has no import, call, or write path to any Living Knowledge or
CRC system, and must never gain one (see
tools/news-digest/tests/test_boundary.py, which statically enforces an
import allowlist for exactly this reason). News Intelligence is an
observational/input system only -- it detects; it never governs.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from development import Development

# ---------------------------------------------------------------------------
# Bounded interpretation contract
# ---------------------------------------------------------------------------

# Closed vocabulary. "review_living_knowledge" flags a possible human LK
# review -- it is a suggestion for a human process, never an instruction
# this module or anything downstream of it acts on automatically.
ACTION_VALUES = {
    "monitor",
    "review_living_knowledge",
    "review_product_implications",
    "consider_marketing_opportunity",
    "no_action",
}

# If a model response contains any of these keys, it has smuggled marketing
# collateral into what must be an intelligence-only contract. Validation
# rejects the response outright rather than silently stripping the field --
# a response that tried to include this is untrustworthy on the fields we
# do keep, too.
_FORBIDDEN_KEYS = {
    "linkedin_post",
    "linkedin_hashtags",
    "instagram_caption",
    "carousel_slides",
    "social_copy",
    "marketing_copy",
}

_REQUIRED_TEXT_FIELDS = ("source_facts", "si8_relevance", "uncertainty_watch")


@dataclass
class BoundedInterpretation:
    """Exactly four intelligence fields. Deliberately has NO field for any
    social/marketing content -- see module docstring."""

    development_id: str
    source_facts: str
    si8_relevance: str
    uncertainty_watch: str
    action: str
    action_rationale: str = ""


INTERPRETATION_PROMPT = """You are producing a bounded intelligence interpretation of ONE underlying real-world development for SuperImmersive 8 (SI8), a B2B compliance/assurance provider for AI-generated commercial media. SI8's current architecture includes CRC (a free commercial-readiness conversation), Living Knowledge (governed, human-reviewed factual claims), and Commercial Assurance (paid, human-reviewed assessments). Describe relevance broadly and honestly -- do not force every development into validating one specific SI8 product feature.

This development is reported by {n_sources} source article(s) below. Produce EXACTLY four fields, each strictly bounded:

1. source_facts: State ONLY what the source articles actually report, in your own words, with NO interpretation or SI8 framing. You MUST preserve these distinctions and NEVER collapse them:
   - an ALLEGATION in a filed lawsuit is not a court FINDING or ruling;
   - a PROPOSED rule/bill is not an ENACTED, currently-binding requirement;
   - ONE company's, insurer's, or provider's individual action or product is not an INDUSTRY-WIDE requirement or standard;
   - a commentary/opinion/client-alert piece is not itself an authoritative rule.

2. si8_relevance: Your own interpretation of why this MAY matter to SI8 -- its product, customers, Living Knowledge, market positioning, or commercial-readiness workflows. State plainly that this is interpretation, not a restatement of the source. Never state or imply this is legal advice, a settled legal requirement, or an authoritative Living Knowledge fact.

3. uncertainty_watch: What remains unverified, unresolved, prospective, contested, or worth monitoring. This must NOT be empty when the development involves litigation not yet decided, a bill/rule not yet enacted or in effect, or a single example not yet shown to be a pattern.

4. action: EXACTLY ONE of: "monitor", "review_living_knowledge", "review_product_implications", "consider_marketing_opportunity", "no_action". "review_living_knowledge" only flags that a human should consider reviewing SI8's governed Living Knowledge -- it is never something you or any automated system acts on directly.

Do NOT generate a LinkedIn post, Instagram caption, carousel slides, hashtags, or any sales/marketing copy in any field.

Return ONLY a valid JSON object with exactly these keys: source_facts, si8_relevance, uncertainty_watch, action, action_rationale (one short sentence). No prose, no markdown fences.

Sources:
{articles_block}"""


def _format_sources_block(development: Development) -> str:
    lines = []
    for a in development.articles:
        summary = (a.get("summary") or "").strip()[:300]
        lines.append(
            f"- {a.get('title', '')} ({a.get('source', 'Unknown')}, {a.get('published', '')}): "
            f"{summary or '(no summary)'}"
        )
    return "\n".join(lines)


def validate_interpretation(raw, development_id: str) -> BoundedInterpretation | None:
    """Deterministic structured-output validation. Returns None (never
    raises) on any malformed response, missing/wrong-typed field, invalid
    action value, or a response that smuggled a marketing-copy field."""
    if not isinstance(raw, dict):
        return None
    if any(k in raw for k in _FORBIDDEN_KEYS):
        return None
    if not {"source_facts", "si8_relevance", "uncertainty_watch", "action"}.issubset(raw.keys()):
        return None
    for field_name in _REQUIRED_TEXT_FIELDS:
        value = raw.get(field_name)
        if not isinstance(value, str) or not value.strip():
            return None
    action = raw.get("action")
    if action not in ACTION_VALUES:
        return None
    return BoundedInterpretation(
        development_id=development_id,
        source_facts=raw["source_facts"].strip(),
        si8_relevance=raw["si8_relevance"].strip(),
        uncertainty_watch=raw["uncertainty_watch"].strip(),
        action=action,
        action_rationale=str(raw.get("action_rationale", "")).strip(),
    )


def _fallback_interpretation(development: Development, *, reason: str) -> BoundedInterpretation:
    """Fail-closed default. Applied on any model/network/parse/validation
    failure. Deliberately conservative: action defaults to "monitor" (the
    least consequential action) and every text field says plainly that
    interpretation was not produced, rather than fabricating confident
    content."""
    titles = "; ".join(a.get("title", "") for a in development.articles)
    return BoundedInterpretation(
        development_id=development.id,
        source_facts=f"(Interpretation unavailable: {reason}.) Reported by: {titles}",
        si8_relevance="(Not assessed -- interpretation generation failed; requires manual review before any conclusion is drawn.)",
        uncertainty_watch="Interpretation could not be generated for this development; treat it as unverified until reviewed.",
        action="monitor",
        action_rationale=f"Fail-closed default: {reason}.",
    )


def interpret_development(
    development: Development,
    *,
    client=None,
    model: str = "claude-haiku-4-5-20251001",
) -> BoundedInterpretation:
    """Produce a BoundedInterpretation for one Development. `client` is an
    injected Anthropic-client-shaped object (duck-typed, same contract as
    development.py's `build_developments`) so tests can supply a
    deterministic fake with no network access. If `client` is None, or the
    model call/parse/validation fails for any reason, returns the
    conservative fallback -- never raises, never fabricates content."""
    if client is None:
        return _fallback_interpretation(development, reason="no model client provided")

    prompt = INTERPRETATION_PROMPT.format(
        n_sources=development.source_count,
        articles_block=_format_sources_block(development),
    )
    try:
        response = client.messages.create(
            model=model,
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        if "```" in text:
            match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
            if match:
                text = match.group(1)
        raw = json.loads(text)
    except Exception:
        return _fallback_interpretation(development, reason="model call or response parsing failed")

    validated = validate_interpretation(raw, development.id)
    if validated is None:
        return _fallback_interpretation(development, reason="structured output failed schema validation")
    return validated
