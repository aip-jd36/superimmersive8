"""
analyze.py — SI8 LinkedIn ICP Validation Report
================================================
Purpose: Run full ICP discovery analysis against the latest Supabase CSV export.
         Outputs a structured markdown report to 03_Sales/outreach/.

Usage:
  python tools/linkedin-analysis/analyze.py
  python tools/linkedin-analysis/analyze.py --csv data/supabase-exports/supabase-export-2026-04-13.csv

Output:
  03_Sales/outreach/LINKEDIN-ICP-REPORT-YYYY-MM-DD.md

Data source: data/supabase-exports/supabase-export-YYYY-MM-DD.csv (latest by default)
"""

import csv
import sys
import os
import re
import glob
from collections import defaultdict
from datetime import date

# Allow running from repo root or from tools/linkedin-analysis/
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from classify import extract_reply, classify_reply, detect_pathway

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


# ---------------------------------------------------------------------------
# Campaign metadata
# ---------------------------------------------------------------------------

# Maps campaign name fragments to structured metadata
CAMPAIGN_META = {
    'Hitting a Wall': {
        'version': 'v4',
        'hypothesis': 'H-MSG: "Legal team blocking AI video" pain resonates with CDs/Founders',
        'msg1': 'More and more production houses are hitting a wall when client legal teams reject AI video over missing documentation.',
        'status': 'SCALE',
    },
    'Legal Friction': {
        'version': 'v4',
        'hypothesis': 'H-MSG: "Legal teams asking for documentation" surfaces qualified buyers fast',
        'msg1': 'When you deliver AI-generated video to a client — are their legal teams asking for documentation?',
        'status': 'KEEP (strong pre-qualifier)',
    },
    'Blocks AI Campaign': {
        'version': 'v4',
        'hypothesis': 'H-MSG: "Legal team blocks a campaign" — more aggressive framing of same pain',
        'msg1': 'When a client\'s legal team blocks an AI video campaign — what\'s your current process?',
        'status': 'KILL',
    },
    'Trusted AI Supplier': {
        'version': 'v3',
        'hypothesis': 'H-MSG (v3): Agency white-label supply angle — "trusted AI supplier"',
        'msg1': 'Want to add AI video as a service offering but need a trusted supplier?',
        'status': 'RETIRE',
    },
    'Vetting Takes Weeks': {
        'version': 'v3',
        'hypothesis': 'H-MSG (v3): Slow vetting process is the pain point',
        'msg1': 'AI video vetting takes weeks — what if you could cut that to 90 minutes?',
        'status': 'RETIRE',
    },
    'Documented Provenance': {
        'version': 'v3',
        'hypothesis': 'H-MSG (v3): Documentation/provenance angle',
        'msg1': 'Worried about recommending AI video to clients without verified rights?',
        'status': 'KILL',
    },
    'Early Days': {
        'version': 'v3',
        'hypothesis': 'H-MSG (v3): Early adopter framing — soft opener',
        'msg1': 'Is AI video something your clients are asking about?',
        'status': 'KILL',
    },
}


def get_campaign_meta(campaign_name: str) -> dict:
    for key, meta in CAMPAIGN_META.items():
        if key.lower() in campaign_name.lower():
            return {**meta, 'name': key}
    return {'name': campaign_name, 'version': '?', 'hypothesis': '?', 'status': '?', 'msg1': '?'}


# ---------------------------------------------------------------------------
# Geography normalization
# ---------------------------------------------------------------------------

def norm_geo(location: str) -> str:
    loc = location.lower()
    if any(x in loc for x in ['london', 'england', 'united kingdom', 'uk,']):
        return 'London/UK'
    if 'singapore' in loc:
        return 'Singapore'
    if any(x in loc for x in ['paris', 'france']):
        return 'France/Paris'
    if any(x in loc for x in ['amsterdam', 'netherlands']):
        return 'Netherlands'
    if any(x in loc for x in ['berlin', 'germany', 'munich', 'hamburg']):
        return 'Germany'
    if any(x in loc for x in ['spain', 'madrid', 'barcelona']):
        return 'Spain'
    if any(x in loc for x in ['sydney', 'australia', 'melbourne']):
        return 'Sydney/AU'
    if any(x in loc for x in ['india', 'mumbai', 'delhi', 'bangalore', 'hyderabad']):
        return 'India'
    if any(x in loc for x in ['egypt', 'cairo']):
        return 'Egypt/MENA'
    if any(x in loc for x in ['usa', 'united states', 'new york', 'chicago', 'los angeles']):
        return 'USA'
    if any(x in loc for x in ['manila', 'philippines']):
        return 'Philippines'
    if any(x in loc for x in ['hong kong']):
        return 'Hong Kong'
    return 'Other'


# ---------------------------------------------------------------------------
# Title normalization
# ---------------------------------------------------------------------------

def norm_title(title: str) -> str:
    t = title.lower()
    if any(x in t for x in ['ai director', 'director of ai', 'head of ai', 'ai content director',
                              'creative director – ai', 'creative director - ai', 'ai practitioner']):
        return 'AI Director / AI Content'
    if 'creative director' in t or 'chief creative' in t or 'ecd' in t or 'executive creative' in t:
        return 'Creative Director'
    if any(x in t for x in ['founder', 'co-founder', 'cofounder']):
        return 'Founder / Co-Founder'
    if 'managing director' in t:
        return 'Managing Director'
    if 'ceo' in t or 'chief executive' in t:
        return 'CEO'
    if 'cmo' in t or 'chief marketing' in t:
        return 'CMO'
    if 'head of production' in t or 'executive producer' in t or 'ep' == t.strip():
        return 'Head of Production / EP'
    if 'head of' in t:
        return 'Head of (other)'
    if 'director' in t:
        return 'Director (other)'
    if 'manager' in t:
        return 'Manager'
    return 'Other'


# ---------------------------------------------------------------------------
# Confidence scoring
# ---------------------------------------------------------------------------

def confidence_score(n: int, warm: int) -> str:
    """Return confidence label based on sample size and warm rate."""
    if n < 5:
        return 'INSUFFICIENT DATA'
    rate = warm / n
    if n >= 15 and rate >= 0.15:
        return 'CONFIRMED ✅'
    if n >= 10 and rate >= 0.10:
        return 'PROMISING 🟡'
    if n >= 5 and rate >= 0.10:
        return 'EARLY SIGNAL 🔵'
    if rate == 0 and n >= 8:
        return 'DISQUALIFIED ❌'
    if rate < 0.05 and n >= 10:
        return 'WEAK — RECONSIDER 🔴'
    return 'NEEDS MORE DATA'


# ---------------------------------------------------------------------------
# Scale readiness verdict
# ---------------------------------------------------------------------------

def scale_verdict(n: int, warm: int, confidence: str) -> str:
    if 'CONFIRMED' in confidence:
        return '✅ READY TO SCALE → email'
    if 'PROMISING' in confidence:
        return '🟡 PROMISING — run 1 more LinkedIn batch before scaling'
    if 'DISQUALIFIED' in confidence:
        return '❌ DO NOT SCALE — remove from targeting'
    if 'WEAK' in confidence:
        return '🔴 DO NOT SCALE — reconsider segment'
    return '🔵 MORE DATA NEEDED — keep on LinkedIn'


# ---------------------------------------------------------------------------
# Load and process CSV
# ---------------------------------------------------------------------------

def load_csv(path: str) -> list:
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if r.get('is_latest_version', '').lower() == 'true']
    for r in rows:
        reply = extract_reply(r.get('conversation_raw', ''))
        r['_reply'] = reply
        r['_class'] = classify_reply(reply)
        r['_pathway'] = detect_pathway(reply) if r['_class'] == 'warm' else ''
        r['_geo'] = norm_geo(r.get('lead_location', ''))
        r['_title'] = norm_title(r.get('lead_title', ''))
        # Normalize alias
        alias = r.get('alias_profile', '') or ''
        if alias in ('LH',): alias = 'Lilly'
        if alias in ('IL',): alias = 'Ivy'
        r['_alias'] = alias
    return rows


def find_latest_csv() -> str:
    pattern = os.path.join(REPO_ROOT, 'data', 'supabase-exports', 'supabase-export-*.csv')
    files = sorted(glob.glob(pattern), reverse=True)
    if not files:
        raise FileNotFoundError(f"No CSV files found at {pattern}")
    return files[0]


# ---------------------------------------------------------------------------
# Analysis helpers
# ---------------------------------------------------------------------------

def dim_table(rows: list, key_fn, include_warm_quotes: bool = False) -> dict:
    """Group rows by key_fn, return stats dict."""
    data = defaultdict(lambda: {'total': 0, 'warm': 0, 'pass': 0, 'naf': 0, 'minimal': 0, 'quotes': []})
    for r in rows:
        k = key_fn(r)
        data[k]['total'] += 1
        data[k][r['_class']] += 1
        if r['_class'] == 'warm' and r['_reply']:
            data[k]['quotes'].append({
                'name': r['lead_name'],
                'title': r['lead_title'],
                'company': r['lead_company'],
                'geo': r['_geo'],
                'reply': r['_reply'][:200],
                'pathway': r['_pathway'],
            })
    return dict(data)


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def generate_report(rows: list, csv_path: str) -> str:
    today = date.today().isoformat()
    n_total = len(rows)
    n_warm = sum(1 for r in rows if r['_class'] == 'warm')
    n_pass = sum(1 for r in rows if r['_class'] == 'pass')
    n_naf = sum(1 for r in rows if r['_class'] == 'naf')
    n_minimal = sum(1 for r in rows if r['_class'] == 'minimal')

    warm_rows = [r for r in rows if r['_class'] == 'warm']

    lines = []
    a = lines.append

    # -----------------------------------------------------------------------
    # HEADER
    # -----------------------------------------------------------------------
    a(f"# SI8 LinkedIn ICP Validation Report")
    a(f"")
    a(f"**Generated:** {today}  ")
    a(f"**Data source:** `{os.path.basename(csv_path)}`  ")
    a(f"**N (unique responses):** {n_total}  ")
    a(f"**Purpose:** Validate ICP thesis using LinkedIn outreach data. Identify segments ready to scale to email.")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 1: OVERALL SNAPSHOT
    # -----------------------------------------------------------------------
    a(f"## Part 1: Response Pool Snapshot")
    a(f"")
    a(f"| Classification | Count | % of responses |")
    a(f"|---------------|-------|---------------|")
    a(f"| 🟢 Warm (genuine engagement) | {n_warm} | {n_warm/n_total*100:.0f}% |")
    a(f"| ⚪ Pass (polite no) | {n_pass} | {n_pass/n_total*100:.0f}% |")
    a(f"| 🔴 Not a Fit | {n_naf} | {n_naf/n_total*100:.0f}% |")
    a(f"| ➖ Minimal (no signal) | {n_minimal} | {n_minimal/n_total*100:.0f}% |")
    a(f"| **Total** | **{n_total}** | — |")
    a(f"")
    a(f"**Signal rate** (warm + pass + naf = responses with classifiable signal): "
      f"{(n_warm+n_pass+n_naf)/n_total*100:.0f}%")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 2: ICP SEGMENT SCORECARD
    # -----------------------------------------------------------------------
    a(f"## Part 2: ICP Segment Scorecard")
    a(f"")
    a(f"*Each segment scored by: warm rate, sample size, and confidence level.*  ")
    a(f"*Confidence: CONFIRMED ✅ (n≥15, warm≥15%) | PROMISING 🟡 (n≥10, warm≥10%) | EARLY SIGNAL 🔵 | DISQUALIFIED ❌ | INSUFFICIENT DATA*")
    a(f"")

    # --- By Title ---
    a(f"### 2a. By Title Segment")
    a(f"")
    a(f"| Title | N | Warm | Warm% | Pass% | NAF% | Confidence | Scale Verdict |")
    a(f"|-------|---|------|-------|-------|------|------------|--------------|")
    title_data = dim_table(rows, lambda r: r['_title'])
    for title, d in sorted(title_data.items(), key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        n = d['total']
        w = d['warm']
        p = d['pass']
        naf = d['naf']
        conf = confidence_score(n, w)
        verdict = scale_verdict(n, w, conf)
        a(f"| {title} | {n} | {w} | {w/n*100:.0f}% | {p/n*100:.0f}% | {naf/n*100:.0f}% | {conf} | {verdict} |")
    a(f"")

    # --- By Geo ---
    a(f"### 2b. By Geography")
    a(f"")
    a(f"| Geography | N | Warm | Warm% | Pass% | NAF% | Confidence | Scale Verdict |")
    a(f"|-----------|---|------|-------|-------|------|------------|--------------|")
    geo_data = dim_table(rows, lambda r: r['_geo'])
    for geo, d in sorted(geo_data.items(), key=lambda x: -x[1]['total']):
        n = d['total']
        w = d['warm']
        p = d['pass']
        naf = d['naf']
        conf = confidence_score(n, w)
        verdict = scale_verdict(n, w, conf)
        a(f"| {geo} | {n} | {w} | {w/n*100:.0f}% | {p/n*100:.0f}% | {naf/n*100:.0f}% | {conf} | {verdict} |")
    a(f"")

    # --- Title × Geo cross-tab (top combinations only) ---
    a(f"### 2c. Title × Geography (top combinations, n≥3)")
    a(f"")
    a(f"| Title | Geo | N | Warm | Warm% | Confidence |")
    a(f"|-------|-----|---|------|-------|------------|")
    cross = defaultdict(lambda: defaultdict(int))
    for r in rows:
        cross[(r['_title'], r['_geo'])]['total'] += 1
        cross[(r['_title'], r['_geo'])][r['_class']] += 1
    combos = [(k, v) for k, v in cross.items() if v['total'] >= 3]
    for (title, geo), d in sorted(combos, key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        n = d['total']
        w = d.get('warm', 0)
        conf = confidence_score(n, w)
        a(f"| {title} | {geo} | {n} | {w} | {w/n*100:.0f}% | {conf} |")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 3: CAMPAIGN MESSAGE ANALYSIS
    # -----------------------------------------------------------------------
    a(f"## Part 3: Campaign Message Performance")
    a(f"")
    a(f"*Each campaign message maps to a hypothesis about what pain resonates.*")
    a(f"")
    a(f"| Campaign | Version | N | Warm | Warm% | Pass% | NAF% | Status | Hypothesis |")
    a(f"|----------|---------|---|------|-------|-------|------|--------|-----------|")
    camp_data = dim_table(rows, lambda r: r['campaign_name'])
    for camp, d in sorted(camp_data.items(), key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        meta = get_campaign_meta(camp)
        n = d['total']
        w = d['warm']
        p = d['pass']
        naf = d['naf']
        # Shorten campaign name for display
        short_name = meta['name']
        a(f"| {short_name} | {meta['version']} | {n} | {w} | {w/n*100:.0f}% | {p/n*100:.0f}% | {naf/n*100:.0f}% | {meta['status']} | {meta['hypothesis'][:60]}... |")
    a(f"")

    # --- Message number breakdown ---
    a(f"### Message Number Performance")
    a(f"")
    a(f"*Which message in the 4-message sequence triggers warm replies?*")
    a(f"")
    a(f"| Message # | N | Warm | Warm% | Pass% | Interpretation |")
    a(f"|-----------|---|------|-------|-------|---------------|")
    msg_data = dim_table(rows, lambda r: r.get('sequence_message_number') or '?')
    msg_interp = {
        '1': 'Cold open — low warm rate expected; filters by pain acknowledgment',
        '2': 'Follow-up with product pitch — typically lowest warm rate; many exit here',
        '3': 'Second follow-up — only genuinely curious stay; highest warm rate',
        '4': 'Final touchpoint — small sample; committed engagers only',
        '?': 'Unknown message number',
    }
    for msg in sorted(msg_data.keys(), key=lambda x: (x == '?', x)):
        d = msg_data[msg]
        n = d['total']
        w = d['warm']
        p = d['pass']
        interp = msg_interp.get(msg, '')
        a(f"| #{msg} | {n} | {w} | {w/n*100:.0f}% | {p/n*100:.0f}% | {interp} |")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 4: ALIAS PERFORMANCE
    # -----------------------------------------------------------------------
    a(f"## Part 4: Alias Performance")
    a(f"")
    a(f"| Alias | N | Warm | Warm% | Pass% | NAF% |")
    a(f"|-------|---|------|-------|-------|------|")
    alias_data = dim_table(rows, lambda r: r['_alias'])
    for alias, d in sorted(alias_data.items(), key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        n = d['total']
        w = d['warm']
        p = d['pass']
        naf = d['naf']
        a(f"| {alias} | {n} | {w} | {w/n*100:.0f}% | {p/n*100:.0f}% | {naf/n*100:.0f}% |")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 5: CONVERSION PATHWAY BREAKDOWN
    # -----------------------------------------------------------------------
    a(f"## Part 5: Conversion Pathway Breakdown")
    a(f"")
    a(f"*For warm leads only. Three pathways identified from ICP discovery.*")
    a(f"")
    a(f"| Pathway | Description | Count | % of warm |")
    a(f"|---------|-------------|-------|----------|")
    pathway_counts = defaultdict(int)
    for r in warm_rows:
        pathway_counts[r['_pathway']] += 1

    pathway_labels = {
        'P1-pain-aware': 'P1 — Pain-aware: legal team has blocked/rejected AI video',
        'P2-informal-process': 'P2 — Informal process: has workaround, thinks covered',
        'P3-outsource': 'P3 — Outsource: already produces compliance reports, wants to delegate',
        'unknown': 'Unclassified warm',
    }
    for pw, label in pathway_labels.items():
        count = pathway_counts.get(pw, 0)
        pct = count / n_warm * 100 if n_warm else 0
        a(f"| {label} | {count} | {pct:.0f}% |")
    a(f"")
    a(f"**Implication:** Each pathway requires a different message. P1 responds to Hitting a Wall. "
      f"P2 needs the 'your informal process won't hold up' reframe. P3 needs the outsource pitch directly.")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 6: WARM LEAD SIGNALS (language mining)
    # -----------------------------------------------------------------------
    a(f"## Part 6: Warm Lead Signals")
    a(f"")
    a(f"*Actual language from warm replies. This is your email copy and objection handling.*")
    a(f"")
    for r in warm_rows:
        reply_preview = r['_reply'].replace('\n', ' ').strip()[:250]
        a(f"**{r['lead_name']}** · {r['lead_title']} · {r.get('lead_company', '')} · {r['_geo']}  ")
        a(f"Campaign: `{r['campaign_name']}` · Msg #{r.get('sequence_message_number', '?')} · Alias: {r['_alias']}  ")
        a(f"Pathway: `{r['_pathway']}`  ")
        a(f"> {reply_preview}")
        a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 7: SCALE READINESS SUMMARY
    # -----------------------------------------------------------------------
    a(f"## Part 7: Scale Readiness — What to Scale, Kill, or Keep Testing")
    a(f"")
    a(f"*Based on confidence scores from Parts 2-3.*")
    a(f"")

    # Title verdicts
    a(f"### Title Segments")
    for title, d in sorted(title_data.items(), key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        n = d['total']
        w = d['warm']
        conf = confidence_score(n, w)
        verdict = scale_verdict(n, w, conf)
        a(f"- **{title}** (n={n}, warm={w/n*100:.0f}%): {verdict}")
    a(f"")

    # Geo verdicts
    a(f"### Geography Segments")
    for geo, d in sorted(geo_data.items(), key=lambda x: -x[1]['total']):
        n = d['total']
        w = d['warm']
        conf = confidence_score(n, w)
        verdict = scale_verdict(n, w, conf)
        a(f"- **{geo}** (n={n}, warm={w/n*100:.0f}%): {verdict}")
    a(f"")

    # Campaign verdicts
    a(f"### Campaign Messages")
    for camp, d in sorted(camp_data.items(), key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        meta = get_campaign_meta(camp)
        n = d['total']
        w = d['warm']
        a(f"- **{meta['name']}** (n={n}, warm={w/n*100:.0f}%): {meta['status']}")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 8: OPEN QUESTIONS + NEXT TESTS
    # -----------------------------------------------------------------------
    a(f"## Part 8: Open Questions + Recommended Next Tests")
    a(f"")

    # Auto-generate based on data gaps
    open_questions = []

    # Check AI Director sample size
    ai_dir = title_data.get('AI Director / AI Content', {})
    if ai_dir.get('total', 0) < 10:
        open_questions.append(
            f"**AI Director sample too small (n={ai_dir.get('total',0)})** — "
            f"Run a dedicated Hitting a Wall campaign targeting AI Director titles in London/Singapore. "
            f"This is the highest warm-rate title but needs more data to confirm."
        )

    # Check EU geo
    eu_geos = ['France/Paris', 'Netherlands', 'Germany', 'Spain']
    eu_n = sum(geo_data.get(g, {}).get('total', 0) for g in eu_geos)
    if eu_n < 20:
        open_questions.append(
            f"**EU market untested (n={eu_n} combined)** — "
            f"EU AI Act Article 50 deadline is August 2026. Run a 150-200 lead test batch "
            f"(Paris/Amsterdam/Hamburg, Creative Director + AI Director, Hitting a Wall, Ivy). "
            f"High urgency hook available."
        )

    # Check for AI-filtered list validation
    open_questions.append(
        "**AI-filtered vs. broad CD list** — New Singapore campaign (0426B, n=300 broad CD list) "
        "is the control. Need to run an AI-keyword-filtered CD list as the test. "
        "Hypothesis: CDs who self-identify with AI video convert at 2x+ vs. broad CD."
    )

    # Check Hitting a Wall vs Legal Friction on same audience
    open_questions.append(
        "**Hitting a Wall vs. Legal Friction on identical audience** — "
        "Both campaigns run on different list types, making direct comparison noisy. "
        "Test both messages on same title/geo combo to isolate message effect cleanly."
    )

    # Pathway 3 (outsource) — dedicated campaign
    p3_count = pathway_counts.get('P3-outsource', 0)
    open_questions.append(
        f"**Outsource pathway (P3) has {p3_count} confirmed leads** — "
        f"Hugo Barbera archetype: agencies that ALREADY produce compliance reports and want to outsource. "
        f"These won't respond to 'do you have this problem?' — need a dedicated opener: "
        f"'Are you currently producing Chain of Title documentation for AI video clients — and is that something you'd consider outsourcing?'"
    )

    for i, q in enumerate(open_questions, 1):
        a(f"{i}. {q}")
        a(f"")

    a(f"---")
    a(f"")
    a(f"*Report generated by `tools/linkedin-analysis/analyze.py` · SI8 Sales Intelligence*")

    return '\n'.join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # Determine CSV path
    if len(sys.argv) > 1 and sys.argv[1].startswith('--csv'):
        if '=' in sys.argv[1]:
            csv_path = sys.argv[1].split('=', 1)[1]
        else:
            csv_path = sys.argv[2]
    else:
        csv_path = find_latest_csv()

    csv_path = os.path.join(REPO_ROOT, csv_path) if not os.path.isabs(csv_path) else csv_path

    print(f"Loading: {csv_path}")
    rows = load_csv(csv_path)
    print(f"Loaded {len(rows)} responses")

    report = generate_report(rows, csv_path)

    # Write output
    today = date.today().isoformat()
    out_dir = os.path.join(REPO_ROOT, '03_Sales', 'outreach')
    out_path = os.path.join(out_dir, f'LINKEDIN-ICP-REPORT-{today}.md')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"Report written to: {out_path}")
    return out_path


if __name__ == '__main__':
    main()
