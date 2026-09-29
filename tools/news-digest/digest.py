#!/usr/bin/env python3
"""
SI8 Weekly News Intelligence Digest
------------------------------------
Fetches AI rights/licensing/compliance news from Google News RSS,
scores each article for SI8 relevance using Claude, then emails a
structured digest via Resend.

Usage:
  python digest.py                    # run normally
  python digest.py --dry-run          # score articles, print output, don't send email
  python digest.py --lookback 14      # extend lookback to 14 days
"""

import os
import sys
import re
import json
import time
import argparse
import hashlib
import feedparser
import requests
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

from anthropic import Anthropic
from keywords import KEYWORD_CLUSTERS, SI8_CONTEXT

# SI8-INTEL-NEWS-4B: the Development-centric pipeline. None of these
# modules construct their own model/network client -- each receives the
# module-level `client` below via dependency injection, keeping every real
# network/DB touchpoint in this codebase visible at the call site (see
# tests/test_boundary.py).
from development import build_developments
from interpretation import interpret_development
from triage import triage_developments
from prioritization import prioritize_developments
from composition import build_intelligence_digest, IntelligenceDigest
from email_renderer import build_intelligence_email_html
from audit import build_run_audit, RunAudit
from retrieval_observability import CandidateRecord, QueryRetrievalRecord, RunRetrievalRecord

# Path to the digest log relative to this script (tools/news-digest/ → repo root)
REPO_ROOT = Path(__file__).parent.parent.parent
DIGEST_LOG_PATH = REPO_ROOT / "02_Marketing" / "intelligence" / "DIGEST-LOG.md"
AUDIT_LOG_PATH = REPO_ROOT / "02_Marketing" / "intelligence" / "DIGEST-AUDIT.md"
RETRIEVAL_LOG_PATH = REPO_ROOT / "02_Marketing" / "intelligence" / "RETRIEVAL-LOG.jsonl"
VOICE_SPEC_PATH = REPO_ROOT / "02_Marketing" / "brand" / "SI8_VOICE.md"

def load_voice_spec() -> str:
    """Extract LinkedIn + Instagram sections from SI8_VOICE.md for prompt injection."""
    try:
        text = VOICE_SPEC_PATH.read_text()
        import re
        linkedin_match  = re.search(r'## LinkedIn Post Structure.*?(?=\n## )', text, re.DOTALL)
        instagram_match = re.search(r'## Instagram Caption Structure.*?(?=\n## )', text, re.DOTALL)
        sections = []
        if linkedin_match:
            sections.append(linkedin_match.group(0).strip())
        if instagram_match:
            sections.append(instagram_match.group(0).strip())
        return "\n\n".join(sections) if sections else text[:2000]
    except Exception:
        return ""

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
RESEND_API_KEY = os.environ["RESEND_API_KEY"]
TO_EMAIL = os.environ.get("DIGEST_TO_EMAIL", "jd@superimmersive8.com")
FROM_EMAIL = os.environ.get("DIGEST_FROM_EMAIL", "digest@superimmersive8.com")

client = Anthropic(api_key=ANTHROPIC_API_KEY)

# ---------------------------------------------------------------------------
# 1. Fetch articles from Google News RSS
# ---------------------------------------------------------------------------

def _split_title_source(raw_title: str) -> tuple[str, str]:
    """Extract source name from a Google News RSS title (format
    "Title - Source"). Pulled out as its own function (SI8-INTEL-
    NEWS-5B2) purely so the SAME title/source parsing can be applied to
    every raw candidate for observability, not just accepted ones --
    behaviorally identical to the parsing fetch_google_news() has always
    done for accepted articles."""
    title = raw_title.strip()
    source = "Unknown"
    if " - " in title:
        parts = title.rsplit(" - ", 1)
        title = parts[0].strip()
        source = parts[1].strip()
    return title, source


def _fetch_google_news_observed(
    query: str, lookback_days: int, *, cluster: str
) -> tuple[list[dict], "QueryRetrievalRecord"]:
    """Same retrieval + date/lookback logic fetch_google_news() has always
    used, restructured (SI8-INTEL-NEWS-5B2) so the REJECTED half of the
    existing accept/reject decision is also captured, not just the
    accepted half. The returned `list[dict]` of accepted articles is
    unchanged in content, shape, and order from the pre-5B2 behavior --
    this function OBSERVES the existing retrieval/date-filtering decision,
    it does not change it."""
    encoded = requests.utils.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"

    try:
        feed = feedparser.parse(url)
        articles = []
        candidates: list[CandidateRecord] = []
        outside_lookback = 0
        unparseable_date = 0
        cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)

        for entry in feed.entries:
            raw_title = entry.get("title", "")
            published_raw = entry.get("published", "")
            title, source = _split_title_source(raw_title)

            # Parse publication date -- identical logic/order to the
            # pre-5B2 implementation; only the rejected branches now
            # record a CandidateRecord instead of a silent `continue`.
            try:
                pub_date = parsedate_to_datetime(published_raw)
                if pub_date.tzinfo is None:
                    pub_date = pub_date.replace(tzinfo=timezone.utc)
                if pub_date < cutoff:
                    outside_lookback += 1
                    candidates.append(CandidateRecord(
                        title=title, source=source, published_raw=published_raw,
                        pub_date_iso=pub_date.isoformat(), cluster=cluster, query=query,
                        disposition="outside_lookback",
                    ))
                    continue
            except Exception:
                unparseable_date += 1
                candidates.append(CandidateRecord(
                    title=title, source=source, published_raw=published_raw,
                    pub_date_iso=None, cluster=cluster, query=query,
                    disposition="unparseable_date",
                ))
                continue  # Skip entries with unparseable dates

            summary_html = entry.get("summary", "")
            import re
            summary = re.sub(r"<[^>]+>", "", summary_html)[:400].strip()
            raw_url = entry.get("link", "")
            try:
                from googlenewsdecoder import new_decoderv1
                result = new_decoderv1(raw_url)
                resolved_url = result["decoded_url"] if result.get("status") else raw_url
            except Exception:
                resolved_url = raw_url

            articles.append({
                "title": title,
                "url": resolved_url,
                "source": source,
                "published": published_raw,
                "pub_date": pub_date,
                "summary": summary,
            })
            candidates.append(CandidateRecord(
                title=title, source=source, published_raw=published_raw,
                pub_date_iso=pub_date.isoformat(), cluster=cluster, query=query,
                disposition="accepted",
            ))

        record = QueryRetrievalRecord(
            cluster=cluster, query=query, status="success",
            returned_count=len(feed.entries),
            accepted_count=len(articles),
            outside_lookback_count=outside_lookback,
            unparseable_date_count=unparseable_date,
            candidates=candidates,
        )
        return articles, record

    except Exception as e:
        print(f"  Warning: RSS fetch failed for '{query}': {e}", file=sys.stderr)
        record = QueryRetrievalRecord(
            cluster=cluster, query=query, status="failed",
            error=str(e)[:500],
        )
        return [], record


def fetch_google_news(query: str, lookback_days: int) -> list[dict]:
    """Fetch recent articles from Google News RSS for a search query.
    Public-contract-preserving thin wrapper (SI8-INTEL-NEWS-5B2) -- kept
    for any caller that only needs accepted articles, not observability.
    `cluster` is unknown at this call boundary, so it is recorded as
    "" in the (discarded) observability record; callers that need
    attributed observability should use fetch_all_articles(), which calls
    _fetch_google_news_observed() directly with the real cluster name."""
    articles, _ = _fetch_google_news_observed(query, lookback_days, cluster="")
    return articles


def _title_dedup_key(title: str) -> str:
    """Same normalized-title key the dedup step has always used. Pulled out
    as its own function (SI8-INTEL-NEWS-4A) purely so provenance-merge
    behavior can be unit tested without a network call -- the key itself is
    unchanged from the original NEWS-3-era behavior."""
    return re.sub(r"[^a-z0-9]", "", title.lower())[:80]


def dedupe_and_merge_provenance(articles: list[dict]) -> list[dict]:
    """Deduplicate by normalized title key, exactly as before -- but where
    NEWS-3-era code silently dropped every duplicate, this merges each
    duplicate's `clusters`/`queries` provenance into the first-seen article
    instead of discarding it (SI8-INTEL-NEWS-4A, Phase 1). No article's
    clusters/queries are ever narrowed to a single arbitrary value: when the
    same underlying title-key is found via more than one cluster or query,
    the surviving article carries the UNION.

    Pure function, no network access -- the caller (fetch_all_articles) is
    responsible for attaching each article's originating `clusters`/`queries`
    sets before calling this."""
    seen: dict[str, dict] = {}
    order: list[str] = []
    for a in articles:
        key = _title_dedup_key(a["title"])
        if not key:
            continue
        if key not in seen:
            # Defensive copy of the provenance sets so later mutation of one
            # article's set can never retroactively affect another.
            a = {**a, "clusters": set(a.get("clusters", set())), "queries": set(a.get("queries", set()))}
            seen[key] = a
            order.append(key)
        else:
            existing = seen[key]
            existing["clusters"] |= set(a.get("clusters", set()))
            existing["queries"] |= set(a.get("queries", set()))
    return [seen[k] for k in order]


def fetch_all_articles(lookback_days: int) -> list[dict]:
    """Fetch and deduplicate articles across all keyword clusters.

    SI8-INTEL-NEWS-4A: each article dict now also carries `clusters` and
    `queries` (sets of the NEWS-3 taxonomy identifiers that surfaced it) so
    downstream code (development.py) never has to reconstruct provenance by
    keyword-guessing. This is purely additive -- no existing key is removed
    or renamed, so the legacy email/log rendering path is unaffected.

    SI8-INTEL-NEWS-5B2: also builds and persists a RunRetrievalRecord --
    diagnostic-only, additive. The accepted-article list this function
    returns (content, shape, sort order) is unchanged from the pre-5B2
    behavior regardless of whether retrieval-log persistence succeeds;
    see update_retrieval_log()'s own fail-open contract below."""
    all_articles = []
    query_records: list[QueryRetrievalRecord] = []

    for cluster in KEYWORD_CLUSTERS:
        print(f"  Fetching: {cluster['name']}")
        for query in cluster["queries"]:
            articles, record = _fetch_google_news_observed(query, lookback_days, cluster=cluster["name"])
            query_records.append(record)
            for a in articles:
                a["clusters"] = {cluster["name"]}
                a["queries"] = {query}
            all_articles.extend(articles)
            time.sleep(0.3)  # Polite delay between requests

    unique = dedupe_and_merge_provenance(all_articles)

    # Sort by date descending
    unique.sort(key=lambda x: x.get("pub_date", datetime.min.replace(tzinfo=timezone.utc)), reverse=True)

    try:
        run_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        retrieval_record = RunRetrievalRecord(
            run_date=run_date, lookback_days=lookback_days, queries=query_records,
        )
        update_retrieval_log(retrieval_record)
    except Exception as e:
        # Diagnostic persistence must never affect which articles reach
        # the downstream pipeline -- `unique` is already fully built above.
        print(f"  Warning: retrieval-log persistence failed (pipeline unaffected): {e}", file=sys.stderr)

    return unique


def build_retrieval_log_line(record: RunRetrievalRecord) -> str:
    """Serialize one run's retrieval-observability record to a single JSON
    line (SI8-INTEL-NEWS-5B2). Pure function, no I/O -- mirrors
    build_audit_log_entry()'s pure-string-building pattern."""
    return json.dumps(asdict(record), ensure_ascii=False)


def update_retrieval_log(record: RunRetrievalRecord) -> None:
    """Append this run's retrieval-observability record to
    RETRIEVAL-LOG.jsonl (SI8-INTEL-NEWS-5B2) -- append-only, one JSON
    object per line, one line per run. Deliberately NOT DIGEST-AUDIT.md's
    prepend-after-divider mechanics: appending needs no read-parse-rewrite
    of prior content, which is both simpler and safer under concurrent
    runs. Deliberately a SEPARATE file from DIGEST-AUDIT.md/DIGEST-LOG.md
    -- see retrieval_observability.py's module docstring for why raw
    retrieval evidence and Development-level audit evidence must not be
    collapsed into one artifact. Any caller of this function that wants
    fail-open behavior (pipeline unaffected by a persistence failure) is
    responsible for its own try/except, exactly as fetch_all_articles()
    does -- mirrors update_audit_log()'s own convention of raising rather
    than swallowing, so the fail-open decision stays visible at the call
    site, not hidden inside this function."""
    RETRIEVAL_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = build_retrieval_log_line(record)
    with open(RETRIEVAL_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(f"Retrieval log updated: {RETRIEVAL_LOG_PATH}")


# ---------------------------------------------------------------------------
# 2. Coarse relevance triage-scoring with Claude (SI8-INTEL-NEWS-4B)
# ---------------------------------------------------------------------------
#
# SI8-INTEL-NEWS-4B retired this stage's former role as the live email's
# authoritative judgment (it never was semantically fit for that -- see the
# NEWS-4B Pre-Implementation Architecture Repair, Task 1: its own action
# vocabulary was calibrated around "would this make a good LinkedIn post,"
# not "how material is this to SI8"). It survives, trimmed, ONLY as a
# cheap, in-domain/off-topic screen feeding triage.py's admission decision
# -- never as a Development-level materiality judgment. Marketing-copy
# generation (LinkedIn/Instagram/carousel) has been removed from this
# prompt entirely, not merely left unrendered -- the live workflow no
# longer spends tokens generating content it doesn't use.

SCORE_PROMPT = """You are an intelligence triage analyst for SuperImmersive 8 (SI8).

{context}

Assess the following {n} news articles ONLY for whether they are plausibly relevant to SI8's business domain. This is a coarse relevance screen, not a final importance judgment -- a later stage makes the actual materiality determination with full context. For each article, return:

- relevance_score: integer 1-10 (1-3 = not relevant to SI8's business domain at all; 4-10 = plausibly in SI8's domain, worth a closer look -- do not attempt a fine-grained importance ranking here)
- relevance_reason: one short sentence explaining the score

Return ONLY a valid JSON array with exactly {n} objects in the same order as the input. No prose, no markdown fences.

Example:
[
  {{"relevance_score": 8, "relevance_reason": "Directly concerns AI video commercial licensing terms, squarely in SI8's domain."}}
]

Articles:

{articles}"""


def sanitize_json(text: str) -> str:
    """Replace raw control characters inside JSON strings with escape sequences.
    Claude sometimes emits literal newlines/tabs within string values, which breaks json.loads().
    This walks the text char-by-char tracking string context and fixes them in place."""
    result = []
    in_string = False
    escaped = False
    for char in text:
        if escaped:
            result.append(char)
            escaped = False
        elif char == '\\' and in_string:
            result.append(char)
            escaped = True
        elif char == '"':
            result.append(char)
            in_string = not in_string
        elif in_string and char == '\n':
            result.append('\\n')
        elif in_string and char == '\r':
            result.append('\\r')
        elif in_string and char == '\t':
            result.append('\\t')
        else:
            result.append(char)
    return ''.join(result)


def score_batch(articles: list[dict]) -> list[dict]:
    """Coarse in-domain relevance triage-scoring for a batch of articles
    (SI8-INTEL-NEWS-4B). Returns articles with `relevance_score`/
    `relevance_reason` added -- a triage INPUT signal only, never a
    Development-level materiality judgment (see triage.py's own module
    docstring for the full distinction)."""
    articles_text = "\n\n".join(
        f"[{i+1}] Title: {a['title']}\nSource: {a['source']}\nDate: {a['published']}\nSummary: {a['summary'] or '(no summary)'}"
        for i, a in enumerate(articles)
    )

    prompt = SCORE_PROMPT.format(
        context=SI8_CONTEXT,
        n=len(articles),
        articles=articles_text,
    )

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )

        result_text = response.content[0].text.strip()

        # Strip markdown code fences if present
        if "```" in result_text:
            import re
            match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", result_text)
            if match:
                result_text = match.group(1)

        # Fix raw control characters inside JSON string values (newlines, tabs, etc.)
        result_text = sanitize_json(result_text)

        scores = json.loads(result_text)

        for article, score_data in zip(articles, scores):
            article.update({
                "relevance_score":  score_data.get("relevance_score", 0),
                "relevance_reason": score_data.get("relevance_reason", ""),
            })

        return articles

    except Exception as e:
        print(f"  Warning: Scoring batch failed: {e}", file=sys.stderr)
        for article in articles:
            article.update({
                "relevance_score": 0,
                "relevance_reason": "Scoring unavailable",
            })
        return articles


def score_articles(articles: list[dict], batch_size: int = 8) -> list[dict]:
    """Score all articles in batches."""
    scored = []
    total_batches = (len(articles) + batch_size - 1) // batch_size

    for i in range(0, len(articles), batch_size):
        batch = articles[i : i + batch_size]
        batch_num = i // batch_size + 1
        print(f"  Scoring batch {batch_num}/{total_batches} ({len(batch)} articles)...")
        scored_batch = score_batch(batch)
        scored.extend(scored_batch)
        if i + batch_size < len(articles):
            time.sleep(1)  # Rate limit courtesy

    return scored


# ---------------------------------------------------------------------------
# LEGACY (dormant) -- article-centric HTML email + DIGEST-LOG rendering.
#
# SI8-INTEL-NEWS-4B retired this section as the live workflow's authoritative
# output. main() no longer calls any function below this point -- see "3.
# Development-centric composition + rendering" further down for what main()
# actually calls now. Kept, not deleted, per NEWS-4B's own instruction not
# to remove reusable code without a tightly-scoped reason: (a) NEWS-4A's own
# tests/test_legacy_compatibility.py exercises these functions directly to
# prove the earlier provenance-enrichment change didn't break them, and (b)
# nothing about them is unsafe to leave dormant -- they render whatever
# dict shape they're given and are simply never invoked in the live path.
# They still tolerate the trimmed article dict shape gracefully (they
# `.get()` every legacy field that no longer gets populated, e.g.
# `linkedin_post`, and simply omit that block when absent).
# ---------------------------------------------------------------------------

ACTION_BADGES = {
    "post_linkedin": (
        '<span style="background:#C8900A;color:#fff;padding:2px 8px;border-radius:3px;'
        'font-size:11px;font-weight:700;letter-spacing:0.5px;">POST ON LINKEDIN</span>'
    ),
    "update_docs": (
        '<span style="background:#1a6b8a;color:#fff;padding:2px 8px;border-radius:3px;'
        'font-size:11px;font-weight:700;letter-spacing:0.5px;">UPDATE DOCS</span>'
    ),
    "post_and_update": (
        '<span style="background:#C8900A;color:#fff;padding:2px 8px;border-radius:3px;'
        'font-size:11px;font-weight:700;letter-spacing:0.5px;">POST ON LINKEDIN</span>&nbsp;'
        '<span style="background:#1a6b8a;color:#fff;padding:2px 8px;border-radius:3px;'
        'font-size:11px;font-weight:700;letter-spacing:0.5px;">UPDATE DOCS</span>'
    ),
    "monitor": (
        '<span style="background:#777;color:#fff;padding:2px 8px;border-radius:3px;'
        'font-size:11px;font-weight:700;letter-spacing:0.5px;">MONITOR</span>'
    ),
}

SCORE_COLORS = {
    10: "#b91c1c", 9: "#b91c1c", 8: "#C8900A",
    7: "#C8900A", 6: "#555", 5: "#555", 4: "#555",
}


def article_card(a: dict) -> str:
    score           = a.get("relevance_score", 0)
    action          = a.get("action", "skip")
    badge           = ACTION_BADGES.get(action, "")
    score_color     = SCORE_COLORS.get(score, "#999")
    doc             = a.get("doc_to_update")
    linkedin_post   = a.get("linkedin_post") or a.get("draft_hook")
    linkedin_tags   = a.get("linkedin_hashtags")
    ig_caption      = a.get("instagram_caption")
    carousel_slides = a.get("carousel_slides")
    pub             = a.get("published", "")[:16]

    doc_line = (
        f'<p style="margin:6px 0 0;font-size:12px;color:#666;">'
        f'<strong>→ Update:</strong> <code style="background:#f0f0f0;padding:1px 4px;'
        f'border-radius:2px;font-size:11px;">{doc}</code></p>'
    ) if doc else ""

    # LinkedIn post + hashtags block
    if linkedin_post:
        tags_line = (
            f'<p style="margin:8px 0 0;font-size:12px;color:#888;">{linkedin_tags}</p>'
        ) if linkedin_tags else ""
        linkedin_block = (
            f'<div style="background:#fffbf0;border-left:3px solid #C8900A;padding:10px 14px;margin-top:10px;">'
            f'<div style="font-size:11px;font-weight:700;color:#C8900A;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">LinkedIn Post</div>'
            f'<p style="margin:0;font-size:13px;color:#1a1918;line-height:1.6;">{linkedin_post}</p>'
            f'{tags_line}'
            f'</div>'
        )
    else:
        linkedin_block = ""

    # Instagram caption block
    if ig_caption:
        ig_formatted = ig_caption.replace("\n", "<br>")
        ig_block = (
            f'<div style="background:#f5f0ff;border-left:3px solid #7c3aed;padding:10px 14px;margin-top:8px;">'
            f'<div style="font-size:11px;font-weight:700;color:#7c3aed;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">Instagram Caption</div>'
            f'<p style="margin:0;font-size:13px;color:#1a1918;line-height:1.6;">{ig_formatted}</p>'
            f'</div>'
        )
    else:
        ig_block = ""

    # Carousel slides block
    if carousel_slides and isinstance(carousel_slides, list):
        slide_rows = ""
        for s in carousel_slides:
            label = s.get("label") or s.get("type", "").upper().replace("_", " ")
            text  = s.get("text", "")
            num   = s.get("slide", "")
            slide_rows += (
                f'<tr>'
                f'<td style="padding:5px 8px;font-size:11px;font-weight:700;color:#C8900A;white-space:nowrap;vertical-align:top;">S{num}</td>'
                f'<td style="padding:5px 8px;font-size:11px;color:#555;white-space:nowrap;vertical-align:top;text-transform:uppercase;letter-spacing:0.3px;">{label}</td>'
                f'<td style="padding:5px 8px;font-size:12px;color:#1a1918;line-height:1.5;">{text}</td>'
                f'</tr>'
            )
        carousel_block = (
            f'<div style="background:#f9f9f7;border-left:3px solid #888;padding:10px 14px;margin-top:8px;">'
            f'<div style="font-size:11px;font-weight:700;color:#555;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">Carousel Slides — Paste into Canva</div>'
            f'<table style="width:100%;border-collapse:collapse;">{slide_rows}</table>'
            f'</div>'
        )
    else:
        carousel_block = ""

    return f"""
    <div style="border:1px solid #e5e5e5;border-radius:6px;padding:16px 18px;margin-bottom:10px;background:#fff;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:12px;font-weight:700;color:{score_color};min-width:24px;">{score}/10</span>
        {badge}
      </div>
      <a href="{a['url']}" style="color:#1a1918;font-size:15px;font-weight:600;text-decoration:none;line-height:1.4;display:block;">{a['title']}</a>
      <div style="color:#999;font-size:12px;margin:5px 0;">{a['source']} &middot; {pub}</div>
      <p style="color:#444;font-size:13px;margin:8px 0 0;line-height:1.5;">{a.get('relevance_reason', '')}</p>
      {doc_line}
      {linkedin_block}
      {ig_block}
      {carousel_block}
    </div>
    """


def build_email_html(articles: list[dict], week_str: str, lookback_days: int) -> str:
    high = sorted(
        [a for a in articles if a.get("relevance_score", 0) >= 7],
        key=lambda x: x.get("relevance_score", 0), reverse=True
    )
    mid = sorted(
        [a for a in articles if 4 <= a.get("relevance_score", 0) <= 6],
        key=lambda x: x.get("relevance_score", 0), reverse=True
    )

    def section(title: str, color: str, border: str, items: list) -> str:
        if not items:
            return ""
        cards = "".join(article_card(a) for a in items)
        return f"""
        <h2 style="color:{color};font-size:15px;font-weight:700;margin:28px 0 12px;
                   padding-bottom:8px;border-bottom:2px solid {border};letter-spacing:0.5px;">
          {title} &nbsp;<span style="font-weight:400;font-size:13px;">({len(items)})</span>
        </h2>
        {cards}
        """

    body = ""
    if not high and not mid:
        body = '<p style="color:#888;font-style:italic;margin:24px 0;">No significant articles found this week. Keyword coverage may need tuning.</p>'
    else:
        body += section("🔴 HIGH RELEVANCE — Act on these", "#b91c1c", "#b91c1c", high)
        body += section("🟡 MONITOR — Worth knowing", "#777", "#ddd", mid)

    stats_line = f"{len(high)} high · {len(mid)} monitor · lookback {lookback_days} days"

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#FAFAF7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:660px;margin:0 auto;">

    <!-- Header -->
    <div style="background:#1a1918;border-radius:8px 8px 0 0;padding:24px 28px;">
      <div style="color:#C8900A;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">SuperImmersive 8</div>
      <div style="color:#fff;font-size:20px;font-weight:700;margin-top:4px;">Weekly Intelligence Digest</div>
      <div style="color:#aaa;font-size:12px;margin-top:4px;">{week_str} &nbsp;&middot;&nbsp; {stats_line}</div>
    </div>

    <!-- Body -->
    <div style="background:#fff;border-radius:0 0 8px 8px;padding:24px 28px;box-shadow:0 2px 6px rgba(0,0,0,0.07);">

      <div style="background:#f5f5f0;border-radius:4px;padding:10px 14px;margin-bottom:4px;font-size:12px;color:#666;">
        Tracking: AI video rights · copyright &amp; right of publicity lawsuits · E&amp;O insurance (AI exclusions) · brand legal campaign blocking · synthetic performer laws · regulatory deadlines (EU AI Act Aug 2 · NY June 9 · UAE Sept) · holdco AI governance · competitor activity (Runway · Kling · Pika · Veo · Adobe · FADEL)
      </div>

      {body}

      <div style="border-top:1px solid #eee;margin-top:28px;padding-top:16px;font-size:11px;color:#bbb;text-align:center;">
        SI8 Intelligence Digest &nbsp;&middot;&nbsp; PMF Strategy Inc. d/b/a SuperImmersive 8 &nbsp;&middot;&nbsp; Automated weekly report<br>
        To adjust keywords: <code>tools/news-digest/keywords.py</code>
      </div>
    </div>

  </div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# 4. Send via Resend
# ---------------------------------------------------------------------------

def send_email(html: str, week_str: str, dry_run: bool = False) -> bool:
    if dry_run:
        print("\n[DRY RUN] Email not sent. HTML preview written to /tmp/si8-digest-preview.html")
        with open("/tmp/si8-digest-preview.html", "w") as f:
            f.write(html)
        return True

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": FROM_EMAIL,
            "to": [TO_EMAIL],
            "subject": f"SI8 News Intelligence — {week_str}",
            "html": html,
        },
        timeout=15,
    )

    if response.status_code in (200, 201):
        print(f"Digest sent to {TO_EMAIL}")
        return True
    else:
        print(f"Email failed: {response.status_code} {response.text}", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
# LEGACY (dormant) -- article-centric DIGEST-LOG writer. See the "LEGACY
# (dormant)" comment above article_card/build_email_html -- same rationale.
# main() now calls update_development_digest_log() instead (below).
# ---------------------------------------------------------------------------

ACTION_LABELS = {
    "post_linkedin":   "post",
    "update_docs":     "update",
    "post_and_update": "post+update",
    "monitor":         "monitor",
    "skip":            "skip",
}


def build_log_entry(all_scored: list[dict], week_str: str, lookback_days: int, run_date: str) -> str:
    """Build a markdown section for this week's digest to prepend to DIGEST-LOG.md."""
    high = [a for a in all_scored if a.get("relevance_score", 0) >= 7 and a.get("action") != "skip"]
    mid  = [a for a in all_scored if 4 <= a.get("relevance_score", 0) <= 6 and a.get("action") != "skip"]

    def table_rows(articles: list[dict]) -> str:
        rows = []
        for a in sorted(articles, key=lambda x: x.get("relevance_score", 0), reverse=True):
            score  = a.get("relevance_score", 0)
            action = ACTION_LABELS.get(a.get("action", "skip"), "—")
            title  = a.get("title", "").replace("|", "\\|")
            url    = a.get("url", "#")
            source = a.get("source", "").replace("|", "\\|")
            date   = a.get("published", "")[:16]
            rows.append(f"| {score} | {action} | [{title}]({url}) | {source} | {date} | ☐ |")
        return "\n".join(rows)

    high_section = ""
    if high:
        high_section = (
            "\n### 🔴 High Relevance (7–10)\n\n"
            "| Score | Action | Title | Source | Date | Acted On |\n"
            "|-------|--------|-------|--------|------|----------|\n"
            + table_rows(high) + "\n"
        )

    mid_section = ""
    if mid:
        mid_section = (
            "\n### 🟡 Monitor (4–6)\n\n"
            "| Score | Action | Title | Source | Date | Acted On |\n"
            "|-------|--------|-------|--------|------|----------|\n"
            + table_rows(mid) + "\n"
        )

    return (
        f"## Week of {week_str}\n"
        f"*Run: {run_date} · {len(high)} high · {len(mid)} monitor · lookback {lookback_days} days*\n"
        + high_section
        + mid_section
        + "\n---\n"
    )


def update_digest_log(all_scored: list[dict], week_str: str, lookback_days: int) -> None:
    """Prepend this week's entry to DIGEST-LOG.md, preserving existing content."""
    run_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_entry = build_log_entry(all_scored, week_str, lookback_days, run_date)

    DIGEST_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    if DIGEST_LOG_PATH.exists():
        existing = DIGEST_LOG_PATH.read_text(encoding="utf-8")
        # Insert after the header block (everything before the first "---\n\n##")
        divider = "---\n\n"
        if divider in existing:
            header, rest = existing.split(divider, 1)
            updated = header + divider + new_entry + "\n" + rest
        else:
            updated = existing.rstrip() + "\n\n---\n\n" + new_entry
    else:
        header = (
            "# SI8 Intelligence — Digest Article Log\n\n"
            "All articles surfaced by the weekly news digest, regardless of action taken.\n"
            "**Auto-updated every Monday** by the digest script via GitHub Actions.\n\n"
            "To mark an article as acted on, change `☐` → `☑` in the last column.\n\n"
            "**Action key:** `post` = LinkedIn post · `update` = internal doc updated · "
            "`post+update` = both · `monitor` = no action needed\n\n"
            "---\n\n"
        )
        updated = header + new_entry

    DIGEST_LOG_PATH.write_text(updated, encoding="utf-8")
    print(f"✓ Digest log updated: {DIGEST_LOG_PATH}")


# ---------------------------------------------------------------------------
# 6. Development-level DIGEST-LOG (SI8-INTEL-NEWS-4B)
# ---------------------------------------------------------------------------
#
# Same file, same mechanics (weekly section, prepended, git-committed by
# the workflow) as the legacy log above -- only the row granularity changes,
# from article to Development. Nothing in this repository parses
# DIGEST-LOG.md back in (confirmed by repository-wide search during the
# NEWS-4B investigation), so this remains a disposable, human-readable,
# append-only ledger -- explicitly NOT cross-run machine memory. No model
# chain-of-thought is logged, only the already-bounded rationale strings.

def _dev_log_row(development, interp, priority=None) -> str:
    title = development.canonical_title.replace("|", "\\|")
    url = _primary_dev_url(development)
    clusters = ", ".join(sorted(development.clusters)).replace("|", "\\|")
    sources = f"{development.source_count} ({', '.join(development.sources)})".replace("|", "\\|")
    rationale = (priority.rationale if priority else interp.action).replace("|", "\\|")
    return f"| [{title}]({url}) | {clusters} | {sources} | {rationale} | ☐ |"


def _primary_dev_url(development) -> str:
    ordered = sorted(development.articles, key=lambda a: a.get("pub_date") or "")
    return ordered[0].get("url", "#") if ordered else "#"


def build_development_log_entry(digest: IntelligenceDigest, run_date: str) -> str:
    """Build a markdown section for this run's Development-centric digest,
    to prepend to DIGEST-LOG.md."""
    header = (
        f"## Week of {digest.date}\n"
        f"*Run: {run_date} · {len(digest.high)} high · {len(digest.monitor)} monitor · "
        f"{digest.deferred_count} deferred · lookback {LAST_LOOKBACK_DAYS} days*\n"
    )

    high_section = ""
    if digest.high:
        rows = "\n".join(_dev_log_row(d, interp, p) for d, interp, p in digest.high)
        high_section = (
            "\n### Material Developments (HIGH)\n\n"
            "| Development | Cluster(s) | Sources | Rationale | Acted On |\n"
            "|-------------|------------|---------|-----------|----------|\n"
            + rows + "\n"
        )

    monitor_section = ""
    if digest.monitor:
        rows = "\n".join(_dev_log_row(d, interp, p) for d, interp, p in digest.monitor)
        monitor_section = (
            "\n### Monitor\n\n"
            "| Development | Cluster(s) | Sources | Rationale | Acted On |\n"
            "|-------------|------------|---------|-----------|----------|\n"
            + rows + "\n"
        )

    degraded_section = ""
    if digest.degraded_notes:
        degraded_section = (
            "\n**Degraded this run:** " + "; ".join(digest.degraded_notes) + "\n"
        )

    return header + high_section + monitor_section + degraded_section + "\n---\n"


def update_development_digest_log(digest: "IntelligenceDigest") -> None:
    """Prepend this run's Development-centric entry to DIGEST-LOG.md,
    preserving existing (article-shaped, historical) content untouched."""
    run_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_entry = build_development_log_entry(digest, run_date)

    DIGEST_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    if DIGEST_LOG_PATH.exists():
        existing = DIGEST_LOG_PATH.read_text(encoding="utf-8")
        divider = "---\n\n"
        if divider in existing:
            header, rest = existing.split(divider, 1)
            updated = header + divider + new_entry + "\n" + rest
        else:
            updated = existing.rstrip() + "\n\n---\n\n" + new_entry
    else:
        header = (
            "# SI8 Intelligence — Digest Development Log\n\n"
            "Material developments surfaced by the News Intelligence pipeline, "
            "grouped from source articles into Developments (SI8-INTEL-NEWS-4B). "
            "Entries before this line's introduction are article-level, from the "
            "legacy pipeline, and are historical record only.\n"
            "**Auto-updated** by the digest script via GitHub Actions.\n\n"
            "To mark a Development as acted on, change `☐` → `☑` in the last column.\n\n"
            "---\n\n"
        )
        updated = header + new_entry

    DIGEST_LOG_PATH.write_text(updated, encoding="utf-8")
    print(f"Digest log updated: {DIGEST_LOG_PATH}")


# ---------------------------------------------------------------------------
# 7. Run audit log (SI8-INTEL-NEWS-4C -- editorial decision observability)
# ---------------------------------------------------------------------------
#
# A SEPARATE file from DIGEST-LOG.md, deliberately: DIGEST-LOG.md's own
# established purpose/audience is content-workflow-facing (which admitted
# Developments exist, for a human to consider acting on) -- dumping every
# excluded/deferred/OMIT Development into that same file would roughly
# double-to-triple its size every run with detail aimed at a different
# audience (editorial/engineering review, not "what should I post about").
# Reuses the exact same race-safe persistence mechanism as DIGEST-LOG.md
# (push_digest_log.sh, extended to cover both paths in one commit) rather
# than inventing a second persistence path. No raw article URL/body/
# summary is written here -- only Development titles, clusters, source
# counts, and the pipeline's own already-computed triage/priority
# rationale strings.

def _audit_row(record) -> str:
    title = record.canonical_title.replace("|", "\\|")
    clusters = ", ".join(sorted(record.clusters)).replace("|", "\\|")
    return title, clusters


def _prioritized_audit_row(r) -> str:
    title, clusters = _audit_row(r)
    rationale = r.rationale.replace("|", "\\|")
    degraded = " [DEGRADED]" if r.degraded else ""
    return f"| {r.tier}{degraded} | {title} | {clusters} | {r.source_count} | {rationale} |"


def _disposition_audit_row(r) -> str:
    title, clusters = _audit_row(r)
    reason = r.reason.replace("|", "\\|")
    return f"| {title} | {clusters} | {r.source_count} | {r.max_article_score} | {reason} |"


def build_audit_log_entry(audit: RunAudit, run_date: str) -> str:
    """Build a markdown section for this run's editorial audit trail, to
    prepend to DIGEST-AUDIT.md. Pure/deterministic given `audit`."""
    header = (
        f"## Week of {audit.date}\n"
        f"*Run: {run_date} · {audit.high_count} HIGH · {audit.monitor_count} MONITOR · "
        f"{audit.omit_count} OMIT · {audit.excluded_count} excluded (below relevance floor) · "
        f"{audit.capacity_deferred_count} admission-capacity deferred · "
        f"{audit.total_candidate_count} total candidates*\n"
    )

    prioritized_section = ""
    if audit.prioritized:
        rows = "\n".join(_prioritized_audit_row(r) for r in audit.prioritized)
        prioritized_section = (
            "\n### Prioritized (reached bounded interpretation + priority)\n\n"
            "| Tier | Development | Cluster(s) | Sources | Rationale |\n"
            "|------|-------------|------------|---------|-----------|\n"
            + rows + "\n"
        )

    excluded_section = ""
    if audit.excluded:
        rows = "\n".join(_disposition_audit_row(r) for r in audit.excluded)
        excluded_section = (
            "\n### Excluded -- below relevance floor (screened off-topic before interpretation)\n\n"
            "| Development | Cluster(s) | Sources | Max article score | Reason |\n"
            "|-------------|------------|---------|--------------------|--------|\n"
            + rows + "\n"
        )

    deferred_section = ""
    if audit.capacity_deferred:
        rows = "\n".join(_disposition_audit_row(r) for r in audit.capacity_deferred)
        deferred_section = (
            "\n### Deferred -- admission capacity (on-topic, not reached this cycle)\n\n"
            "| Development | Cluster(s) | Sources | Max article score | Reason |\n"
            "|-------------|------------|---------|--------------------|--------|\n"
            + rows + "\n"
        )

    summary_section = "\n### Executive Summary generated this run\n\n"
    if audit.executive_summary_statements:
        for i, (text, supporting_ids) in enumerate(audit.executive_summary_statements, 1):
            summary_section += f"{i}. {text} (supports: {', '.join(supporting_ids)})\n"
    else:
        summary_section += "*No Executive Summary was generated this run (omitted by composition's fail-safe contract, or no HIGH developments existed).*\n"

    return header + prioritized_section + excluded_section + deferred_section + summary_section + "\n---\n"


def update_audit_log(audit: RunAudit) -> None:
    """Prepend this run's editorial audit entry to DIGEST-AUDIT.md,
    preserving prior runs' entries untouched. Same prepend-after-divider
    mechanics as DIGEST-LOG.md, in a separate file."""
    run_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_entry = build_audit_log_entry(audit, run_date)

    AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    if AUDIT_LOG_PATH.exists():
        existing = AUDIT_LOG_PATH.read_text(encoding="utf-8")
        divider = "---\n\n"
        if divider in existing:
            header, rest = existing.split(divider, 1)
            updated = header + divider + new_entry + "\n" + rest
        else:
            updated = existing.rstrip() + "\n\n---\n\n" + new_entry
    else:
        header = (
            "# SI8 News Intelligence -- Run Audit Log\n\n"
            "Internal editorial audit trail for the News Intelligence pipeline "
            "(SI8-INTEL-NEWS-4C). Records what every retrieved Development "
            "candidate WAS -- title, cluster, source count, and the pipeline's "
            "own triage/priority disposition and rationale -- so a human can "
            "review admitted vs. rejected material after a run.\n\n"
            "This is an internal engineering/editorial record, not marketing "
            "content (see DIGEST-LOG.md for that), and not Living Knowledge: "
            "nothing here is a governed proposition, and nothing here is read "
            "by CRC, Living Knowledge, or any automated downstream decision. "
            "It is a durable record of decisions the pipeline already made, "
            "not a new decision of its own.\n\n"
            "**Auto-updated** by the digest script via GitHub Actions, "
            "alongside DIGEST-LOG.md.\n\n"
            "---\n\n"
        )
        updated = header + new_entry

    AUDIT_LOG_PATH.write_text(updated, encoding="utf-8")
    print(f"Audit log updated: {AUDIT_LOG_PATH}")


# ---------------------------------------------------------------------------
# 8. Main (SI8-INTEL-NEWS-4B production cutover)
# ---------------------------------------------------------------------------
#
# Authoritative live pipeline:
#   fetch_all_articles (provenance-enriched)
#     -> score_articles (coarse in-domain triage input only)
#     -> build_developments (grouping)
#     -> triage_developments (resource-allocation admission)
#     -> interpret_development, per admitted Development (bounded interpretation)
#     -> prioritize_developments (authoritative, post-interpretation priority)
#     -> build_intelligence_digest (composition, incl. Executive Summary)
#     -> build_intelligence_email_html (rendering)
#     -> send_email
#     -> update_development_digest_log
#     -> build_run_audit / update_audit_log (SI8-INTEL-NEWS-4C, observability
#        only -- a pure projection of objects already computed above; adds
#        no new call, no new decision, and does not affect the email or
#        DIGEST-LOG.md in any way)
#
# No automatic LinkedIn/Instagram/carousel generation occurs anywhere in
# this path. No Living Knowledge or CRC system is imported or called
# anywhere in this module or any module it imports.

LAST_LOOKBACK_DAYS = 7  # set by main() each run; read by build_development_log_entry


def main():
    global LAST_LOOKBACK_DAYS
    parser = argparse.ArgumentParser(description="SI8 News Intelligence Digest")
    parser.add_argument("--dry-run", action="store_true", help="Build the digest but don't send email")
    parser.add_argument("--lookback", type=int, default=7, help="Days to look back (default: 7)")
    args = parser.parse_args()
    LAST_LOOKBACK_DAYS = args.lookback

    week_str = datetime.now().strftime("%B %d, %Y")
    print(f"\nSI8 News Intelligence — {week_str}")
    print(f"Lookback: {args.lookback} days | Dry run: {args.dry_run}\n")

    print("Step 1: Fetching articles...")
    articles = fetch_all_articles(args.lookback)
    print(f"  → {len(articles)} unique articles\n")

    if not articles:
        print("No articles found. Check network or keyword queries.")
        return

    print("Step 2: Coarse relevance triage-scoring...")
    scored = score_articles(articles)
    print(f"  → scored {len(scored)} articles\n")

    print("Step 3: Grouping articles into Developments...")
    developments = build_developments(scored, client=client)
    print(f"  → {len(developments)} Developments\n")

    print("Step 4: Triage (resource-allocation admission, not materiality)...")
    triage_results = triage_developments(developments)
    admitted_ids = {t.development_id for t in triage_results if t.admitted}
    admitted_developments = [d for d in developments if d.id in admitted_ids]
    print(f"  → {len(admitted_developments)} admitted, "
          f"{len(developments) - len(admitted_developments)} deferred/excluded\n")

    print("Step 5: Bounded interpretation of admitted Developments...")
    interpreted = [
        (d, interpret_development(d, client=client))
        for d in admitted_developments
    ]
    print(f"  → {len(interpreted)} interpreted\n")

    print("Step 6: Authoritative Development priority classification...")
    priorities = prioritize_developments(interpreted, client=client)
    print(f"  → {len(priorities)} classified\n")

    print("Step 7: Composing intelligence digest...")
    digest = build_intelligence_digest(
        developments, triage_results, interpreted, priorities,
        client=client, date_str=week_str,
    )
    print(f"  → {len(digest.high)} HIGH, {len(digest.monitor)} MONITOR, "
          f"{len(digest.lk_product_signals)} LK/product signal(s), "
          f"{len(digest.marketing_opportunities)} marketing opportunity(ies)\n")

    print("Step 8: Rendering email...")
    html = build_intelligence_email_html(digest)

    print("Step 9: Sending email...")
    send_email(html, week_str, dry_run=args.dry_run)

    print("Step 10: Updating Development-level digest log...")
    update_development_digest_log(digest)

    print("Step 11: Updating editorial audit log...")
    audit = build_run_audit(developments, triage_results, priorities, digest, date_str=week_str)
    update_audit_log(audit)
    print(f"  → {audit.excluded_count} excluded, {audit.capacity_deferred_count} capacity-deferred, "
          f"{audit.omit_count} OMIT (audit-only; not shown in email or DIGEST-LOG.md)\n")

    print(f"\n{'='*60}")
    print("DIGEST SUMMARY")
    print(f"{'='*60}")
    print(f"HIGH:      {len(digest.high)}")
    print(f"MONITOR:   {len(digest.monitor)}")
    print(f"Deferred:  {digest.deferred_count}")
    if digest.degraded_notes:
        print(f"Degraded:  {len(digest.degraded_notes)} note(s) -- see email/log")
    print()

    if digest.high:
        print("HIGH developments:")
        for d, _interp, p in digest.high[:10]:
            flag = " [DEGRADED]" if p.degraded else ""
            print(f"  [HIGH{flag}] {d.canonical_title[:70]}")


if __name__ == "__main__":
    main()
