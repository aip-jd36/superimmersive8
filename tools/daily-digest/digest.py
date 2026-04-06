#!/usr/bin/env python3
"""
SI8 Daily Operations Digest
- Reads CRM.md pipeline block for lead task list
- Auto-calculates or uses explicit follow_up_by dates
- Pulls GA4 yesterday snapshot
- Claude Haiku: task prioritization + ICP signal analysis
- Sends HTML email via Resend to jd@superimmersive8.com
"""

import json, os, re, ssl, sys, urllib.request, urllib.parse
from datetime import date, timedelta
import certifi

# ── Config ────────────────────────────────────────────────────────────────────
GA4_PROPERTY    = "326271463"
ADMIN_EMAIL     = "jd@superimmersive8.com"
CRM_PATH        = os.path.join(os.path.dirname(__file__), "../../03_Sales/CRM.md")
DAYS_UNTIL_DUE  = {'HIGH': 3, 'MEDIUM': 5, 'LOW': 14}
ssl_ctx         = ssl.create_default_context(cafile=certifi.where())

def http_post(url, data, headers):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method='POST')
    return json.loads(urllib.request.urlopen(req, context=ssl_ctx).read())

# ── GA4 ───────────────────────────────────────────────────────────────────────
def get_ga4_token():
    data = urllib.parse.urlencode({
        'client_id':     os.environ['GA4_CLIENT_ID'],
        'client_secret': os.environ['GA4_CLIENT_SECRET'],
        'refresh_token': os.environ['GA4_REFRESH_TOKEN'],
        'grant_type':    'refresh_token',
    }).encode()
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data, method='POST')
    return json.loads(urllib.request.urlopen(req, context=ssl_ctx).read())['access_token']

def ga4_report(token, body):
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    req = urllib.request.Request(
        f'https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY}:runReport',
        data=json.dumps(body).encode(), headers=headers, method='POST'
    )
    return json.loads(urllib.request.urlopen(req, context=ssl_ctx).read())

def get_yesterday_ga4(token):
    # Totals
    r1 = ga4_report(token, {
        "dateRanges": [{"startDate": "yesterday", "endDate": "yesterday"}],
        "metrics": [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "newUsers"}],
    })
    totals = {}
    if r1.get('rows'):
        mv = r1['rows'][0]['metricValues']
        totals = {'sessions': mv[0]['value'], 'active_users': mv[1]['value'], 'new_users': mv[2]['value']}

    # Events
    r2 = ga4_report(token, {
        "dateRanges": [{"startDate": "yesterday", "endDate": "yesterday"}],
        "dimensions": [{"name": "eventName"}],
        "metrics":    [{"name": "eventCount"}],
    })
    events = {r['dimensionValues'][0]['value']: int(r['metricValues'][0]['value']) for r in r2.get('rows', [])}

    return totals, events

# ── CRM Parsing ───────────────────────────────────────────────────────────────
def parse_pipeline(crm):
    match = re.search(r'<!-- pipeline:start -->(.*?)<!-- pipeline:end -->', crm, re.DOTALL)
    if not match:
        return []
    lines = [l for l in match.group(1).strip().split('\n')
             if l.startswith('|') and not re.match(r'\|[-\s|]+\|', l)]
    if len(lines) < 2:
        return []
    headers = [h.strip().lower().replace(' ', '_') for h in lines[0].split('|')[1:-1]]
    leads = []
    for line in lines[1:]:
        cells = [c.strip() for c in line.split('|')[1:-1]]
        if len(cells) == len(headers):
            leads.append(dict(zip(headers, cells)))
    return leads

def get_icp_section(crm):
    m = re.search(r'## SECTION 3 — ICP Analysis(.*?)## SECTION 4', crm, re.DOTALL)
    return m.group(1).strip()[:3500] if m else ''

def days_since(date_str, today):
    try:
        return (today - date.fromisoformat(date_str)).days
    except:
        return 0

def is_due(lead, today):
    """Returns (due: bool, days_overdue: int)"""
    urgency      = lead.get('urgency', 'MEDIUM').upper()
    follow_up_by = lead.get('follow_up_by', '—').strip()
    last_date    = lead.get('last_action_date', '').strip()

    if urgency == 'MONITOR':
        return False, 0

    # Explicit date
    if follow_up_by and follow_up_by != '—':
        try:
            due = date.fromisoformat(follow_up_by)
            overdue = max(0, (today - due).days)
            return due <= today, overdue
        except:
            pass

    # Auto-calculate
    if last_date and last_date != '—':
        try:
            threshold = DAYS_UNTIL_DUE.get(urgency, 5)
            due = date.fromisoformat(last_date) + timedelta(days=threshold)
            overdue = max(0, (today - due).days)
            return due <= today, overdue
        except:
            pass

    return False, 0

# ── Claude ────────────────────────────────────────────────────────────────────
def claude_digest(urgent, followup, awaiting, icp_section, ga4_text, today_str):
    def fmt_leads(lst):
        if not lst:
            return '  (none)'
        rows = []
        for l in lst:
            overdue = f' [OVERDUE {l["_overdue"]}d]' if l.get('_overdue', 0) > 0 else ''
            rows.append(
                f'  • {l["name"]} | {l["company"]} ({l["type"]}) | {l["stage"]}'
                f' | Last contact: {l["last_action_date"]}{overdue}'
                f'\n    Last: {l["last_action"]}'
                f'\n    Next: {l["next_action"]}'
            )
        return '\n'.join(rows)

    leads_block = (
        f'🔥 URGENT / OVERDUE:\n{fmt_leads(urgent)}\n\n'
        f'🟡 DUE SOON (within 48h):\n{fmt_leads(followup)}\n\n'
        f'⏳ AWAITING (no action needed today):\n{fmt_leads(awaiting)}'
    )

    prompt = f"""You are the daily sales intelligence assistant for SuperImmersive 8 (SI8).

SI8 sells: $499 SI8 Certified — 90-min human review, Chain of Title documentation for AI video, accepted by brand legal teams and E&O insurers. Also $29 Creator Record (self-attested).

Today: {today_str}

## ACTIVE PIPELINE
{leads_block}

## CURRENT ICP THESIS
{icp_section}

## GA4 YESTERDAY
{ga4_text}

---
Write a daily operations digest. Be direct and specific. No fluff.

### TODAY'S ACTION LIST
For each 🔥 lead: one specific action sentence (what to write/send/say).
For each 🟡 lead: one specific action sentence.
List ⏳ leads as a compact comma-separated line — no descriptions needed.
Skip MONITOR leads unless something is notable.

### ICP SIGNAL CHECK
3-5 tight bullets. For each new/recent response pattern:
- CONFIRMS: [what the ICP says] because [evidence]
- CHALLENGES: [what the ICP says] because [evidence]
- NEW SIGNAL: [unexpected pattern worth testing]
End with one sentence: "Overall ICP confidence: HIGH / MEDIUM / LOW — [one reason]"

### GA4 PULSE
2 sentences max. Flag anything notable. If quiet, say so."""

    headers = {
        'x-api-key':          os.environ['ANTHROPIC_API_KEY'],
        'anthropic-version':  '2023-06-01',
        'content-type':       'application/json',
    }
    body = {
        'model':      'claude-haiku-4-5-20251001',
        'max_tokens': 1600,
        'messages':   [{'role': 'user', 'content': prompt}],
    }
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=json.dumps(body).encode(), headers=headers, method='POST'
    )
    return json.loads(urllib.request.urlopen(req, context=ssl_ctx).read())['content'][0]['text']

# ── Email ─────────────────────────────────────────────────────────────────────
def build_html(analysis, today_str, totals, events):
    def tile(value, label, color='#1a1918'):
        return f'''<div style="flex:1;padding:14px 16px;text-align:center;border-right:1px solid #eee">
      <div style="font-size:22px;font-weight:700;color:{color}">{value}</div>
      <div style="font-size:11px;color:#888;margin-top:2px">{label}</div>
    </div>'''

    sessions   = totals.get('sessions', '—')
    new_users  = totals.get('new_users', '—')
    checkouts  = events.get('checkout_started', 0)
    purchases  = events.get('purchase', 0)

    # Convert analysis markdown to HTML
    html_body = analysis
    html_body = re.sub(r'### (.+)', r'<h3 style="color:#1a1918;font-size:14px;margin:20px 0 6px;border-bottom:1px solid #eee;padding-bottom:4px">\1</h3>', html_body)
    html_body = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html_body)
    html_body = html_body.replace('\n', '<br>')

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'Inter',Arial,sans-serif;background:#FAFAF7;margin:0;padding:20px">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid rgba(0,0,0,0.08);overflow:hidden">

  <div style="background:#1a1918;padding:16px 24px;display:flex;justify-content:space-between;align-items:center">
    <span style="color:#C8900A;font-weight:700;font-size:15px">SuperImmersive 8 &nbsp;<span style="color:#555;font-weight:400;font-size:12px">Daily Digest</span></span>
    <span style="color:#666;font-size:12px">{today_str}</span>
  </div>

  <div style="display:flex;border-bottom:1px solid #eee">
    {tile(sessions, 'Sessions Yesterday')}
    {tile(new_users, 'New Users')}
    {tile(checkouts, 'Checkouts', '#C8900A')}
    <div style="flex:1;padding:14px 16px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#16a34a">{purchases}</div>
      <div style="font-size:11px;color:#888;margin-top:2px">Purchases</div>
    </div>
  </div>

  <div style="padding:22px 26px;line-height:1.75;color:#1a1918;font-size:14px">
    {html_body}
  </div>

  <div style="padding:14px 26px;border-top:1px solid #eee;font-size:11px;color:#aaa;display:flex;justify-content:space-between">
    <span>SI8 Daily Digest · Taipei</span>
    <a href="https://app.superimmersive8.com/admin" style="color:#C8900A;text-decoration:none">Admin Panel →</a>
  </div>
</div>
</body></html>"""

def send_email(html, today_str, dry_run):
    if dry_run:
        print('── DRY RUN ── email not sent')
        print(html[:800])
        return
    headers = {'Authorization': f'Bearer {os.environ["RESEND_API_KEY"]}', 'Content-Type': 'application/json'}
    r = http_post('https://api.resend.com/emails', {
        'from':    'SI8 Digest <digest@superimmersive8.com>',
        'to':      [ADMIN_EMAIL],
        'subject': f'SI8 Daily — {today_str}',
        'html':    html,
    }, headers)
    print(f'Email sent: {r.get("id", r)}')

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    dry_run  = '--dry-run' in sys.argv
    today    = date.today()
    today_str = today.strftime('%A %b %-d, %Y')
    print(f'SI8 Daily Digest — {today_str}')

    # CRM
    with open(CRM_PATH) as f:
        crm = f.read()
    leads      = parse_pipeline(crm)
    icp_section = get_icp_section(crm)
    print(f'Loaded {len(leads)} pipeline leads')

    # Categorise
    urgent, followup, awaiting = [], [], []
    for lead in leads:
        urgency = lead.get('urgency', '').upper()
        if urgency == 'MONITOR':
            continue
        due, overdue = is_due(lead, today)
        lead['_overdue'] = overdue
        if due and urgency == 'HIGH':
            urgent.append(lead)
        elif due:
            followup.append(lead)
        else:
            awaiting.append(lead)

    print(f'🔥 Urgent: {len(urgent)}  🟡 Follow-up: {len(followup)}  ⏳ Awaiting: {len(awaiting)}')

    # GA4
    totals, events = {}, {}
    try:
        token = get_ga4_token()
        totals, events = get_yesterday_ga4(token)
        print(f'GA4: sessions={totals.get("sessions","?")} new_users={totals.get("new_users","?")}')
    except Exception as e:
        print(f'GA4 error (non-fatal): {e}')

    ga4_text = (
        f"Sessions: {totals.get('sessions','0')}, New users: {totals.get('new_users','0')}, "
        f"Active: {totals.get('active_users','0')}\n"
        f"checkout_started={events.get('checkout_started',0)}, "
        f"purchase={events.get('purchase',0)}, "
        f"get_verified_click={events.get('get_verified_click',0)}, "
        f"creator_record_click={events.get('creator_record_click',0)}"
    )

    # Claude
    print('Running Claude analysis...')
    analysis = claude_digest(urgent, followup, awaiting, icp_section, ga4_text, today_str)

    # Email
    html = build_html(analysis, today_str, totals, events)
    send_email(html, today_str, dry_run)
    print('Done.')

if __name__ == '__main__':
    main()
