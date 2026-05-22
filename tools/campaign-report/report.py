#!/usr/bin/env python3
"""
report.py — SI8 Campaign Performance Report Generator

Combines Dripify dashboard data (manually maintained CSV) with Supabase response
data (auto-exported CSV) to produce the full campaign performance log and geo cost
efficiency tables.

Usage:
  python tools/campaign-report/report.py
  python tools/campaign-report/report.py --dripify data/dripify-campaigns.csv
  python tools/campaign-report/report.py --supabase data/supabase-exports/supabase-export-YYYY-MM-DD.csv
  python tools/campaign-report/report.py --dry-run   # print to stdout, do not overwrite log

See 03_Sales/CAMPAIGN-REPORT-METHODOLOGY.md for full methodology and step-by-step runbook.
"""

import csv
import sys
import os
import glob
import argparse
from collections import defaultdict
from datetime import date

# Reuse warm-reply classifier from existing linkedin-analysis tool
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'linkedin-analysis'))
from classify import extract_reply, classify_reply

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
COST_PER_LEAD = 100 / 700          # $100/month Dripify = 700 outreaches
OUTPUT_PATH   = os.path.join(REPO_ROOT, '03_Sales', 'CAMPAIGN-PERFORMANCE-LOG.md')
DEFAULT_DRIP  = os.path.join(REPO_ROOT, 'data', 'dripify-campaigns.csv')
DEFAULT_GEO   = os.path.join(REPO_ROOT, 'data', 'geo-cost-inputs.csv')

# Maps the geo label the user writes in dripify-campaigns.csv → the normalized geo
# used when grouping Supabase lead_location values. Must stay in sync with norm_location().
DRIP_TO_NORM = {
    'Dubai':       'UAE/Dubai',
    'UAE':         'UAE/Dubai',
    'England':     'London/UK',
    'London':      'London/UK',
    'UK':          'London/UK',
    'Amsterdam':   'Netherlands',
    'Netherlands': 'Netherlands',
    'Singapore':   'Singapore',
    'Los Angeles': 'USA',
    'LA':          'USA',
    'USA':         'USA',
    'Berlin':      'Germany',
    'Germany':     'Germany',
    'DACH':        'Germany',
    'Sydney':      'Sydney/AU',
    'Australia':   'Sydney/AU',
    'Global':      'Other',
}


def norm_location(location: str) -> str:
    """Normalize a LinkedIn lead_location string to a canonical geo label."""
    loc = location.lower()
    if any(x in loc for x in ['dubai', 'uae', 'united arab emirates', 'abu dhabi']):
        return 'UAE/Dubai'
    if any(x in loc for x in ['london', 'england', 'united kingdom']):
        return 'London/UK'
    if 'singapore' in loc:
        return 'Singapore'
    if any(x in loc for x in ['amsterdam', 'netherlands']):
        return 'Netherlands'
    if any(x in loc for x in ['berlin', 'germany', 'munich', 'hamburg']):
        return 'Germany'
    if any(x in loc for x in ['paris', 'france']):
        return 'France/Paris'
    if any(x in loc for x in ['sydney', 'australia', 'melbourne']):
        return 'Sydney/AU'
    if any(x in loc for x in ['los angeles', 'new york', 'united states', 'usa', 'chicago']):
        return 'USA'
    if any(x in loc for x in ['manila', 'philippines']):
        return 'Philippines'
    if any(x in loc for x in ['hong kong']):
        return 'Hong Kong'
    return 'Other'


def pct(n, d):
    return f"{n / d * 100:.1f}%" if d else "—"


def money(v):
    return f"${v:.2f}"


# ---------------------------------------------------------------------------
# Data loaders
# ---------------------------------------------------------------------------

def find_latest_supabase() -> str:
    pattern = os.path.join(REPO_ROOT, 'data', 'supabase-exports', 'supabase-export-*.csv')
    files = sorted(glob.glob(pattern), reverse=True)
    if not files:
        raise FileNotFoundError(f"No Supabase CSV found at {pattern}\nExport one from Supabase and save to data/supabase-exports/")
    return files[0]


def load_supabase(path: str) -> list:
    """
    Load Supabase CSV, classify each reply, return list of enriched row dicts.
    Filters to is_latest_version=true to deduplicate multi-turn conversations.
    """
    rows = []
    with open(path, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r.get('is_latest_version', '').lower() != 'true':
                continue
            reply = extract_reply(r.get('conversation_raw', ''))
            r['_reply'] = reply
            r['_class'] = classify_reply(reply)
            r['_geo']   = norm_location(r.get('lead_location', ''))
            rows.append(r)
    return rows


def load_dripify(path: str) -> list:
    """
    Load manually maintained Dripify campaign CSV.
    Required columns: campaign_name, alias, geo, target_segment, sequence,
                      launch_date, leads_sent, accepted, responded, in_cost_analysis
    """
    campaigns = []
    with open(path, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            geo = r['geo'].strip()
            campaigns.append({
                'name':      r['campaign_name'].strip(),
                'alias':     r['alias'].strip(),
                'geo':       geo,
                'geo_norm':  DRIP_TO_NORM.get(geo, geo),
                'target':    r['target_segment'].strip(),
                'sequence':  r['sequence'].strip(),
                'launch':    r['launch_date'].strip(),
                'leads':     int(r['leads_sent']),
                'accepted':  int(r['accepted']),
                'responded': int(r['responded']),
                'in_cost':   r.get('in_cost_analysis', 'false').strip().lower() == 'true',
            })
    return campaigns


def load_geo_cost(path: str) -> dict:
    """Load manually verified call counts per normalized geo from geo-cost-inputs.csv."""
    if not os.path.exists(path):
        return {}
    result = {}
    with open(path, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            result[r['geo'].strip()] = int(r.get('verified_calls', 0) or 0)
    return result


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def generate(campaigns, supabase_rows, geo_calls, supabase_path, dripify_path) -> str:
    today = date.today().isoformat()
    L = []
    a = L.append

    total_leads = sum(c['leads'] for c in campaigns)
    total_acc   = sum(c['accepted'] for c in campaigns)
    total_resp  = sum(c['responded'] for c in campaigns)

    # -----------------------------------------------------------------------
    # Header
    # -----------------------------------------------------------------------
    a(f"# Campaign Performance Log — Dripify LinkedIn Outreach")
    a(f"")
    a(f"**Last updated:** {today}")
    a(f"**Sources:** `{os.path.basename(dripify_path)}` (Dripify) + `{os.path.basename(supabase_path)}` (Supabase)")
    a(f"**Generated by:** `tools/campaign-report/report.py` — see `03_Sales/CAMPAIGN-REPORT-METHODOLOGY.md`")
    a(f"")
    a(f"**Metric definitions:**")
    a(f"- **All Leads** = total contacts loaded into campaign")
    a(f"- **Accepted** = connection requests accepted (n and % of all leads)")
    a(f"- **Responded** = leads who replied to any message in the sequence (n and % of all leads)")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # Grand total
    # -----------------------------------------------------------------------
    a(f"## Grand Total (All Aliases, All Campaigns)")
    a(f"")
    a(f"| Metric | Value |")
    a(f"|--------|-------|")
    a(f"| Total campaigns | {len(campaigns)} |")
    a(f"| Total leads sent | **{total_leads:,}** |")
    a(f"| Total accepted | **{total_acc:,}** ({pct(total_acc, total_leads)}) |")
    a(f"| Total responded | **{total_resp:,}** ({pct(total_resp, total_leads)}) |")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # By alias
    # -----------------------------------------------------------------------
    alias_totals = defaultdict(lambda: {'n': 0, 'leads': 0, 'acc': 0, 'resp': 0})
    for c in campaigns:
        g = alias_totals[c['alias']]
        g['n'] += 1; g['leads'] += c['leads']
        g['acc'] += c['accepted']; g['resp'] += c['responded']

    a(f"## By Alias")
    a(f"")
    a(f"| Alias | Campaigns | Leads | Accepted | Accept % | Responded | Response % |")
    a(f"|-------|-----------|-------|----------|----------|-----------|------------|")
    for alias, g in sorted(alias_totals.items()):
        a(f"| {alias} | {g['n']} | {g['leads']:,} | {g['acc']:,} | {pct(g['acc'], g['leads'])} | {g['resp']:,} | {pct(g['resp'], g['leads'])} |")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # By geo
    # -----------------------------------------------------------------------
    geo_totals = defaultdict(lambda: {'n': 0, 'leads': 0, 'acc': 0, 'resp': 0})
    for c in campaigns:
        g = geo_totals[c['geo']]
        g['n'] += 1; g['leads'] += c['leads']
        g['acc'] += c['accepted']; g['resp'] += c['responded']
    geo_sorted = sorted(
        geo_totals.items(),
        key=lambda x: x[1]['resp'] / max(x[1]['leads'], 1),
        reverse=True
    )

    a(f"## By Geo")
    a(f"")
    a(f"| Geo | Campaigns | Leads | Accepted | Accept % | Responded | Response % | Notes |")
    a(f"|-----|-----------|-------|----------|----------|-----------|------------|-------|")
    for geo, g in geo_sorted:
        a(f"| {geo} | {g['n']} | {g['leads']:,} | {g['acc']:,} | {pct(g['acc'], g['leads'])} | {g['resp']:,} | {pct(g['resp'], g['leads'])} | |")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # Full campaign table (grouped by alias)
    # -----------------------------------------------------------------------
    a(f"## Full Campaign Table")
    a(f"")
    for alias in sorted(alias_totals.keys()):
        alias_camps = [c for c in campaigns if c['alias'] == alias]
        g = alias_totals[alias]
        a(f"### {alias}")
        a(f"")
        a(f"| Campaign | Geo | Target | Sequence | Launch | Leads | Accepted | Accept % | Responded | Response % |")
        a(f"|----------|-----|--------|----------|--------|-------|----------|----------|-----------|------------|")
        for c in alias_camps:
            a(f"| {c['name']} | {c['geo']} | {c['target']} | {c['sequence']} | {c['launch']} | "
              f"{c['leads']:,} | {c['accepted']:,} | {pct(c['accepted'], c['leads'])} | "
              f"{c['responded']:,} | {pct(c['responded'], c['leads'])} |")
        a(f"| **{alias} Total** | | | | | **{g['leads']:,}** | **{g['acc']:,}** | "
          f"**{pct(g['acc'], g['leads'])}** | **{g['resp']:,}** | **{pct(g['resp'], g['leads'])}** |")
        a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # Rankings
    # -----------------------------------------------------------------------
    by_resp = sorted(campaigns, key=lambda c: c['responded'] / max(c['leads'], 1), reverse=True)
    by_acc  = sorted(campaigns, key=lambda c: c['accepted']  / max(c['leads'], 1), reverse=True)
    worst   = sorted(campaigns, key=lambda c: c['responded'] / max(c['leads'], 1))

    a(f"## Rankings")
    a(f"")
    a(f"### Top 5 by Response Rate")
    a(f"| Rank | Campaign | Geo | Target | Response % | Responded |")
    a(f"|------|----------|-----|--------|------------|-----------|")
    for i, c in enumerate(by_resp[:5], 1):
        a(f"| {i} | {c['name']} | {c['geo']} | {c['target']} | **{pct(c['responded'], c['leads'])}** | {c['responded']} |")
    a(f"")

    a(f"### Bottom 5 by Response Rate")
    a(f"| Rank | Campaign | Geo | Target | Response % | Responded |")
    a(f"|------|----------|-----|--------|------------|-----------|")
    for i, c in enumerate(worst[:5], len(campaigns) - 4):
        a(f"| {i} | {c['name']} | {c['geo']} | {c['target']} | {pct(c['responded'], c['leads'])} | {c['responded']} |")
    a(f"")

    a(f"### Top 5 by Acceptance Rate")
    a(f"| Rank | Campaign | Geo | Target | Accept % | Accepted |")
    a(f"|------|----------|-----|--------|----------|----------|")
    for i, c in enumerate(by_acc[:5], 1):
        a(f"| {i} | {c['name']} | {c['geo']} | {c['target']} | **{pct(c['accepted'], c['leads'])}** | {c['accepted']} |")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # Key Insights (auto-generated narrative)
    # -----------------------------------------------------------------------
    top_resp = by_resp[0]
    top_acc  = by_acc[0]
    top_geo  = geo_sorted[0]
    dead_geos = [g for g, d in geo_sorted if d['resp'] / max(d['leads'], 1) < 0.02 and d['leads'] >= 50]

    a(f"## Key Insights")
    a(f"")
    a(f"**Best response rate:** `{top_resp['name']}` ({top_resp['geo']}) — "
      f"{pct(top_resp['responded'], top_resp['leads'])} ({top_resp['responded']} from {top_resp['leads']:,} leads).")
    a(f"")
    a(f"**Best acceptance rate:** `{top_acc['name']}` ({top_acc['geo']}) — "
      f"{pct(top_acc['accepted'], top_acc['leads'])} acceptance rate.")
    a(f"")
    a(f"**Best geo:** {top_geo[0]} — {pct(top_geo[1]['resp'], top_geo[1]['leads'])} response rate "
      f"({top_geo[1]['resp']} replies from {top_geo[1]['leads']:,} leads).")
    if dead_geos:
        a(f"")
        a(f"**Dead geos (< 2% response, n ≥ 50):** {', '.join(dead_geos)} — do not pursue.")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # Cost efficiency analysis
    # -----------------------------------------------------------------------
    # Dripify side: campaigns flagged in_cost_analysis=true
    cost_camps = [c for c in campaigns if c['in_cost']]
    leads_by_norm = defaultdict(int)
    for c in cost_camps:
        leads_by_norm[c['geo_norm']] += c['leads']

    # Supabase side: Legal Friction sequence rows, classified warm, grouped by geo
    # campaign_name in Supabase CSV = sequence/message name (e.g. "Legal Friction")
    lf_rows = [r for r in supabase_rows if 'legal friction' in r.get('campaign_name', '').lower()]
    warm_by_norm = defaultdict(int)
    warm_leads   = defaultdict(list)
    for r in lf_rows:
        if r['_class'] == 'warm':
            warm_by_norm[r['_geo']] += 1
            warm_leads[r['_geo']].append(r)

    # Build cost table, sorted by $/warm reply (best first)
    cost_rows = []
    for geo_norm, leads in leads_by_norm.items():
        cost  = leads * COST_PER_LEAD
        warm  = warm_by_norm.get(geo_norm, 0)
        calls = geo_calls.get(geo_norm)           # None = not yet verified
        cpw   = cost / warm  if warm  else None
        cpc   = cost / calls if calls else None
        cost_rows.append((geo_norm, leads, cost, warm, cpw, calls, cpc))
    cost_rows.sort(key=lambda x: x[4] if x[4] is not None else 9999)

    a(f"## Cost Efficiency Analysis — {today}")
    a(f"")
    a(f"**Cost basis:** $100/month = 700 outreaches = ${COST_PER_LEAD:.3f}/lead sent")
    a(f"**Dripify source:** campaigns with `in_cost_analysis=true` in `{os.path.basename(dripify_path)}`")
    a(f"**Warm replies:** Supabase CSV, Legal Friction sequence, `is_latest_version=true`, `classify_reply()='warm'`")
    a(f"**Verified calls:** Manual review — see checklist below, update `data/geo-cost-inputs.csv`, re-run")
    a(f"")
    a(f"| Geo | Leads | Total cost | Warm replies | $/warm reply | Verified calls | $/call |")
    a(f"|-----|-------|-----------|-------------|-------------|---------------|--------|")
    for geo_norm, leads, cost, warm, cpw, calls, cpc in cost_rows:
        calls_cell = str(calls) if calls is not None else "❓ see below"
        a(f"| **{geo_norm}** | {leads:,} | {money(cost)} | {warm} | {money(cpw) if cpw else '—'} "
          f"| {calls_cell} | {money(cpc) if cpc else '—'} |")
    a(f"")
    a(f"**Budget recommendation:** Scale the geo with lowest $/warm reply first.")
    a(f"Geos with 0 verified calls: pipeline is warm — needs follow-up to convert, not more outreach.")
    a(f"")

    # Call verification checklist
    a(f"### Call Verification Checklist")
    a(f"")
    a(f"*For each warm lead below: open the full `conversation_raw` in the Supabase CSV.*")
    a(f"*Mark as [CALL] if they explicitly asked for a meeting, demo, or call.*")
    a(f"*Then update `data/geo-cost-inputs.csv` and re-run `report.py`.*")
    a(f"")
    a(f"**Common false positives to reject:** 'nice to e-meet you', 'lovely to connect',")
    a(f"'no need for a meeting', consultant who sent you their own Calendly link.")
    a(f"")
    for geo_norm, *_ in cost_rows:
        here = warm_leads.get(geo_norm, [])
        if not here:
            a(f"**{geo_norm}:** no warm leads found in Supabase CSV (check sequence_name column matches 'Legal Friction')")
            a(f"")
            continue
        a(f"**{geo_norm}** ({len(here)} warm leads):")
        for r in here:
            preview = r['_reply'].replace('\n', ' ').strip()[:150]
            a(f"- {r.get('lead_name', '?')} · {r.get('lead_title', '?')} · {r.get('lead_company', '?')}")
            a(f"  > \"{preview}\"")
        a(f"")

    return '\n'.join(L)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description='SI8 Campaign Performance Report Generator')
    parser.add_argument('--dripify',  default=DEFAULT_DRIP,  help='Path to dripify-campaigns.csv')
    parser.add_argument('--supabase', default=None,          help='Path to Supabase CSV (default: latest)')
    parser.add_argument('--dry-run',  action='store_true',   help='Print to stdout only, do not write file')
    args = parser.parse_args()

    dripify_path  = os.path.join(REPO_ROOT, args.dripify) if not os.path.isabs(args.dripify) else args.dripify
    supabase_path = args.supabase or find_latest_supabase()
    if not os.path.isabs(supabase_path):
        supabase_path = os.path.join(REPO_ROOT, supabase_path)

    print(f"Loading Dripify:  {dripify_path}")
    print(f"Loading Supabase: {supabase_path}")
    print(f"Loading geo cost: {DEFAULT_GEO}")

    campaigns    = load_dripify(dripify_path)
    supabase_rows = load_supabase(supabase_path)
    geo_calls    = load_geo_cost(DEFAULT_GEO)

    cost_n = sum(1 for c in campaigns if c['in_cost'])
    print(f"Campaigns: {len(campaigns)} total, {cost_n} in cost analysis")
    print(f"Supabase:  {len(supabase_rows)} responses (is_latest_version=true)")

    report = generate(campaigns, supabase_rows, geo_calls, supabase_path, dripify_path)

    if args.dry_run:
        print('\n' + report)
    else:
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"\nWritten: {OUTPUT_PATH}")
        print("Next: review the Call Verification Checklist at the bottom of the file,")
        print("      update data/geo-cost-inputs.csv, and re-run to fill in $/call column.")


if __name__ == '__main__':
    main()
