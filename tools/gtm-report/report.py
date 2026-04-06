#!/usr/bin/env python3
"""
SI8 Weekly GTM + GA4 Report
----------------------------
Every Monday morning:
1. Pulls 7-day GA4 data via Data API (OAuth2 refresh token)
2. Sends raw metrics + ICP context to Claude for GTM analysis
3. Emails structured HTML report via Resend to jd@superimmersive8.com

Usage:
  python report.py                  # run normally
  python report.py --dry-run        # build email, write to /tmp/si8-gtm-preview.html, don't send
  python report.py --lookback 14    # extend lookback window
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.parse
import ssl
from datetime import datetime, timezone

import requests
from anthropic import Anthropic

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

GA4_PROPERTY_ID = os.environ.get("GA4_PROPERTY_ID", "326271463")
GA4_CLIENT_ID = os.environ["GA4_CLIENT_ID"]
GA4_CLIENT_SECRET = os.environ["GA4_CLIENT_SECRET"]
GA4_REFRESH_TOKEN = os.environ["GA4_REFRESH_TOKEN"]

RESEND_API_KEY = os.environ["RESEND_API_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
TO_EMAIL = os.environ.get("GTM_TO_EMAIL", "jd@superimmersive8.com")
FROM_EMAIL = os.environ.get("GTM_FROM_EMAIL", "digest@superimmersive8.com")

client = Anthropic(api_key=ANTHROPIC_API_KEY)

# ---------------------------------------------------------------------------
# 1. GA4 Auth — refresh access token
# ---------------------------------------------------------------------------

def get_access_token() -> str:
    """Exchange refresh token for a fresh access token."""
    data = urllib.parse.urlencode({
        "client_id": GA4_CLIENT_ID,
        "client_secret": GA4_CLIENT_SECRET,
        "refresh_token": GA4_REFRESH_TOKEN,
        "grant_type": "refresh_token",
    }).encode()

    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    try:
        ssl_ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ssl_ctx) as r:
            return json.loads(r.read())["access_token"]
    except Exception as e:
        print(f"Fatal: could not refresh GA4 token: {e}", file=sys.stderr)
        raise


# ---------------------------------------------------------------------------
# 2. GA4 Data API queries
# ---------------------------------------------------------------------------

def run_report(token: str, body: dict) -> dict:
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport"
    resp = requests.post(
        url,
        json=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=30,
    )
    if not resp.ok:
        print(f"  Warning: GA4 report failed {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
        return {}
    return resp.json()


def parse_rows(result: dict) -> list[dict]:
    """Convert GA4 runReport result into a list of {dimension: value, metric: value} dicts."""
    if not result:
        return []
    dim_headers = [h["name"] for h in result.get("dimensionHeaders", [])]
    met_headers = [h["name"] for h in result.get("metricHeaders", [])]
    rows = []
    for row in result.get("rows", []):
        d = {dim_headers[i]: v["value"] for i, v in enumerate(row.get("dimensionValues", []))}
        d.update({met_headers[i]: v["value"] for i, v in enumerate(row.get("metricValues", []))})
        rows.append(d)
    return rows


def pull_ga4_data(token: str, lookback_days: int) -> dict:
    """Pull all GTM-relevant reports and return structured dict."""
    date_range = [{"startDate": f"{lookback_days}daysAgo", "endDate": "today"}]
    print(f"  Pulling GA4 data (last {lookback_days} days)...")

    # Traffic by source
    r_traffic = parse_rows(run_report(token, {
        "dateRanges": date_range,
        "dimensions": [{"name": "sessionSource"}],
        "metrics": [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "engagementRate"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": 10,
    }))

    # Top pages
    r_pages = parse_rows(run_report(token, {
        "dateRanges": date_range,
        "dimensions": [{"name": "pagePath"}],
        "metrics": [{"name": "screenPageViews"}, {"name": "averageSessionDuration"}, {"name": "bounceRate"}],
        "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
        "limit": 15,
    }))

    # Custom events (conversions + engagement)
    r_events = parse_rows(run_report(token, {
        "dateRanges": date_range,
        "dimensions": [{"name": "eventName"}],
        "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        "limit": 20,
    }))

    # Geography
    r_geo = parse_rows(run_report(token, {
        "dateRanges": date_range,
        "dimensions": [{"name": "country"}],
        "metrics": [{"name": "activeUsers"}, {"name": "sessions"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": 12,
    }))

    # Device
    r_device = parse_rows(run_report(token, {
        "dateRanges": date_range,
        "dimensions": [{"name": "deviceCategory"}],
        "metrics": [{"name": "sessions"}, {"name": "engagementRate"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
    }))

    # Landing pages (where do people enter?)
    r_landing = parse_rows(run_report(token, {
        "dateRanges": date_range,
        "dimensions": [{"name": "landingPage"}],
        "metrics": [{"name": "sessions"}, {"name": "bounceRate"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": 10,
    }))

    return {
        "traffic_sources": r_traffic,
        "top_pages": r_pages,
        "events": r_events,
        "geography": r_geo,
        "devices": r_device,
        "landing_pages": r_landing,
    }


# ---------------------------------------------------------------------------
# 3. Claude GTM analysis
# ---------------------------------------------------------------------------

GTM_CONTEXT = """
SuperImmersive 8 (SI8) is an AI video rights verification service based in Taipei.

PRODUCTS:
- Creator Record ($29): Self-attested Chain of Title documentation. Route: /record. Auto-approved, PDF delivered instantly. Funnel mechanism.
- SI8 Certified ($499): 90-minute human review. Route: /certify. Delivers Chain of Title document accepted by brand legal teams and E&O insurers.

CURRENT GTM:
- Primary channel: LinkedIn outbound to Creative Directors, Heads of Production, EPs at creative agencies (10–200 employees) in London (primary) and Singapore (secondary)
- Secondary: Instagram outreach to AI filmmakers/creators for Creator Record ($29)
- Pain being sold: Brand legal teams and E&O insurers are blocking AI video campaigns because there is no Chain of Title documentation
- Geographic focus: London, Singapore, and EU agencies facing EU AI Act Article 50 deadline (August 2, 2026)
- Current personas responding: agency CDs/EPs, AI influencer agency builders (new), EU-facing production studios (new)

KEY CONVERSION FUNNEL EVENTS (GA4):
- get_verified_click: clicks on "Get Verified" / "Get Certified" CTAs
- creator_record_click: clicks on Creator Record ($29) CTAs
- view_sample_click: clicks to view sample Chain of Title
- book_call_click: Calendly booking clicks
- request_demo_submit: Demo request form submissions (real leads since April 4 spam fix)
- checkout_started: Arrived at Stripe checkout page ($29 or $499)

CURRENT HYPOTHESES TO VALIDATE:
1. LinkedIn traffic is highest quality (lowest bounce)
2. /sample page drives highest engagement and is key bottom-of-funnel tool
3. Mobile traffic doesn't convert (form/checkout friction)
4. EU traffic is growing (Campaign G — EU AI Act deadline angle)
5. 17 checkout_started in prior period — need to know if any converted
"""

ANALYSIS_PROMPT = """You are the GTM analyst for SuperImmersive 8 (SI8). Here is the company context:

{context}

Here is the GA4 data for the past {lookback} days (today: {today}):

{data}

Produce a weekly GTM analysis with these sections:

**1. TRAFFIC SNAPSHOT** — 3-5 bullet points summarizing what the traffic data shows. Include total sessions, top sources, and any notable shifts.

**2. FUNNEL PERFORMANCE** — Analyze the conversion events. Which events fired, how many times, and what does that mean for the funnel? Focus on checkout_started, get_verified_click, creator_record_click, request_demo_submit. If an event has 0 count, call it out — it may mean a tracking gap or a dead funnel stage.

**3. PAGE INSIGHTS** — Which pages are working? Which aren't? Use dwell time and bounce rate alongside pageviews. Call out /sample, /record, /certify, /pricing, and homepage specifically.

**4. GEOGRAPHY SIGNALS** — Where is the traffic coming from? Does it align with current LinkedIn targeting (London, Singapore, EU)?

**5. GTM HYPOTHESIS CHECK** — For each of the 5 current hypotheses, state: CONFIRMED / MIXED SIGNAL / NOT CONFIRMED / NO DATA. One sentence of evidence for each.

**6. THIS WEEK'S ACTIONS** — 3-5 specific, concrete actions for the week ahead based on the data. Be prescriptive — "test X" or "add Y" not "consider whether."

Be direct and analytical. No filler. If the data is thin (low traffic), say so clearly — early-stage data is still useful signal. Format for an email — clean, scannable."""


def generate_analysis(data: dict, lookback_days: int) -> str:
    """Send GA4 data to Claude and return GTM analysis text."""
    data_str = json.dumps(data, indent=2)
    today_str = datetime.now().strftime("%B %d, %Y")

    prompt = ANALYSIS_PROMPT.format(
        context=GTM_CONTEXT,
        lookback=lookback_days,
        today=today_str,
        data=data_str,
    )

    print("  Generating GTM analysis with Claude...")
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=3500,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


# ---------------------------------------------------------------------------
# 4. Build HTML email
# ---------------------------------------------------------------------------

def format_analysis_as_html(analysis_text: str) -> str:
    """Convert Claude's markdown-style analysis into HTML sections."""
    import re

    # Convert **SECTION HEADERS** to styled h3
    html = re.sub(
        r"\*\*(\d+\. [A-Z &]+)\*\*",
        r'<h3 style="color:#1a1918;font-size:14px;font-weight:700;margin:24px 0 10px;'
        r'padding-bottom:6px;border-bottom:1px solid #e5e5e5;letter-spacing:0.3px;">\1</h3>',
        analysis_text,
    )

    # Bold inline text
    html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)

    # Convert bullet points
    lines = html.split("\n")
    out_lines = []
    in_list = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("- "):
            if not in_list:
                out_lines.append('<ul style="margin:8px 0;padding-left:20px;">')
                in_list = True
            out_lines.append(
                f'<li style="margin:5px 0;color:#333;font-size:13px;line-height:1.5;">{stripped[2:]}</li>'
            )
        else:
            if in_list:
                out_lines.append("</ul>")
                in_list = False
            if stripped:
                if stripped.startswith("<h3"):
                    out_lines.append(stripped)
                else:
                    out_lines.append(
                        f'<p style="margin:8px 0;color:#333;font-size:13px;line-height:1.5;">{stripped}</p>'
                    )

    if in_list:
        out_lines.append("</ul>")

    return "\n".join(out_lines)


def build_email_html(analysis_text: str, data: dict, week_str: str, lookback_days: int) -> str:
    analysis_html = format_analysis_as_html(analysis_text)

    # Build a compact data summary table
    total_sessions = sum(
        int(r.get("sessions", 0)) for r in data.get("traffic_sources", [])
    )
    total_users = sum(
        int(r.get("activeUsers", 0)) for r in data.get("traffic_sources", [])
    )

    event_counts = {
        r["eventName"]: int(r.get("eventCount", 0))
        for r in data.get("events", [])
    }
    key_events = [
        "get_verified_click", "creator_record_click", "view_sample_click",
        "book_call_click", "request_demo_submit", "checkout_started",
    ]

    event_rows = ""
    for ev in key_events:
        count = event_counts.get(ev, 0)
        color = "#C8900A" if count > 0 else "#bbb"
        event_rows += (
            f'<tr>'
            f'<td style="padding:5px 10px;font-size:12px;color:#444;border-bottom:1px solid #f0f0f0;">{ev}</td>'
            f'<td style="padding:5px 10px;font-size:12px;font-weight:700;color:{color};'
            f'border-bottom:1px solid #f0f0f0;text-align:right;">{count}</td>'
            f'</tr>'
        )

    top_sources = ""
    for r in data.get("traffic_sources", [])[:5]:
        src = r.get("sessionSource", "—")
        sess = r.get("sessions", "0")
        eng = r.get("engagementRate", "0")
        try:
            eng_pct = f"{float(eng)*100:.0f}%"
        except Exception:
            eng_pct = "—"
        top_sources += (
            f'<tr>'
            f'<td style="padding:5px 10px;font-size:12px;color:#444;border-bottom:1px solid #f0f0f0;">{src}</td>'
            f'<td style="padding:5px 10px;font-size:12px;text-align:right;border-bottom:1px solid #f0f0f0;">{sess}</td>'
            f'<td style="padding:5px 10px;font-size:12px;text-align:right;border-bottom:1px solid #f0f0f0;">{eng_pct}</td>'
            f'</tr>'
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#FAFAF7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:660px;margin:0 auto;">

    <!-- Header -->
    <div style="background:#1a1918;border-radius:8px 8px 0 0;padding:24px 28px;">
      <div style="color:#C8900A;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">SuperImmersive 8</div>
      <div style="color:#fff;font-size:20px;font-weight:700;margin-top:4px;">Weekly GTM + Analytics Report</div>
      <div style="color:#aaa;font-size:12px;margin-top:4px;">{week_str} &nbsp;&middot;&nbsp; Last {lookback_days} days &nbsp;&middot;&nbsp; GA4 Property 326271463</div>
    </div>

    <!-- Body -->
    <div style="background:#fff;border-radius:0 0 8px 8px;padding:24px 28px;box-shadow:0 2px 6px rgba(0,0,0,0.07);">

      <!-- Data snapshot row -->
      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">

        <div style="flex:1;min-width:140px;background:#f9f9f6;border-radius:6px;padding:14px 16px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#1a1918;">{total_sessions}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Sessions</div>
        </div>

        <div style="flex:1;min-width:140px;background:#f9f9f6;border-radius:6px;padding:14px 16px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#1a1918;">{total_users}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Active Users</div>
        </div>

        <div style="flex:1;min-width:140px;background:#f9f9f6;border-radius:6px;padding:14px 16px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#C8900A;">{event_counts.get('checkout_started', 0)}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Checkout Started</div>
        </div>

        <div style="flex:1;min-width:140px;background:#f9f9f6;border-radius:6px;padding:14px 16px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#C8900A;">{event_counts.get('request_demo_submit', 0)}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Demo Requests</div>
        </div>

      </div>

      <!-- Side-by-side tables -->
      <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">

        <div style="flex:1;min-width:220px;">
          <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Traffic Sources</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#f5f5f0;">
              <th style="padding:5px 10px;font-size:11px;color:#666;text-align:left;font-weight:600;">Source</th>
              <th style="padding:5px 10px;font-size:11px;color:#666;text-align:right;font-weight:600;">Sessions</th>
              <th style="padding:5px 10px;font-size:11px;color:#666;text-align:right;font-weight:600;">Engaged</th>
            </tr>
            {top_sources}
          </table>
        </div>

        <div style="flex:1;min-width:220px;">
          <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Key Events</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#f5f5f0;">
              <th style="padding:5px 10px;font-size:11px;color:#666;text-align:left;font-weight:600;">Event</th>
              <th style="padding:5px 10px;font-size:11px;color:#666;text-align:right;font-weight:600;">Count</th>
            </tr>
            {event_rows}
          </table>
        </div>

      </div>

      <!-- Claude GTM Analysis -->
      <div style="border-top:2px solid #C8900A;padding-top:20px;margin-top:4px;">
        <div style="font-size:11px;font-weight:700;color:#C8900A;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">GTM Analysis</div>
        <div style="font-size:11px;color:#bbb;margin-bottom:16px;">Generated by Claude · {week_str}</div>
        {analysis_html}
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #eee;margin-top:28px;padding-top:16px;font-size:11px;color:#bbb;text-align:center;">
        SI8 GTM Report &nbsp;&middot;&nbsp; PMF Strategy Inc. d/b/a SuperImmersive 8 &nbsp;&middot;&nbsp; Automated weekly report<br>
        To update targeting context: <code>tools/gtm-report/report.py</code> → <code>GTM_CONTEXT</code>
      </div>

    </div>
  </div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# 5. Send via Resend
# ---------------------------------------------------------------------------

def send_email(html: str, week_str: str, dry_run: bool = False) -> bool:
    if dry_run:
        preview_path = "/tmp/si8-gtm-preview.html"
        with open(preview_path, "w") as f:
            f.write(html)
        print(f"\n[DRY RUN] HTML preview written to {preview_path}")
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
            "subject": f"SI8 GTM Snapshot — {week_str}",
            "html": html,
        },
        timeout=15,
    )

    if response.status_code in (200, 201):
        print(f"✓ GTM report sent to {TO_EMAIL}")
        return True
    else:
        print(f"✗ Email failed: {response.status_code} {response.text}", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
# 6. Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="SI8 Weekly GTM + GA4 Report")
    parser.add_argument("--dry-run", action="store_true", help="Build email but don't send")
    parser.add_argument("--lookback", type=int, default=7, help="Days to look back (default: 7)")
    args = parser.parse_args()

    week_str = datetime.now().strftime("%B %d, %Y")
    print(f"\nSI8 GTM Report — {week_str}")
    print(f"Lookback: {args.lookback} days | Dry run: {args.dry_run}\n")

    # Step 1: Auth
    print("Step 1: Authenticating with GA4...")
    token = get_access_token()
    print("  ✓ Token refreshed\n")

    # Step 2: Pull data
    print("Step 2: Pulling GA4 data...")
    data = pull_ga4_data(token, args.lookback)
    total_events = sum(int(r.get("eventCount", 0)) for r in data.get("events", []))
    print(f"  ✓ {sum(int(r.get('sessions','0')) for r in data.get('traffic_sources',[]))} sessions, {total_events} events\n")

    # Step 3: Claude analysis
    print("Step 3: Generating GTM analysis...")
    analysis = generate_analysis(data, args.lookback)
    print("  ✓ Analysis complete\n")

    # Step 4: Build email
    print("Step 4: Building HTML email...")
    html = build_email_html(analysis, data, week_str, args.lookback)

    # Step 5: Send
    print("Step 5: Sending email...")
    send_email(html, week_str, dry_run=args.dry_run)

    print("\nDone.")


if __name__ == "__main__":
    main()
