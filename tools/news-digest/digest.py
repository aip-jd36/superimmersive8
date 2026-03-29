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

            summary = entry.get("summary", "")
            # Strip HTML tags from summary (feedparser sometimes includes them)
            import re
            summary = re.sub(r"<[^>]+>", "", summary)[:400].strip()

            articles.append({
                "title": title,
                "url": entry.get("link", ""),
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
- draft_hook: if action includes post_linkedin, a 1-sentence LinkedIn hook in JD's voice (founder, direct, no fluff) — null if not applicable

Return ONLY a valid JSON array with exactly {n} objects in the same order as the input. No prose, no markdown fences.

Example:
[
  {{
    "relevance_score": 9,
    "relevance_reason": "E&O insurers adding AI video exclusions directly validates SI8's core pain point and gives JD a timely hook.",
    "action": "post_and_update",
    "doc_to_update": "COMPETITIVE_ANALYSIS_CAAS_2026.md",
    "draft_hook": "E&O insurers are now excluding AI video from standard media policies. This is exactly the moment Chain of Title documentation becomes non-negotiable."
  }}
]

Articles:

{articles}"""


def score_batch(articles: list[dict]) -> list[dict]:
    """Score a batch of articles with Claude haiku. Returns articles with score fields added."""
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
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )

        result_text = response.content[0].text.strip()

        # Strip markdown code fences if present
        if "```" in result_text:
            import re
            match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", result_text)
            if match:
                result_text = match.group(1)

        scores = json.loads(result_text)

        for article, score_data in zip(articles, scores):
            article.update({
                "relevance_score": score_data.get("relevance_score", 0),
                "relevance_reason": score_data.get("relevance_reason", ""),
                "action": score_data.get("action", "skip"),
                "doc_to_update": score_data.get("doc_to_update"),
                "draft_hook": score_data.get("draft_hook"),
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
    score = a.get("relevance_score", 0)
    action = a.get("action", "skip")
    badge = ACTION_BADGES.get(action, "")
    score_color = SCORE_COLORS.get(score, "#999")
    doc = a.get("doc_to_update")
    hook = a.get("draft_hook")

    pub = a.get("published", "")[:16]

    doc_line = (
        f'<p style="margin:6px 0 0;font-size:12px;color:#666;">'
        f'<strong>→ Update:</strong> <code style="background:#f0f0f0;padding:1px 4px;'
        f'border-radius:2px;font-size:11px;">{doc}</code></p>'
    ) if doc else ""

    hook_block = (
        f'<div style="background:#fffbf0;border-left:3px solid #C8900A;padding:8px 12px;'
        f'margin-top:10px;font-size:13px;color:#5a3e00;font-style:italic;">'
        f'<strong style="font-style:normal;">Draft hook:</strong> {hook}</div>'
    ) if hook else ""

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
      {hook_block}
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
            "subject": f"SI8 Intel Digest — {week_str}",
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
