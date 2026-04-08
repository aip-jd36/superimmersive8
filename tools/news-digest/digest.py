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
import json
import time
import argparse
import hashlib
import feedparser
import requests
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

from anthropic import Anthropic
from keywords import KEYWORD_CLUSTERS, SI8_CONTEXT

# Path to the digest log relative to this script (tools/news-digest/ → repo root)
REPO_ROOT = Path(__file__).parent.parent.parent
DIGEST_LOG_PATH = REPO_ROOT / "02_Marketing" / "intelligence" / "DIGEST-LOG.md"
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

def fetch_google_news(query: str, lookback_days: int) -> list[dict]:
    """Fetch recent articles from Google News RSS for a search query."""
    encoded = requests.utils.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"

    try:
        feed = feedparser.parse(url)
        articles = []
        cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)

        for entry in feed.entries:
            # Parse publication date
            try:
                pub_date = parsedate_to_datetime(entry.get("published", ""))
                if pub_date.tzinfo is None:
                    pub_date = pub_date.replace(tzinfo=timezone.utc)
                if pub_date < cutoff:
                    continue
            except Exception:
                continue  # Skip entries with unparseable dates

            # Extract source name from title (Google News format: "Title - Source")
            title = entry.get("title", "").strip()
            source = "Unknown"
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                title = parts[0].strip()
                source = parts[1].strip()

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
                "published": entry.get("published", ""),
                "pub_date": pub_date,
                "summary": summary,
            })

        return articles

    except Exception as e:
        print(f"  Warning: RSS fetch failed for '{query}': {e}", file=sys.stderr)
        return []


def fetch_all_articles(lookback_days: int) -> list[dict]:
    """Fetch and deduplicate articles across all keyword clusters."""
    all_articles = []

    for cluster in KEYWORD_CLUSTERS:
        print(f"  Fetching: {cluster['name']}")
        for query in cluster["queries"]:
            articles = fetch_google_news(query, lookback_days)
            all_articles.extend(articles)
            time.sleep(0.3)  # Polite delay between requests

    # Deduplicate by normalized title hash (same article surfaces via multiple queries)
    seen = set()
    unique = []
    for a in all_articles:
        # Normalize title for dedup: lowercase, strip punctuation
        import re
        key = re.sub(r"[^a-z0-9]", "", a["title"].lower())[:80]
        if key and key not in seen:
            seen.add(key)
            unique.append(a)

    # Sort by date descending
    unique.sort(key=lambda x: x.get("pub_date", datetime.min.replace(tzinfo=timezone.utc)), reverse=True)

    return unique


# ---------------------------------------------------------------------------
# 2. Score articles with Claude
# ---------------------------------------------------------------------------

SCORE_PROMPT = """You are an intelligence analyst for SuperImmersive 8 (SI8).

{context}

## SI8 BRAND VOICE SPECIFICATION
{si8_voice}

Assess the following {n} news articles for relevance to SI8's business. For each article, return:

- relevance_score: integer 1–10 (10 = directly impacts SI8's positioning or validates its pain point)
- relevance_reason: 1–2 sentences explaining why this matters (or doesn't) to SI8 specifically
- action: one of:
    "post_linkedin"   — score 7+, has a timely angle JD can post about on LinkedIn
    "update_docs"     — should update SI8's internal research/competitive docs
    "post_and_update" — both of the above
    "monitor"         — relevant context, no immediate action needed (score 4–6)
    "skip"            — not relevant to SI8 (score 1–3)
- doc_to_update: if action includes update_docs, name the specific SI8 file (e.g., "COMPETITIVE_ANALYSIS_CAAS_2026.md", "BUSINESS_PLAN_v4.md", "COMPETITOR-FADEL-ANALYSIS.md") — null if not applicable
- linkedin_post: if action includes post_linkedin, a ready-to-post LinkedIn update for the SI8 company page (not JD personally). 3–5 sentences. Lead with the news signal, connect it to the compliance/documentation gap SI8 solves, end with a direct implication for brands or agencies. Direct, no fluff, no hashtags in the body, no em-dashes. Suitable to copy/paste with minimal editing. null if not applicable.
- linkedin_hashtags: if action includes post_linkedin, 3–5 hashtags for the LinkedIn post. Always include: #AIVideo #ChainOfTitle #ContentCompliance. Add 0–2 from this pool based on article content: #AIRegulation #BrandSafety #GenerativeAI #AIMarketing #EUAIAct #DigitalRights #AIRights #EOInsurance. Return as a single space-separated string. null if not applicable.
- instagram_caption: if action includes post_linkedin, a ready-to-post Instagram caption. Structure: hook line (1 sentence, same idea as Slide 1) → 2–3 expanding lines → 1 line connecting to SI8 or Chain of Title → "→ Link in bio." → hashtags on new line (always #AIVideo #ChainOfTitle #ContentCompliance plus 0–2 dynamic from the same pool above, max 5 total). null if not applicable.
- carousel_slides: if action includes post_linkedin, a 6-slide carousel breakdown as a JSON array. Write for Instagram carousel cards at 1080x1080px — punchy phrases, not prose sentences. Strict word limits per slide: S1 hook (max 8 words), S2–S5 content (max 20 words each, 2–3 short punchy lines), S6 CTA (max 6 words). Format: [{{"slide":1,"type":"hook","text":"max 8 word hook"}},{{"slide":2,"type":"content","label":"THE SIGNAL","text":"max 20 words"}},{{"slide":3,"type":"content","label":"THE GAP","text":"max 20 words"}},{{"slide":4,"type":"content","label":"THE IMPACT","text":"max 20 words"}},{{"slide":5,"type":"si8_angle","label":"WHY THIS MATTERS","text":"max 20 words connecting to Chain of Title"}},{{"slide":6,"type":"cta","text":"max 6 words"}}]. null if not applicable.

Return ONLY a valid JSON array with exactly {n} objects in the same order as the input. No prose, no markdown fences.

Example:
[
  {{
    "relevance_score": 9,
    "relevance_reason": "E&O insurers adding AI video exclusions directly validates SI8's core pain point and gives JD a timely hook.",
    "action": "post_and_update",
    "doc_to_update": "COMPETITIVE_ANALYSIS_CAAS_2026.md",
    "linkedin_post": "E&O insurers are now excluding AI-generated video from standard media liability policies. The reason is straightforward: there is no documented Chain of Title proving who owns what. SI8 Certified provides exactly that documentation -- a structured 90-minute audit that gives insurers and brand legal teams what they need to approve campaigns. If your agency is producing AI video for clients, this is the moment to get documentation in place before your insurer does it for you.",
    "linkedin_hashtags": "#AIVideo #ChainOfTitle #ContentCompliance #EOInsurance #BrandSafety",
    "instagram_caption": "E&O insurers are now excluding AI-generated video from standard media liability policies.\n\nThe reason is simple: no Chain of Title means no proof of what was used to make the content. Brand legal teams and underwriters are asking the same question.\n\nChain of Title documentation is what closes that gap.\n\n→ Link in bio.\n\n#AIVideo #ChainOfTitle #ContentCompliance #EOInsurance #BrandSafety",
    "carousel_slides": [{{"slide":1,"type":"hook","text":"E&O insurers are now excluding AI video"}},{{"slide":2,"type":"content","label":"THE SIGNAL","text":"Standard E&O policies now exclude AI video.\nReason: no proof of what tools made it."}},{{"slide":3,"type":"content","label":"THE GAP","text":"Most agencies can't answer the first question.\nWhich tools? Was training data cleared?"}},{{"slide":4,"type":"content","label":"THE IMPACT","text":"No documentation. No insurance.\nNo insurance. No brand approval."}},{{"slide":5,"type":"si8_angle","label":"WHY THIS MATTERS","text":"Chain of Title closes that gap.\n90-minute review. One PDF. Legal says yes."}},{{"slide":6,"type":"cta","text":"Get your AI video documented"}}]
  }}
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
    """Score a batch of articles with Claude haiku. Returns articles with score fields added."""
    articles_text = "\n\n".join(
        f"[{i+1}] Title: {a['title']}\nSource: {a['source']}\nDate: {a['published']}\nSummary: {a['summary'] or '(no summary)'}"
        for i, a in enumerate(articles)
    )

    prompt = SCORE_PROMPT.format(
        context=SI8_CONTEXT,
        si8_voice=load_voice_spec(),
        n=len(articles),
        articles=articles_text,
    )

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8000,
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
                "relevance_score":   score_data.get("relevance_score", 0),
                "relevance_reason":  score_data.get("relevance_reason", ""),
                "action":            score_data.get("action", "skip"),
                "doc_to_update":     score_data.get("doc_to_update"),
                "linkedin_post":     score_data.get("linkedin_post"),
                "linkedin_hashtags": score_data.get("linkedin_hashtags"),
                "instagram_caption": score_data.get("instagram_caption"),
                "carousel_slides":   score_data.get("carousel_slides"),
            })

        return articles

    except Exception as e:
        print(f"  Warning: Scoring batch failed: {e}", file=sys.stderr)
        for article in articles:
            article.update({
                "relevance_score": 0,
                "relevance_reason": "Scoring unavailable",
                "action": "skip",
                "doc_to_update": None,
                "draft_hook": None,
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
# 3. Build HTML email
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
        Tracking: AI video rights · copyright lawsuits · E&amp;O insurance · brand AI policy · regulatory news · competitor activity (Runway · Kling · Pika · Veo · Adobe · FADEL)
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
        print(f"✓ Digest sent to {TO_EMAIL}")
        return True
    else:
        print(f"✗ Email failed: {response.status_code} {response.text}", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
# 5. Write digest log to repo
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
# 6. Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="SI8 Weekly News Intelligence Digest")
    parser.add_argument("--dry-run", action="store_true", help="Score articles but don't send email")
    parser.add_argument("--lookback", type=int, default=7, help="Days to look back (default: 7)")
    args = parser.parse_args()

    week_str = datetime.now().strftime("%B %d, %Y")
    print(f"\nSI8 Intelligence Digest — {week_str}")
    print(f"Lookback: {args.lookback} days | Dry run: {args.dry_run}\n")

    # Step 1: Fetch
    print("Step 1: Fetching articles...")
    articles = fetch_all_articles(args.lookback)
    print(f"  → {len(articles)} unique articles\n")

    if not articles:
        print("No articles found. Check network or keyword queries.")
        return

    # Step 2: Score
    print("Step 2: Scoring with Claude (claude-haiku-4-5)...")
    scored = score_articles(articles)
    relevant = [a for a in scored if a.get("action", "skip") != "skip"]
    print(f"  → {len(relevant)} relevant (of {len(scored)} scored)\n")

    # Step 3: Build email
    print("Step 3: Building email...")
    html = build_email_html(relevant, week_str, args.lookback)

    # Step 4: Send
    print("Step 4: Sending email...")
    send_email(html, week_str, dry_run=args.dry_run)

    # Step 5: Update digest log
    print("Step 5: Updating digest log...")
    update_digest_log(scored, week_str, args.lookback)

    # Summary
    high = [a for a in relevant if a.get("relevance_score", 0) >= 7]
    mid = [a for a in relevant if 4 <= a.get("relevance_score", 0) <= 6]

    print(f"\n{'='*60}")
    print(f"DIGEST SUMMARY")
    print(f"{'='*60}")
    print(f"High relevance (7-10): {len(high)}")
    print(f"Monitor (4-6):         {len(mid)}")
    print()

    if high:
        print("Top articles:")
        for a in high[:10]:
            print(f"  [{a['relevance_score']}] {a['action']:<18} {a['title'][:60]}")


if __name__ == "__main__":
    main()
