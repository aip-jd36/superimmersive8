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
from classify import extract_reply, classify_reply, detect_pathway, is_product_feedback

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
        r['_product_feedback'] = is_product_feedback(reply)
        r['_geo'] = norm_geo(r.get('lead_location', ''))
        r['_title'] = norm_title(r.get('lead_title', ''))
        # Normalize alias
        alias = r.get('alias_profile', '') or ''
        if alias in ('LH',): alias = 'Lilly'
        if alias in ('IL',): alias = 'Ivy'
        r['_alias'] = alias
        # Target list name (audience list) — distinct from sequence/message name
        target_list = r.get('target_list_name', '') or ''
        # Strip "SI8_RV_R4LI_" prefix for readability
        target_list = re.sub(r'^SI8_RV_R\d+[A-Z]*_', '', target_list)
        r['_target_list'] = target_list if target_list else 'Unknown'
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

    # Pre-compute all dimension tables so campaign suggestions can run first
    title_data = dim_table(rows, lambda r: r['_title'])
    geo_data   = dim_table(rows, lambda r: r['_geo'])
    list_data  = dim_table(rows, lambda r: r['_target_list'])
    camp_data  = dim_table(rows, lambda r: r['campaign_name'])

    cross = defaultdict(lambda: defaultdict(int))
    for r in rows:
        cross[(r['_title'], r['_geo'])]['total'] += 1
        cross[(r['_title'], r['_geo'])][r['_class']] += 1

    pathway_counts = defaultdict(int)
    for r in warm_rows:
        pathway_counts[r['_pathway']] += 1

    # Campaign suggestions computed once, used at top of report
    suggestions = suggest_next_campaigns(rows, title_data, geo_data, list_data, camp_data, pathway_counts)

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
    # PART 1: NEXT 3 SUGGESTED CAMPAIGNS (actionable — always first)
    # -----------------------------------------------------------------------
    a(f"## Part 1: Next 3 Suggested Campaigns")
    a(f"")
    a(f"*Data-driven recommendations. Each suggestion includes: what to build, which sequence to use, expected warm rate, and why the data supports it.*")
    a(f"")
    for i, s in enumerate(suggestions, 1):
        a(f"### Campaign {i}: {s['name']}")
        a(f"")
        a(f"| Field | Value |")
        a(f"|-------|-------|")
        a(f"| **Audience list** | {s['audience']} |")
        a(f"| **Sequence** | {s['sequence']} |")
        a(f"| **Alias** | {s['alias']} |")
        a(f"| **List size** | {s['list_size']} |")
        a(f"| **Expected warm rate** | {s['expected_warm_rate']} |")
        a(f"| **Priority** | {s['priority']} |")
        a(f"")
        a(f"**Why:**  ")
        a(f"{s['why']}")
        a(f"")
        a(f"**Data signal:**  ")
        a(f"{s['data_signal']}")
        a(f"")
        if s.get('watch_out'):
            a(f"**Watch out for:**  ")
            a(f"{s['watch_out']}")
            a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 2: OVERALL SNAPSHOT
    # -----------------------------------------------------------------------
    a(f"## Part 2: Response Pool Snapshot")
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
    # PART 3: ICP SEGMENT SCORECARD
    # -----------------------------------------------------------------------
    a(f"## Part 3: ICP Segment Scorecard")
    a(f"")
    a(f"*Each segment scored by: warm rate, sample size, and confidence level.*  ")
    a(f"*Confidence: CONFIRMED ✅ (n≥15, warm≥15%) | PROMISING 🟡 (n≥10, warm≥10%) | EARLY SIGNAL 🔵 | DISQUALIFIED ❌ | INSUFFICIENT DATA*")
    a(f"")

    # --- By Title ---
    a(f"### 2a. By Title Segment")
    a(f"")
    a(f"| Title | N | Warm | Warm% | Pass% | NAF% | Confidence | Scale Verdict |")
    a(f"|-------|---|------|-------|-------|------|------------|--------------|")
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
    # PART 4: CAMPAIGN MESSAGE + AUDIENCE LIST ANALYSIS
    # -----------------------------------------------------------------------
    a(f"## Part 4: Campaign Performance")
    a(f"")

    # --- 3a: Message sequence performance ---
    a(f"### 3a. Message Sequence Performance")
    a(f"")
    a(f"*Each sequence maps to a hypothesis about what pain resonates.*")
    a(f"")
    a(f"| Sequence | Version | N | Warm | Warm% | Pass% | NAF% | Status | Hypothesis |")
    a(f"|----------|---------|---|------|-------|-------|------|--------|-----------|")
    for camp, d in sorted(camp_data.items(), key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        meta = get_campaign_meta(camp)
        n = d['total']
        w = d['warm']
        p = d['pass']
        naf = d['naf']
        short_name = meta['name']
        a(f"| {short_name} | {meta['version']} | {n} | {w} | {w/n*100:.0f}% | {p/n*100:.0f}% | {naf/n*100:.0f}% | {meta['status']} | {meta['hypothesis'][:60]}... |")
    a(f"")

    # --- 3b: Audience list performance ---
    a(f"### 3b. Audience List Performance")
    a(f"")
    a(f"*Performance by target audience list (target_list_name). AI-filtered vs. broad lists compared here.*")
    a(f"")
    a(f"| Audience List | N | Warm | Warm% | Pass% | NAF% | Confidence | Verdict |")
    a(f"|--------------|---|------|-------|-------|------|------------|---------|")
    for lst, d in sorted(list_data.items(), key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        n = d['total']
        w = d['warm']
        p = d['pass']
        naf = d['naf']
        conf = confidence_score(n, w)
        verdict = scale_verdict(n, w, conf)
        a(f"| {lst} | {n} | {w} | {w/n*100:.0f}% | {p/n*100:.0f}% | {naf/n*100:.0f}% | {conf} | {verdict} |")
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
    # PART 5: ALIAS PERFORMANCE
    # -----------------------------------------------------------------------
    a(f"## Part 5: Alias Performance")
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
    # PART 6: CONVERSION PATHWAY BREAKDOWN
    # -----------------------------------------------------------------------
    a(f"## Part 6: Conversion Pathway Breakdown")
    a(f"")
    a(f"*For warm leads only. Three pathways identified from ICP discovery.*")
    a(f"")
    a(f"| Pathway | Description | Count | % of warm |")
    a(f"|---------|-------------|-------|----------|")
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
    # PART 7: WARM LEAD SIGNALS (language mining)
    # -----------------------------------------------------------------------
    a(f"## Part 7: Warm Lead Signals")
    a(f"")
    a(f"*Actual language from warm replies. This is your email copy and objection handling.*")
    a(f"")
    for r in warm_rows:
        reply_preview = r['_reply'].replace('\n', ' ').strip()[:250]
        a(f"**{r['lead_name']}** · {r['lead_title']} · {r.get('lead_company', '')} · {r['_geo']}  ")
        a(f"Sequence: `{r['campaign_name']}` · List: `{r['_target_list']}` · Msg #{r.get('sequence_message_number', '?')} · Alias: {r['_alias']}  ")
        a(f"Pathway: `{r['_pathway']}`  ")
        a(f"> {reply_preview}")
        a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 7b: PRODUCT FEEDBACK QUEUE (non-warm leads with product signal)
    # -----------------------------------------------------------------------
    a(f"## Part 7b: Product Feedback Queue")
    a(f"")
    a(f"*Non-warm leads whose replies contain product validation signals.*  ")
    a(f"*These are NOT sales leads. Send a discovery question, not a CTA.*  ")
    a(f"*Suggested reply: ask about their current process, what documentation looks like, who owns the decision.*")
    a(f"")

    feedback_rows = [
        r for r in rows
        if r['_product_feedback'] and r['_class'] != 'warm'
    ]

    if not feedback_rows:
        a(f"*No product feedback signals detected in non-warm leads.*")
    else:
        a(f"**{len(feedback_rows)} leads with product signal** (classified: "
          f"{sum(1 for r in feedback_rows if r['_class']=='pass')} pass, "
          f"{sum(1 for r in feedback_rows if r['_class']=='naf')} naf, "
          f"{sum(1 for r in feedback_rows if r['_class']=='minimal')} minimal)")
        a(f"")
        for r in feedback_rows:
            reply_preview = r['_reply'].replace('\n', ' ').strip()[:300]
            badge = {'pass': '⚪ PASS', 'naf': '🔴 NAF', 'minimal': '➖ MIN'}[r['_class']]
            a(f"**{r['lead_name']}** · {r['lead_title']} · {r.get('lead_company', '')} · {r['_geo']}  ")
            a(f"{badge} · List: `{r['_target_list']}` · Msg #{r.get('sequence_message_number', '?')} · Alias: {r['_alias']}  ")
            a(f"> {reply_preview}")
            a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 8: SCALE READINESS SUMMARY
    # -----------------------------------------------------------------------
    a(f"## Part 8: Scale Readiness — What to Scale, Kill, or Keep Testing")
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

    # Campaign message verdicts
    a(f"### Campaign Sequences")
    for camp, d in sorted(camp_data.items(), key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        meta = get_campaign_meta(camp)
        n = d['total']
        w = d['warm']
        a(f"- **{meta['name']}** (n={n}, warm={w/n*100:.0f}%): {meta['status']}")
    a(f"")

    # Audience list verdicts
    a(f"### Audience Lists")
    for lst, d in sorted(list_data.items(), key=lambda x: -(x[1].get('warm', 0) / max(x[1]['total'], 1))):
        n = d['total']
        w = d['warm']
        conf = confidence_score(n, w)
        verdict = scale_verdict(n, w, conf)
        a(f"- **{lst}** (n={n}, warm={w/n*100:.0f}%): {verdict}")
    a(f"")
    a(f"---")
    a(f"")

    # -----------------------------------------------------------------------
    # PART 9: OPEN QUESTIONS + NEXT TESTS
    # -----------------------------------------------------------------------
    a(f"## Part 9: Open Questions + Recommended Next Tests")
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
# Campaign suggestion engine
# ---------------------------------------------------------------------------

# Known geo labels → how to describe them in a campaign list name
GEO_LIST_LABELS = {
    'London/UK':    'England/UK',
    'Singapore':    'Singapore',
    'France/Paris': 'Paris/France',
    'Netherlands':  'Amsterdam/NL',
    'Germany':      'DACH',
    'India':        'India',
    'USA':          'USA',
    'Sydney/AU':    'Australia',
}

# Sequences ordered best → worst (based on accumulated campaign data)
SEQUENCE_RANK = ['Legal Friction', 'Hitting a Wall', 'Blocks AI Campaign',
                 'Trusted AI Supplier', 'Vetting Takes Weeks', 'Documented Provenance', 'Early Days']

# Preferred aliases per geo
GEO_ALIAS = {
    'London/UK': 'Ivy',
    'Singapore': 'Lilly',
    'France/Paris': 'Vanessa',
    'Netherlands': 'Vanessa',
    'Germany': 'Vanessa',
    'default': 'Ivy',
}


def _best_sequence(camp_data: dict) -> str:
    """Return the name of the highest-performing SCALE/KEEP sequence with n≥10."""
    for name in SEQUENCE_RANK:
        for camp, d in camp_data.items():
            if name.lower() in camp.lower() and d['total'] >= 10:
                meta = get_campaign_meta(camp)
                if meta.get('status') in ('SCALE', 'KEEP (strong pre-qualifier)', 'KEEP'):
                    return name
    return 'Legal Friction'


def _list_warm_rate(list_data: dict, fragment: str):
    """Return (n, warm_rate) for first list matching fragment, or (0, 0)."""
    for lst, d in list_data.items():
        if fragment.lower() in lst.lower():
            n = d['total']
            return n, (d['warm'] / n) if n else 0
    return 0, 0


def suggest_next_campaigns(rows, title_data, geo_data, list_data, camp_data, pathway_counts) -> list:
    suggestions = []
    best_seq = _best_sequence(camp_data)

    # ------------------------------------------------------------------
    # SUGGESTION 1: Replicate the AI-filtered list pattern to next geo
    # ------------------------------------------------------------------
    # Find the best AI-filtered audience list
    ai_filter_lists = {
        lst: d for lst, d in list_data.items()
        if 'ai' in lst.lower() or 'aivideo' in lst.lower().replace(' ', '') or 'ai video' in lst.lower()
    }
    if ai_filter_lists:
        best_ai_lst = max(ai_filter_lists.items(),
                          key=lambda x: x[1]['warm'] / max(x[1]['total'], 1))
        best_ai_name, best_ai_d = best_ai_lst
        best_ai_n    = best_ai_d['total']
        best_ai_rate = best_ai_d['warm'] / best_ai_n if best_ai_n else 0

        # Find which geo that list targeted
        src_geo = 'England/UK' if 'england' in best_ai_name.lower() else \
                  'Amsterdam' if 'amsdm' in best_ai_name.lower() else \
                  'Singapore' if 'spg' in best_ai_name.lower() else 'Unknown'

        # Suggest the next highest-traffic geo not already covered by AI-filtered list
        covered_geos = {lst.lower() for lst in list_data}
        next_geo_options = [
            ('Singapore', 'spg', 'Lilly'),
            ('Paris/France', 'paris', 'Vanessa'),
            ('Amsterdam/NL', 'amsdm', 'Vanessa'),
            ('DACH', 'dach', 'Vanessa'),
        ]
        next_geo_label, next_geo_key, next_alias = next(
            (g for g in next_geo_options if not any(next_geo_key in lst for _, next_geo_key, _ in [g] for lst in covered_geos)),
            ('Paris/France', 'paris', 'Vanessa')
        )
        # Simpler: pick first geo where geo_data shows volume but no AI-filtered list exists yet
        geo_volumes = sorted(
            [(g, d['total'], d['warm']) for g, d in geo_data.items() if g != 'Other'],
            key=lambda x: -x[1]
        )
        # Map geo labels → list name tokens (for matching list names to geos)
        GEO_TO_LIST_TOKENS = {
            'London/UK':    ['england', 'london', 'uk'],
            'Singapore':    ['spg', 'singapore', 'sgp'],
            'France/Paris': ['paris', 'france'],
            'Netherlands':  ['amsdm', 'amsterdam', 'nl'],
            'Germany':      ['dach', 'germany', 'berlin'],
            'India':        ['india'],
            'USA':          ['usa', 'us_'],
            'Sydney/AU':    ['au', 'sydney', 'australia'],
        }

        def _geo_has_ai_list(geo_label):
            tokens = GEO_TO_LIST_TOKENS.get(geo_label, [geo_label.lower().split('/')[0]])
            return any(
                any(tok in lst.lower() for tok in tokens)
                and ('ai' in lst.lower() or 'aivideo' in lst.lower().replace(' ', ''))
                for lst in list_data
            )

        untested_for_ai = [
            g for g, n, w in geo_volumes
            if not _geo_has_ai_list(g)
            and g in GEO_LIST_LABELS
        ]
        target_geo = untested_for_ai[0] if untested_for_ai else 'Singapore'
        target_geo_label = GEO_LIST_LABELS.get(target_geo, target_geo)
        target_alias = GEO_ALIAS.get(target_geo, 'Ivy')

        # Pull warm rate for broad CD list in that geo for comparison
        broad_n, broad_rate = _list_warm_rate(list_data, 'vp+_creative_' + target_geo.lower().split('/')[0])
        broad_note = (f"Broad VP+_Creative_{target_geo_label} list currently shows "
                      f"{broad_rate*100:.0f}% warm (n={broad_n})." if broad_n >= 5 else
                      f"No broad CD list tested in {target_geo} yet — baseline unknown.")

        suggestions.append({
            'name': f"AI-Filtered Creative Directors — {target_geo_label}",
            'audience': f"Creative Directors + AI Video Directors in {target_geo_label}, filtered by AI video keywords in profile/posts",
            'sequence': best_seq,
            'alias': target_alias,
            'list_size': '150–300 leads',
            'expected_warm_rate': f"~{best_ai_rate*100:.0f}% (based on {best_ai_name}, n={best_ai_n})",
            'priority': '🔴 HIGH — replicates best-performing list pattern',
            'why': (
                f"The AI-keyword-filtered Creative Director list in {src_geo} "
                f"({best_ai_name}) returned {best_ai_rate*100:.0f}% warm (n={best_ai_n}) — "
                f"the strongest signal in the dataset. The filter works because it targets CDs "
                f"who already self-identify with AI video production, meaning they've already "
                f"crossed the 'do I even care about this?' threshold before message #1 arrives. "
                f"{target_geo_label} is the next logical market: sufficient professional LinkedIn density, "
                f"English as business language, and strong agency culture."
            ),
            'data_signal': (
                f"Best AI-filtered list: `{best_ai_name}` — {best_ai_d['warm']} warm / {best_ai_n} responses "
                f"({best_ai_rate*100:.0f}% warm rate). "
                f"{broad_note} "
                f"AI-filter hypothesis: CDs who self-identify with AI = pre-qualified on the core question."
            ),
            'watch_out': (
                f"LinkedIn search for AI video keyword filtering varies by market — "
                f"profile density of 'AI video' keywords may be lower outside English-speaking markets. "
                f"If list size < 100, broaden to 'AI content' or 'generative AI' in profile."
            ),
        })

    # ------------------------------------------------------------------
    # SUGGESTION 2: Dedicated campaign for highest-potential thin title
    # ------------------------------------------------------------------
    # Find the title with highest warm rate but n < 10 (promising, needs volume)
    thin_titles = [
        (title, d) for title, d in title_data.items()
        if 3 <= d['total'] < 10 and d['warm'] / d['total'] >= 0.25
        and title not in ('Other',)
    ]
    if thin_titles:
        best_thin = max(thin_titles, key=lambda x: x[1]['warm'] / x[1]['total'])
        thin_title, thin_d = best_thin
        thin_rate = thin_d['warm'] / thin_d['total']

        # Find their best geo
        best_geo_for_title = max(
            [(g, d['total'], d.get('warm', 0)) for g, d in geo_data.items()],
            key=lambda x: x[2] / max(x[1], 1)
        )
        target_geo2 = best_geo_for_title[0]
        target_alias2 = GEO_ALIAS.get(target_geo2, 'Ivy')

        suggestions.append({
            'name': f"Dedicated {thin_title} List — Volume Test",
            'audience': f"{thin_title} titles in London/UK + Singapore, no additional filters (test broad first to establish baseline)",
            'sequence': 'Hitting a Wall',
            'alias': target_alias2,
            'list_size': '200–400 leads',
            'expected_warm_rate': f"~{thin_rate*100:.0f}% if signal holds (n={thin_d['total']} so far — INSUFFICIENT DATA)",
            'priority': '🟡 MEDIUM — confirm or kill this title segment',
            'why': (
                f"'{thin_title}' has the highest warm rate of any title with at least 3 responses "
                f"({thin_rate*100:.0f}%, n={thin_d['total']}), but the sample is too small to act on. "
                f"A dedicated 200–400 lead batch targeting this title exclusively would either "
                f"confirm it as a primary ICP segment (→ scale to email) or rule it out. "
                f"Either outcome is valuable — it removes uncertainty from the ICP thesis."
            ),
            'data_signal': (
                f"Current data: {thin_d['warm']} warm / {thin_d['total']} responses "
                f"({thin_rate*100:.0f}% warm rate). "
                f"Confidence: INSUFFICIENT DATA — need n≥15 at ≥15% warm rate for CONFIRMED status. "
                f"If the rate holds at scale, this becomes a primary targeting segment."
            ),
            'watch_out': (
                f"Warm rate on thin samples is volatile — one or two extra warm replies can inflate "
                f"the number significantly. Treat current rate as a hypothesis, not a confirmed signal."
            ),
        })
    else:
        # Fallback: suggest testing a completely new title segment not yet reached
        suggestions.append({
            'name': "Head of Production / Executive Producer — First Test",
            'audience': "Head of Production, Executive Producer, Head of Content titles in London/UK + Singapore",
            'sequence': 'Legal Friction',
            'alias': 'Ivy',
            'list_size': '150–250 leads',
            'expected_warm_rate': 'Unknown — first test in this segment',
            'priority': '🟡 MEDIUM — untested ICP hypothesis',
            'why': (
                "Heads of Production own the delivery workflow — they're the ones who actually "
                "submit final assets to clients and face legal review. They may be closer to the "
                "pain than Creative Directors, who are upstream of the compliance step. "
                "No current data on this title — this campaign generates the baseline."
            ),
            'data_signal': "No responses from Head of Production / EP titles yet. Pure hypothesis based on role proximity to the compliance pain point.",
            'watch_out': "HoP titles are less common on LinkedIn than CD titles — list size may be smaller than expected, especially outside London.",
        })

    # ------------------------------------------------------------------
    # SUGGESTION 3: Best sequence applied to best geo with room to grow
    # ------------------------------------------------------------------
    # Find the best-performing geo (by warm rate, n≥10) and check if the
    # top sequence has been run there at scale
    confirmed_geos = [
        (g, d) for g, d in geo_data.items()
        if d['total'] >= 10 and d['warm'] / d['total'] >= 0.15
        and g not in ('Other',)
    ]

    if confirmed_geos:
        best_geo_entry = max(confirmed_geos, key=lambda x: x[1]['warm'] / x[1]['total'])
        best_geo_name, best_geo_d = best_geo_entry
        best_geo_rate = best_geo_d['warm'] / best_geo_d['total']
        best_geo_label = GEO_LIST_LABELS.get(best_geo_name, best_geo_name)
        target_alias3 = GEO_ALIAS.get(best_geo_name, 'Ivy')

        # What sequences have been run in this geo? (crude: check list names)
        seqs_in_geo = set()
        for lst in list_data:
            geo_key = best_geo_name.lower().split('/')[0]
            if geo_key in lst.lower() or \
               ('spg' in lst.lower() and 'singapore' in best_geo_name.lower()) or \
               ('england' in lst.lower() and 'london' in best_geo_name.lower()):
                seqs_in_geo.add('detected')

        # Suggest P3-specific outsource opener as new sequence
        p3_count = pathway_counts.get('P3-outsource', 0)
        p3_note = (f"{p3_count} leads already on the outsource pathway (P3) — "
                   f"dedicated opener could unlock a faster conversion cycle for this archetype."
                   if p3_count >= 2 else
                   "P3 outsource pathway not yet detected at scale — test with a small batch first.")

        suggestions.append({
            'name': f"Outsource Opener — {best_geo_label} (New Message Variant)",
            'audience': f"AI Directors, Head of Production, Creative Directors in {best_geo_label} who already produce AI video for clients — use AI video keywords + 'compliance' / 'documentation' in profile as filter",
            'sequence': 'New: Outsource Opener (P3 dedicated)',
            'alias': target_alias3,
            'list_size': '100–200 leads',
            'expected_warm_rate': f"Unknown for new sequence — benchmark against {best_seq} ({best_geo_rate*100:.0f}% in {best_geo_label})",
            'priority': '🟡 MEDIUM — tests a new message for the P3 archetype',
            'why': (
                f"Current sequences ask 'do you have this problem?' — they work for P1 (pain-aware) "
                f"and P2 (informal process) leads. But the Hugo Barbera archetype (P3 — outsource) "
                f"already KNOWS they have the problem and already charges clients for documentation. "
                f"They don't respond to 'is this an issue for you?' because it's not an issue — "
                f"it's a revenue line. The opener needs to be: 'Are you producing Chain of Title "
                f"documentation for AI video clients — and is that something you'd consider "
                f"outsourcing?' This speaks directly to their workflow and positions SI8 as a "
                f"subcontractor, not a new service they need to justify internally."
            ),
            'data_signal': (
                f"{best_geo_label} is your strongest confirmed geo ({best_geo_rate*100:.0f}% warm, "
                f"n={best_geo_d['total']}). Running a new message variant here gives you a clean "
                f"comparison against the existing Legal Friction / Hitting a Wall baseline. "
                f"{p3_note}"
            ),
            'watch_out': (
                "This is a new sequence — no benchmark yet. Run 100 leads before drawing conclusions. "
                "The outsource framing may feel presumptuous to leads who don't yet produce reports — "
                "filter for AI video keywords in profile to reduce this risk."
            ),
        })

    return suggestions


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
