"""
classify.py — SI8 LinkedIn Response Classifier
Extracts the lead's reply from conversation_raw and classifies it.

Classification:
  warm     — genuine engagement: described pain, asked question, expressed interest
  pass     — polite no: not right now, not relevant, no current need
  naf      — not a fit: wrong role, wrong vertical, explicitly won't use AI
  minimal  — too short to classify: thumbs up, "Hi", single word

Usage:
  from classify import extract_reply, classify_reply, CONVERSION_PATHWAYS
"""

import re


# ---------------------------------------------------------------------------
# Reply extraction
# ---------------------------------------------------------------------------

def extract_reply(conversation_raw: str) -> str:
    """
    Extract only the lead's reply from a full conversation string.

    SI8 outreach messages always end with one of:
      - "Let's connect!HH:MM am/pm"   (msg#1 connection requests)
      - "Let's chat!HH:MM am/pm"
      - "www.superimmersive8.comHH:MM am/pm"  (follow-up messages)
      - "Thanks[!,]\n(Ivy|Vanessa|Lilly)HH:MM am/pm"

    Everything AFTER the last such marker is the lead's reply.
    """
    pattern = (
        r"(Let's connect!|Let's chat!|www\.superimmersive8\.com"
        r"|Thanks[!,]\s*\n(?:Ivy|Vanessa|Lilly)"
        r"|Seeing this come up more this year\.?"  # Legal Friction msg#1 ending
        r")"
        r"\s*\d{1,2}:\d{2}\s*(?:am|pm)"
    )
    matches = list(re.finditer(pattern, conversation_raw, re.IGNORECASE))
    if matches:
        reply = conversation_raw[matches[-1].end():].strip()
        # Remove leading timestamp if present (e.g. "04:45 pm\n...")
        reply = re.sub(r'^\d{1,2}:\d{2}\s*(?:am|pm)\s*', '', reply).strip()
        return reply
    return conversation_raw.strip()


# ---------------------------------------------------------------------------
# Text normalization
# ---------------------------------------------------------------------------

def normalize(text: str) -> str:
    """Normalize curly quotes/apostrophes to ASCII, lowercase."""
    return (
        text
        .replace('\u2019', "'").replace('\u2018', "'")
        .replace('\u201c', '"').replace('\u201d', '"')
        .lower()
        .strip()
    )


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

NAF_PATTERNS = [
    "don't use ai", "dont use ai",
    "don't do ai", "dont do ai",
    "don't produce ai", "dont produce ai",
    "never will",
    "not within our remit", "not in our remit",
    "we don't create", "we dont create",
    "not something i'd be interested",
    "we don't recommend any ai", "we don't recommend ai",
    "we don't have one because we don't use ai",
    "haven't produced ai", "not produced ai",
    "no plans to incorporate",
    "do you need any support with seo",   # counter-pitch / wrong side of market
    "not something we", "not something i",
]

PASS_PATTERNS = [
    "no thank", "not for me",
    "not at the moment", "not right now", "not currently",
    "no current need", "no need",
    "not looking", "not in a position",
    "gracias por",
    "uhno", "nope",
    "hasn't come up", "haven't encountered", "not encountered",
    "not a scenario", "not come up", "hasn't been an issue", "not an issue",
    "don't have this problem",
    "okay at the moment", "i'm okay at",
    "not in need", "will reach out if",
    "might be in the future", "let's keep in touch",
    "hope this will change",
    "no thanks", "not for us", "not relevant",
    "it hasn't", "haven't had this", "haven't come across",
    "what an opener",       # friendly brush-off
    "lovely to connect",    # friendly brush-off
    "bear you in mind",
    "not interested",
    "haven't had this issue",
    "hasn't been an issue",
    "not an issue for us",
]

WARM_PATTERNS = [
    # Direct interest — short replies
    "tell me more",
    "interested in learning more",
    "would not mind learning more",
    "learning more",
    "sounds interesting", "sounds good", "sounds pretty good",
    "love to", "would like to",
    "can you send", "send me", "send over", "show me",
    "can you share", "share some examples", "share an example",
    "do you have a website", "do u have any website",
    "book a call", "schedule", "let's chat", "open to a call",
    "happy to chat", "happy to discuss", "open to",
    "when can we", "available for",
    "anytime", "sure, anytime",
    "sure!", "yes, sure", "yes sure",
    "why do you ask",           # curious, not dismissive — Leimi archetype
    "future use cases",
    "may have future",
    "telegram", "whatsapp",     # moved to a different channel = warm intent
    # Pain acknowledgment
    "great question", "good question",
    "very relevant", "that's relevant", "that is relevant",
    "actually relevant", "relevant point",
    "this is relevant", "this is useful",
    "our legal team", "legal team blocked", "legal team",
    "come across this", "encountered this",
    "had this happen", "been blocked",
    "compliance", "risk management",
    "great timing",
    "becoming more important", "becoming an important",
    "increasing scrutiny", "more scrutiny",
    "documentation, usage rights",
    "usage rights",
    # Describing their own process (Hugo archetype)
    "i usually", "my process", "we handle it",
    "balancing creativity", "involve the legal",
    "would love to hear",
    # Product engagement
    "chain of title", "$499", "90-minute",
    "rights package", "rights documentation",
    "how much", "pricing", "cost",
    # AI usage confirmation
    "we do produce", "we do use", "we use ai",
    "we produce ai", "we create ai",
    "we've worked on ai", "worked on ai",
    "ai-generated content", "ai generated content",
    "our client",
    # Outsource pathway (Hugo final state)
    "outsource", "the full report", "pretty good", "ok sounds",
    # Specific engagement
    "curious", "worth a conversation",
    # Very short but clear warm signals
    "interested",
    "tell me more",
    "i'd be interested",
    "love to see",
    "i'd love to see",
]


def classify_reply(reply: str) -> str:
    """
    Returns: 'warm' | 'pass' | 'naf' | 'minimal'
    """
    t = normalize(reply)

    if not t or len(t) < 3:
        return 'minimal'

    # NAF first — strongest signal (definitive wrong fit)
    for p in NAF_PATTERNS:
        if p in t:
            return 'naf'

    # Negated warm signals — "not interested" contains "interested" → must catch before warm loop
    NEGATED_WARM = ["not interested", "isn't interested", "no interest"]
    for neg in NEGATED_WARM:
        if neg in t:
            return 'pass'

    # Warm before pass — genuine interest beats hedging language
    for p in WARM_PATTERNS:
        if p in t:
            return 'warm'

    # Pass — polite no (only after warm patterns checked)
    for p in PASS_PATTERNS:
        if p in t:
            return 'pass'

    # Too short to classify
    if len(t) < 20:
        return 'minimal'

    return 'minimal'


# ---------------------------------------------------------------------------
# Conversion pathway detection (for warm leads only)
# ---------------------------------------------------------------------------

PATHWAY_1_PATTERNS = [
    "been blocked", "client blocked", "legal team blocked",
    "had this happen", "come across this", "encountered this",
    "had this issue", "this has happened",
]

PATHWAY_2_PATTERNS = [
    "i usually", "my process", "we handle it", "balancing creativity",
    "involve the legal", "we manage", "we already",
    "informal process", "our own process",
]

PATHWAY_3_PATTERNS = [
    "outsource", "time-consuming", "takes time",
    "the full report", "we produce reports", "we create reports",
    "we do this already", "we already do",
]


def detect_pathway(reply: str) -> str:
    """
    For warm leads, detect which conversion pathway applies.
    Returns: 'P1-pain-aware' | 'P2-informal-process' | 'P3-outsource' | 'unknown'
    """
    t = normalize(reply)
    for p in PATHWAY_3_PATTERNS:
        if p in t:
            return 'P3-outsource'
    for p in PATHWAY_2_PATTERNS:
        if p in t:
            return 'P2-informal-process'
    for p in PATHWAY_1_PATTERNS:
        if p in t:
            return 'P1-pain-aware'
    return 'unknown'
