#!/usr/bin/env python3
"""
SI8 LinkedIn ICP Report Digest
--------------------------------
Runs the full LinkedIn ICP analysis against the latest Supabase CSV export
and emails the complete report to jd@superimmersive8.com via Resend.

Runs every 3 days via GitHub Actions (.github/workflows/linkedin-report-digest.yml).

Usage:
  python tools/linkedin-analysis/report_digest.py
  python tools/linkedin-analysis/report_digest.py --dry-run   # print HTML, do not send
"""

import os
import sys
import re
import argparse
import requests
from datetime import datetime, timezone
from pathlib import Path

# Allow importing analyze.py and classify.py from same directory
sys.path.insert(0, str(Path(__file__).parent))
from analyze import load_csv, generate_report, find_latest_csv
from classify import classify_reply, is_product_feedback

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
TO_EMAIL       = os.environ.get("DIGEST_TO_EMAIL",   "jd@superimmersive8.com")
FROM_EMAIL     = os.environ.get("DIGEST_FROM_EMAIL", "digest@superimmersive8.com")


# ---------------------------------------------------------------------------
# Markdown → HTML converter (handles the subset used in the ICP report)
# ---------------------------------------------------------------------------

def md_to_html(md: str) -> str:
    """Convert ICP report markdown to clean HTML email body."""
    lines = md.split("\n")
    out = []
    in_table = False
    table_buf = []

    def flush_table():
        if not table_buf:
            return ""
        html = ['<table border="1" cellpadding="5" cellspacing="0" '
                'style="border-collapse:collapse;font-size:13px;width:100%;">']
        for i, row in enumerate(table_buf):
            cells = [c.strip() for c in row.strip().strip("|").split("|")]
            if i == 1 and all(re.match(r'^[-: ]+$', c) for c in cells):
                continue  # skip separator row
            tag = "th" if i == 0 else "td"
            html.append("<tr>" + "".join(f"<{tag} style='padding:4px 8px;border:1px solid #ddd;'>{c}</{tag}>" for c in cells) + "</tr>")
        html.append("</table>")
        return "\n".join(html)

    for line in lines:
        # Table row detection
        if line.strip().startswith("|"):
            if not in_table:
                in_table = True
                table_buf = []
            table_buf.append(line)
            continue
        else:
            if in_table:
                out.append(flush_table())
                table_buf = []
                in_table = False

        # Headings
        if line.startswith("#### "):
            out.append(f"<h4 style='margin:16px 0 6px;color:#1a1918;'>{_inline(line[5:])}</h4>")
        elif line.startswith("### "):
            out.append(f"<h3 style='margin:20px 0 8px;color:#1a1918;'>{_inline(line[4:])}</h3>")
        elif line.startswith("## "):
            out.append(f"<h2 style='margin:28px 0 10px;color:#1a1918;border-bottom:2px solid #C8900A;padding-bottom:4px;'>{_inline(line[3:])}</h2>")
        elif line.startswith("# "):
            out.append(f"<h1 style='margin:0 0 16px;color:#1a1918;'>{_inline(line[2:])}</h1>")
        # Horizontal rule
        elif line.strip() == "---":
            out.append("<hr style='border:none;border-top:1px solid #e5e5e5;margin:20px 0;'>")
        # Blockquote (warm reply excerpts)
        elif line.startswith("> "):
            out.append(f"<blockquote style='border-left:3px solid #C8900A;margin:6px 0 6px 0;padding:4px 12px;color:#555;font-style:italic;'>{_inline(line[2:])}</blockquote>")
        # Bullet
        elif line.startswith("- ") or line.startswith("* "):
            out.append(f"<li style='margin:3px 0;'>{_inline(line[2:])}</li>")
        # Numbered list
        elif re.match(r'^\d+\. ', line):
            content = re.sub(r'^\d+\. ', '', line)
            out.append(f"<li style='margin:3px 0;'>{_inline(content)}</li>")
        # Empty line
        elif line.strip() == "":
            out.append("<br>")
        # Plain paragraph
        else:
            out.append(f"<p style='margin:4px 0;'>{_inline(line)}</p>")

    if in_table:
        out.append(flush_table())

    return "\n".join(out)


def _inline(text: str) -> str:
    """Apply inline markdown: bold, italic, code, links."""
    # Bold+italic
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'<strong><em>\1</em></strong>', text)
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Italic
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    # Inline code
    text = re.sub(r'`([^`]+)`', r'<code style="background:#f5f5f5;padding:1px 4px;border-radius:3px;font-size:12px;">\1</code>', text)
    # Links
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    return text


def build_email_html(report_md: str, rows: list, csv_name: str) -> str:
    """Wrap converted report in an email shell."""
    n_total = len(rows)
    n_warm  = sum(1 for r in rows if r['_class'] == 'warm')
    n_fb    = sum(1 for r in rows if r['_product_feedback'] and r['_class'] != 'warm')
    today   = datetime.now(timezone.utc).strftime("%B %d, %Y")

    body_html = md_to_html(report_md)

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Inter',Arial,sans-serif;color:#1a1918;">
  <div style="max-width:860px;margin:24px auto;background:#FAFAF7;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1a1918;padding:24px 32px;">
      <div style="color:#C8900A;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">SI8 Sales Intelligence</div>
      <div style="color:#FAFAF7;font-size:22px;font-weight:700;">LinkedIn ICP Report</div>
      <div style="color:#888;font-size:13px;margin-top:4px;">{today} · {csv_name}</div>
    </div>

    <!-- Summary bar -->
    <div style="background:#f0ede6;padding:16px 32px;display:flex;gap:32px;border-bottom:1px solid #e5e0d8;">
      <div style="text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#1a1918;">{n_total}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Responses</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#C8900A;">{n_warm}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Warm (Sales)</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#4a7c59;">{n_fb}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Product Feedback</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#555;">{n_warm/n_total*100:.0f}%</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Warm Rate</div>
      </div>
    </div>

    <!-- Report body -->
    <div style="padding:24px 32px;font-size:14px;line-height:1.6;">
      {body_html}
    </div>

    <!-- Footer -->
    <div style="background:#f0ede6;padding:16px 32px;text-align:center;font-size:12px;color:#888;border-top:1px solid #e5e0d8;">
      Generated by SI8 Sales Intelligence · <a href="https://app.superimmersive8.com" style="color:#C8900A;">app.superimmersive8.com</a>
    </div>

  </div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Send via Resend
# ---------------------------------------------------------------------------

def send_email(subject: str, html: str) -> bool:
    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "python-resend/1.0",
        },
        json={
            "from": FROM_EMAIL,
            "to": [TO_EMAIL],
            "subject": subject,
            "html": html,
        },
        timeout=30,
    )
    if resp.status_code in (200, 201):
        print(f"✅ Email sent to {TO_EMAIL} (status {resp.status_code})")
        return True
    else:
        print(f"❌ Resend error {resp.status_code}: {resp.text}")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print HTML, do not send email")
    parser.add_argument("--csv", help="Path to CSV (default: latest in data/supabase-exports/)")
    args = parser.parse_args()

    csv_path = args.csv or find_latest_csv()
    print(f"Loading: {csv_path}")

    rows = load_csv(csv_path)
    print(f"Loaded {len(rows)} responses")

    report_md = generate_report(rows, csv_path)

    n_warm = sum(1 for r in rows if r['_class'] == 'warm')
    n_fb   = sum(1 for r in rows if r['_product_feedback'] and r['_class'] != 'warm')
    today  = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    csv_name = Path(csv_path).name
    subject = f"SI8 LinkedIn ICP Report — {today} · {len(rows)} responses · {n_warm} warm · {n_fb} product feedback"

    html = build_email_html(report_md, rows, csv_name)

    if args.dry_run:
        print(f"\nSubject: {subject}")
        print(f"HTML length: {len(html)} chars")
        print("\n--- MARKDOWN PREVIEW (first 2000 chars) ---")
        print(report_md[:2000])
        return

    if not RESEND_API_KEY:
        print("ERROR: RESEND_API_KEY not set")
        sys.exit(1)

    send_email(subject, html)


if __name__ == "__main__":
    main()
