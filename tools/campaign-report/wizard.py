#!/usr/bin/env python3
"""
wizard.py — SI8 Campaign Report Wizard
Step-by-step interactive guide for the monthly Dripify LinkedIn campaign report.

Usage:  python3 tools/campaign-report/wizard.py
"""

import csv, os, sys, subprocess, glob, re
from datetime import date

REPO      = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DRIP_CSV  = os.path.join(REPO, 'data', 'dripify-campaigns.csv')
GEO_CSV   = os.path.join(REPO, 'data', 'geo-cost-inputs.csv')
SUP_DIR   = os.path.join(REPO, 'data', 'supabase-exports')
REPORT_MD = os.path.join(REPO, '03_Sales', 'CAMPAIGN-PERFORMANCE-LOG.md')
SCRIPT    = os.path.join(REPO, 'tools', 'campaign-report', 'report.py')

# ANSI helpers (graceful fallback if terminal doesn't support them)
try:
    import sys; sys.stdout.isatty()
    B  = '\033[1m';  G  = '\033[32m'; Y = '\033[33m'
    C  = '\033[36m'; DIM = '\033[2m'; R = '\033[0m'
except Exception:
    B = G = Y = C = DIM = R = ''

def header(step, total, title):
    print(f"\n{B}{C}{'─'*62}{R}")
    print(f"{B}{C}  Step {step}/{total}:  {title}{R}")
    print(f"{B}{C}{'─'*62}{R}")

def ok(msg):     print(f"  {G}✓{R}  {msg}")
def warn(msg):   print(f"  {Y}!{R}  {msg}")
def info(msg):   print(f"     {DIM}{msg}{R}")
def blank():     print()

def ask(prompt, default=None):
    d = f" [{default}]" if default not in (None, '') else ""
    val = input(f"\n  {B}→{R} {prompt}{d}: ").strip()
    return val if val else (default or "")

def yn(prompt, default='n'):
    return ask(prompt + " (y/n)", default=default).lower().startswith('y')


# ── Data helpers ──────────────────────────────────────────────────────────────

def load_campaigns():
    rows = []
    with open(DRIP_CSV, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            rows.append(dict(r))
    return rows

def save_campaigns(campaigns):
    fields = ['campaign_name','alias','geo','target_segment','sequence',
              'launch_date','leads_sent','accepted','responded','in_cost_analysis']
    with open(DRIP_CSV, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        for c in campaigns:
            w.writerow({k: c.get(k,'') for k in fields})

def load_geo_calls():
    result = {}
    if os.path.exists(GEO_CSV):
        with open(GEO_CSV, encoding='utf-8') as f:
            for r in csv.DictReader(f):
                result[r['geo'].strip()] = r.get('verified_calls', '0')
    return result

def save_geo_calls(geo_calls):
    with open(GEO_CSV, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['geo', 'verified_calls'])
        for geo in sorted(geo_calls):
            w.writerow([geo, geo_calls[geo]])

def run_report(supabase_path=None):
    cmd = [sys.executable, SCRIPT]
    if supabase_path:
        cmd += ['--supabase', supabase_path]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO)
    return result.stdout, result.stderr, result.returncode


# ── Step 1: Supabase CSV ──────────────────────────────────────────────────────

def step1_supabase():
    header(1, 5, "Supabase CSV Export")
    info("This is the full response database — all LinkedIn replies with classification data.")
    blank()

    exports = sorted(glob.glob(os.path.join(SUP_DIR, 'supabase-export-*.csv')), reverse=True)

    if not exports:
        warn("No Supabase exports found in data/supabase-exports/")
        blank()
        info("To export:  Supabase → Table Editor → linkedin_responses → Export → CSV")
        info("Save as:    data/supabase-exports/supabase-export-YYYY-MM-DD.csv")
        blank()
        input("  Press Enter when the file is in place... ")
        exports = sorted(glob.glob(os.path.join(SUP_DIR, 'supabase-export-*.csv')), reverse=True)
        if not exports:
            warn("Still no exports found. Continuing anyway — warm reply counts will be 0.")
            return None

    for i, f in enumerate(exports, 1):
        marker = f"  {G}← latest{R}" if i == 1 else ""
        print(f"  [{i}] {os.path.basename(f)}{marker}")

    blank()
    if yn("Did you export a new CSV today to use for this run?"):
        fname = ask("Filename (e.g. supabase-export-2026-05-22.csv)")
        full = os.path.join(SUP_DIR, fname)
        if os.path.exists(full):
            ok(f"Using {fname}")
            return full
        elif os.path.exists(fname):
            ok(f"Using {fname}")
            return os.path.abspath(fname)
        else:
            warn(f"Not found: {full}")
            warn("Falling back to latest existing export.")

    ok(f"Using latest: {os.path.basename(exports[0])}")
    return exports[0]


# ── Dripify paste parser ──────────────────────────────────────────────────────

def read_paste():
    """Read multi-line pasted input. One blank line after content = done."""
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if not line.strip():
            if lines:          # blank line after we have content → stop
                break
        else:
            lines.append(line)
    return lines


def detect_delimiter(lines):
    tabs   = sum(l.count('\t') for l in lines[:5])
    commas = sum(l.count(',')  for l in lines[:5])
    return '\t' if tabs >= commas else ','


def parse_dripify_paste(lines):
    """
    Parse a Dripify campaign table pasted from the UI (tab or comma separated).
    Returns list of dicts with keys: name, leads, accepted, responded.

    Dripify columns we care about (others ignored):
      Campaign name / title  →  name
      All Leads / Total      →  leads
      Accepted               →  accepted
      Responded / Replies    →  responded
    """
    if not lines:
        return []

    delim = detect_delimiter(lines)
    rows  = [[c.strip() for c in line.split(delim)] for line in lines]

    # Detect header row: first row where any cell looks like a column label
    HEADER_HINTS = {'campaign', 'name', 'title', 'leads', 'accepted',
                    'responded', 'replies', 'total', 'all'}
    first_lower  = [c.lower() for c in rows[0]]
    has_header   = any(any(h in cell for h in HEADER_HINTS) for cell in first_lower)

    if has_header:
        header_row = first_lower
        data_rows  = rows[1:]

        def col(keywords):
            for i, h in enumerate(header_row):
                if any(k in h for k in keywords):
                    return i
            return None

        name_col  = col(['campaign', 'name', 'title']) or 0
        leads_col = col(['all lead', 'total lead', 'leads'])
        acc_col   = col(['accept'])
        resp_col  = col(['respond', 'repli'])

        # Fallback: if columns not found by name, try positional guesses
        if leads_col is None:
            leads_col = 1
        if acc_col is None:
            acc_col = 2
        if resp_col is None:
            resp_col = 3
    else:
        # No header — assume: name, leads, accepted, responded
        data_rows = rows
        name_col, leads_col, acc_col, resp_col = 0, 1, 2, 3

    results = []
    for row in data_rows:
        if len(row) <= max(name_col, leads_col, acc_col, resp_col):
            continue
        name = row[name_col].strip()
        if not name:
            continue
        try:
            leads    = int(row[leads_col].replace(',', '').strip())
            accepted = int(row[acc_col].replace(',', '').strip())
            responded = int(row[resp_col].replace(',', '').strip())
        except (ValueError, IndexError):
            continue
        results.append({'name': name, 'leads': leads,
                        'accepted': accepted, 'responded': responded})

    return results


def find_match(campaigns, name):
    """Match a pasted campaign name to an existing campaign (exact, then substring)."""
    name_l = name.lower().strip()
    for c in campaigns:
        if c['campaign_name'].lower().strip() == name_l:
            return c
    # Substring: either direction (handles truncated names from Dripify UI)
    for c in campaigns:
        existing_l = c['campaign_name'].lower().strip()
        if name_l in existing_l or existing_l in name_l:
            return c
    return None


def collect_new_campaign_fields(name, parsed):
    """Ask for the metadata fields Dripify doesn't include. Returns a full campaign dict."""
    print(f"\n  {B}New campaign detected:{R}  {name}")
    print(f"  {DIM}leads={parsed['leads']}  acc={parsed['accepted']}  resp={parsed['responded']}{R}")
    alias     = ask("alias          (Vanessa / Ivy / Lilly / Angel)")
    geo       = ask("geo            (Dubai / England / London / Amsterdam / Singapore / etc.)")
    target    = ask("target_segment (e.g. Creative Dir — AI Video)")
    sequence  = ask("sequence       (Legal Friction / Hitting a Wall / etc.)")
    launch    = ask("launch_date    (e.g. Jun 5 2026)")

    is_lf  = 'legal friction' in sequence.lower()
    is_cd  = 'creadir' in name.lower() or 'ai video' in target.lower()
    in_cost = 'true' if (is_lf and is_cd) else 'false'

    if in_cost == 'true':
        ok("in_cost_analysis = true (Legal Friction + AI Video — correct)")
    else:
        if yn(f"in_cost_analysis = false. Override to true?"):
            in_cost = 'true'

    return {
        'campaign_name':    name,
        'alias':            alias,
        'geo':              geo,
        'target_segment':   target,
        'sequence':         sequence,
        'launch_date':      launch,
        'leads_sent':       str(parsed['leads']),
        'accepted':         str(parsed['accepted']),
        'responded':        str(parsed['responded']),
        'in_cost_analysis': in_cost,
    }


# ── Step 2: Dripify numbers ───────────────────────────────────────────────────

def step2_dripify():
    header(2, 5, "Dripify Campaign Numbers")
    info("Paste your Dripify campaign table directly from the UI (tab-separated).")
    info("The script matches campaign names, updates existing rows, and flags new ones.")
    info("You can paste all campaigns, a single alias's list, or just new campaigns.")
    blank()
    info("How to copy from Dripify:  Campaigns tab → select all rows → Ctrl+C")
    info("Column order doesn't matter — headers are auto-detected.")
    blank()

    campaigns = load_campaigns()

    if not yn("Paste Dripify data now?", default='y'):
        info("Skipping — campaign numbers unchanged.")
        return campaigns

    print(f"\n  {B}Paste below. Press Enter when done.{R}")
    blank()

    pasted = read_paste()

    if not pasted:
        warn("Nothing pasted — skipping.")
        return campaigns

    parsed = parse_dripify_paste(pasted)

    if not parsed:
        warn("Could not parse pasted data.")
        info("Expected tab-separated rows with columns: Campaign Name, All Leads, Accepted, Responded")
        info("Check that you copied the table (not just a single cell) and try again.")
        return campaigns

    blank()
    print(f"  {B}Parsed {len(parsed)} campaign rows. Comparing against CSV...{R}")
    blank()

    updated     = 0
    new_camps   = []
    no_change   = 0

    for p in parsed:
        match = find_match(campaigns, p['name'])

        if match:
            old = (int(match['leads_sent']), int(match['accepted']), int(match['responded']))
            new = (p['leads'], p['accepted'], p['responded'])
            short = match['campaign_name'].replace('SI8_RV_R4LI_', '')
            if old != new:
                # Show diff
                parts = []
                if old[0] != new[0]: parts.append(f"leads {old[0]}→{new[0]}")
                if old[1] != new[1]: parts.append(f"acc {old[1]}→{new[1]}")
                if old[2] != new[2]: parts.append(f"resp {old[2]}→{new[2]}")
                ok(f"Updated  {short[:50]}  ({', '.join(parts)})")
                match['leads_sent'] = str(new[0])
                match['accepted']   = str(new[1])
                match['responded']  = str(new[2])
                updated += 1
            else:
                info(f"No change  {short[:50]}")
                no_change += 1
        else:
            warn(f"New (not in CSV):  {p['name'][:60]}")
            new_camps.append(p)

    blank()
    print(f"  Updated: {G}{updated}{R}   No change: {no_change}   New: {Y}{len(new_camps)}{R}")

    # Handle new campaigns found in the paste
    for p in new_camps:
        blank()
        if yn(f"Add '{p['name'][:55]}' to campaigns CSV?"):
            new_row = collect_new_campaign_fields(p['name'], p)
            campaigns.append(new_row)
            ok(f"Added: {p['name'].replace('SI8_RV_R4LI_', '')[:55]}")

    if updated or new_camps:
        save_campaigns(campaigns)
        ok(f"Saved dripify-campaigns.csv ({len(campaigns)} campaigns)")
    else:
        info("No changes written.")

    return campaigns


# ── Step 3: Additional new campaigns (not in paste) ──────────────────────────

def step3_new_campaigns():
    header(3, 4, "Any Other New Campaigns?")
    info("If you have campaigns that weren't included in the paste above,")
    info("add them here. Otherwise press Enter to skip.")
    blank()

    if not yn("Add more campaigns manually?"):
        info("Skipping.")
        return

    campaigns = load_campaigns()

    while True:
        blank()
        print(f"  {B}New campaign:{R}")
        name      = ask("campaign_name  (full Dripify name)")
        alias     = ask("alias          (Vanessa / Ivy / Lilly / Angel)")
        geo       = ask("geo            (Dubai / England / London / Amsterdam / Singapore / Los Angeles / Berlin / Sydney / Global)")
        target    = ask("target_segment (e.g. Creative Dir — AI Video)")
        sequence  = ask("sequence       (Legal Friction / Hitting a Wall / Blocks AI Campaign / Vetting Takes Weeks / etc.)")
        launch    = ask("launch_date    (e.g. Jun 5 2026)")
        leads     = ask("leads_sent")
        accepted  = ask("accepted")
        responded = ask("responded")

        is_lf  = 'legal friction' in sequence.lower()
        is_cd  = 'creadir' in name.lower() or 'ai video' in target.lower()
        in_cost = 'true' if (is_lf and is_cd) else 'false'

        if in_cost == 'true':
            ok("in_cost_analysis = true  (Legal Friction + CreaDir AI Video)")
        else:
            info(f"in_cost_analysis = false  (sequence: {sequence})")
            if yn("Override to true?"):
                in_cost = 'true'

        campaigns.append({
            'campaign_name':    name,
            'alias':            alias,
            'geo':              geo,
            'target_segment':   target,
            'sequence':         sequence,
            'launch_date':      launch,
            'leads_sent':       leads,
            'accepted':         accepted,
            'responded':        responded,
            'in_cost_analysis': in_cost,
        })
        ok(f"Added: {name.replace('SI8_RV_R4LI_', '')}")

        if not yn("Add another?"):
            break

    save_campaigns(campaigns)
    ok(f"Saved dripify-campaigns.csv ({len(campaigns)} campaigns total)")


# ── Step 4: Run report ────────────────────────────────────────────────────────

def step4_run_report(supabase_path):
    header(4, 4, "Generating Report")
    info(f"Running: python3 tools/campaign-report/report.py")
    blank()

    stdout, stderr, code = run_report(supabase_path=supabase_path)

    if code != 0:
        warn("Script error:")
        print(stderr[:800])
        return False

    for line in stdout.strip().split('\n'):
        if line.strip():
            info(line)

    if not os.path.exists(REPORT_MD):
        warn("Report file not written.")
        return False

    with open(REPORT_MD, encoding='utf-8') as f:
        content = f.read()

    # Show Key Insights
    m = re.search(r'## Key Insights\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
    if m:
        blank()
        print(f"  {B}Key Insights:{R}")
        for line in m.group(1).strip().split('\n'):
            if line.strip():
                print(f"  {line}")

    # Show Cost Efficiency table header + rows
    m2 = re.search(r'((?:\| Geo \|.+\n)(?:\|[-| ]+\n)(?:\| \*\*.+\n)+)', content)
    if m2:
        blank()
        print(f"  {B}Cost Efficiency ($/warm reply):{R}")
        for line in m2.group(1).strip().split('\n'):
            print(f"  {line}")

    blank()
    ok(f"Report written: 03_Sales/CAMPAIGN-PERFORMANCE-LOG.md")
    return True


# ── Step 5: Call verification ─────────────────────────────────────────────────

def step5_verify_calls(supabase_path):
    header(5, 4, "Call Request Verification")
    blank()
    info("For each warm lead below, read their reply and decide:")
    info("  CALL = they explicitly asked for a meeting / demo / walkthrough in their own words")
    info("  NOT a call: 'nice to e-meet you', rejection + 'no need for a meeting',")
    info("              consultant who sent their own Calendly, passive 'happy to chat if needed'")
    blank()

    with open(REPORT_MD, encoding='utf-8') as f:
        content = f.read()

    geo_calls = load_geo_calls()

    # Extract Call Verification Checklist section
    m = re.search(r'### Call Verification Checklist(.*?)$', content, re.DOTALL)
    if not m:
        warn("Call verification section not found in report.")
        return

    checklist = m.group(1)

    # Parse each geo block: **GeoName** (N warm leads): ...leads...
    geo_blocks = re.findall(
        r'\*\*([^*]+)\*\*\s+\((\d+) warm leads?\):(.*?)(?=\n\*\*|\Z)',
        checklist,
        re.DOTALL
    )

    updated = False
    for geo, count_str, leads_text in geo_blocks:
        geo = geo.strip()
        current = geo_calls.get(geo, '0')
        blank()
        print(f"  {B}{'─'*50}{R}")
        print(f"  {B}{geo}{R}   ({count_str} warm leads in Supabase CSV)  "
              f"{DIM}current verified calls: {current}{R}")

        # Show each lead
        leads = re.findall(r'- (.+?)\n\s+> "(.+?)"', leads_text)
        for name_line, reply in leads:
            print(f"\n    {B}·{R} {name_line.strip()}")
            preview = reply.strip()[:160]
            ellipsis = '...' if len(reply.strip()) > 160 else ''
            print(f"      \"{preview}{ellipsis}\"")

        blank()
        new_val = ask(f"Verified call requests for {geo}", default=current)
        try:
            int(new_val)
            if new_val != str(current):
                geo_calls[geo] = new_val
                ok(f"{geo}: {current} → {new_val}")
                updated = True
            else:
                info(f"{geo}: unchanged ({current})")
        except ValueError:
            warn(f"Invalid — keeping {current}")

    # Handle geos with 0 warm leads that still have calls tracked
    for geo, calls in geo_calls.items():
        if not any(geo.strip() == b[0].strip() for b in geo_blocks):
            blank()
            new_val = ask(f"{geo} — no warm leads in CSV. Verified calls", default=calls)
            try:
                int(new_val)
                if new_val != str(calls):
                    geo_calls[geo] = new_val
                    ok(f"{geo}: {calls} → {new_val}")
                    updated = True
            except ValueError:
                pass

    if updated:
        save_geo_calls(geo_calls)
        ok("Saved data/geo-cost-inputs.csv")
        blank()
        info("Re-running report with updated call counts...")
        stdout, stderr, code = run_report(supabase_path=supabase_path)
        if code == 0:
            with open(REPORT_MD, encoding='utf-8') as f:
                content2 = f.read()
            m2 = re.search(r'((?:\| Geo \|.+\n)(?:\|[-| ]+\n)(?:\| \*\*.+\n)+)', content2)
            if m2:
                blank()
                print(f"  {B}Final Cost Efficiency Table:{R}")
                for line in m2.group(1).strip().split('\n'):
                    print(f"  {line}")
            ok("Final report written.")
        else:
            warn("Re-run error:"); print(stderr[:400])
    else:
        info("No call counts changed.")


# ── Commit ────────────────────────────────────────────────────────────────────

def step_commit():
    blank()
    print(f"  {B}{'─'*62}{R}")
    blank()

    if not yn("Commit this report to git?"):
        info("Skipping commit.")
        return

    with open(DRIP_CSV, encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    n_camps    = len(rows)
    total_leads = sum(int(r['leads_sent']) for r in rows)
    month       = date.today().strftime('%B %Y')
    msg = (f"Sales: {month} campaign report — {n_camps} campaigns, {total_leads:,} leads\n\n"
           "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>")

    subprocess.run(
        ['git', 'add',
         'data/dripify-campaigns.csv',
         'data/geo-cost-inputs.csv',
         '03_Sales/CAMPAIGN-PERFORMANCE-LOG.md'],
        cwd=REPO, capture_output=True
    )
    r = subprocess.run(['git', 'commit', '-m', msg], capture_output=True, text=True, cwd=REPO)
    if r.returncode == 0:
        ok(f"Committed: Sales: {month} campaign report — {n_camps} campaigns, {total_leads:,} leads")
    else:
        warn("Commit failed (nothing to commit, or hook error):")
        if r.stderr: print(f"  {r.stderr[:300]}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{B}{C}  SI8 Campaign Performance Report Wizard{R}")
    print(f"  {DIM}Monthly Dripify LinkedIn outreach analysis{R}")
    print(f"  {DIM}Reference: 03_Sales/CAMPAIGN-REPORT-METHODOLOGY.md{R}")

    supabase_path = step1_supabase()
    step2_dripify()
    step3_new_campaigns()

    if not step4_run_report(supabase_path):
        sys.exit(1)

    step5_verify_calls(supabase_path)
    step_commit()

    print(f"\n{B}{G}  Done!{R}  Report: 03_Sales/CAMPAIGN-PERFORMANCE-LOG.md\n")


if __name__ == '__main__':
    main()
