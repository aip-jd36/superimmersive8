#!/usr/bin/env python3
"""GA4 Data API queries using Application Default Credentials — no external libraries needed."""

import json
import urllib.request
import urllib.parse
import ssl
import certifi

ssl_context = ssl.create_default_context(cafile=certifi.where())

PROPERTY_ID = "326271463"
TOKEN_FILE = "/Users/JD/Desktop/SuperImmersive8/tools/ga4_token.json"
CLIENT_SECRETS_FILE = "/Users/JD/Downloads/client_secret_1000141363620-nc8k5vrtq2cuc2orqf7r05sbvbfcsqso.apps.googleusercontent.com.json"

def get_access_token():
    with open(TOKEN_FILE) as f:
        tokens = json.load(f)
    with open(CLIENT_SECRETS_FILE) as f:
        secrets = json.load(f)
    installed = secrets.get("installed", secrets.get("web", {}))
    data = urllib.parse.urlencode({
        "client_id": installed["client_id"],
        "client_secret": installed["client_secret"],
        "refresh_token": tokens["refresh_token"],
        "grant_type": "refresh_token"
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    with urllib.request.urlopen(req, context=ssl_context) as r:
        return json.loads(r.read())["access_token"]

def run_report(token, body):
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}:runReport"
    req = urllib.request.Request(url,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, context=ssl_context) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.reason)
        print("Body:", e.read().decode())
        raise

def print_report(title, result):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")
    headers = [h["name"] for h in result.get("dimensionHeaders", [])] + \
              [m["name"] for m in result.get("metricHeaders", [])]
    print("  " + " | ".join(f"{h:<30}" if i==0 else f"{h:>12}" for i,h in enumerate(headers)))
    print("  " + "-"*60)
    for row in result.get("rows", []):
        dims = [d["value"] for d in row.get("dimensionValues", [])]
        mets = [m["value"] for m in row.get("metricValues", [])]
        vals = dims + mets
        print("  " + " | ".join(f"{v:<30}" if i==0 else f"{v:>12}" for i,v in enumerate(vals)))
    if not result.get("rows"):
        print("  (no data)")

token = get_access_token()
print("Authenticated. Pulling GA4 reports for property", PROPERTY_ID)

# 1. Traffic by source — last 30 days
r1 = run_report(token, {
    "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
    "dimensions": [{"name": "sessionSource"}],
    "metrics": [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "engagementRate"}],
    "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
    "limit": 10
})
print_report("TRAFFIC SOURCES — last 30 days", r1)

# 2. Top pages by views
r2 = run_report(token, {
    "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
    "dimensions": [{"name": "pagePath"}],
    "metrics": [{"name": "screenPageViews"}, {"name": "averageSessionDuration"}, {"name": "bounceRate"}],
    "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
    "limit": 15
})
print_report("TOP PAGES — last 30 days", r2)

# 3. Custom events
r3 = run_report(token, {
    "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
    "dimensions": [{"name": "eventName"}],
    "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
    "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
    "limit": 20
})
print_report("EVENTS — last 30 days", r3)

# 4. Geography
r4 = run_report(token, {
    "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
    "dimensions": [{"name": "country"}],
    "metrics": [{"name": "activeUsers"}, {"name": "sessions"}],
    "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
    "limit": 15
})
print_report("GEOGRAPHY — last 30 days", r4)

# 5. Weekly trend — sessions by week
r5 = run_report(token, {
    "dateRanges": [{"startDate": "60daysAgo", "endDate": "today"}],
    "dimensions": [{"name": "week"}],
    "metrics": [{"name": "sessions"}, {"name": "activeUsers"}],
    "orderBys": [{"dimension": {"dimensionName": "week"}, "desc": False}],
    "limit": 10
})
print_report("WEEKLY SESSION TREND — last 60 days", r5)

# 6. Device category
r6 = run_report(token, {
    "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
    "dimensions": [{"name": "deviceCategory"}],
    "metrics": [{"name": "sessions"}, {"name": "engagementRate"}],
    "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
})
print_report("DEVICE CATEGORY — last 30 days", r6)

print("\n\nDone.")
