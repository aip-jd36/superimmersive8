#!/usr/bin/env python3
"""
SI8 CRM pipeline index — read-only structural check.

Checks the machine-readable PIPELINE table in 03_Sales/CRM.md (between
<!-- pipeline:start --> and <!-- pipeline:end -->) against the per-lead
files in 03_Sales/crm/:

  1. Every row has the same cell count as the header. Cells are split the
     same way digest.py's parse_pipeline() splits them (plain '|', no
     escaping), so a failure here means digest.py silently drops that row.
  2. No duplicate row IDs.
  3. Every `crm/<slug>.md` reference in the table resolves to a file.
  4. Every crm/*.md lead file (except README.md) is referenced by at least
     one table row.

Never writes anything. Exit 0 = no structural errors, 1 = errors found,
2 = could not read the inputs.

Out of scope (deliberately): stage vocabulary, Section 1 snapshot totals,
message-history completeness, and CRC Lifecycle / Product A roster
attribution (the rosters are not repository-controlled). Per-file
frontmatter is validated separately by tools/crm-core/cli/validate_crm.py.

Usage (from repo root):
    python tools/daily-digest/check_pipeline.py
    python tools/daily-digest/check_pipeline.py --crm-md PATH --crm-dir PATH
"""
import argparse
import os
import re
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DEFAULT_CRM_MD = os.path.join(REPO_ROOT, '03_Sales', 'CRM.md')
DEFAULT_CRM_DIR = os.path.join(REPO_ROOT, '03_Sales', 'crm')

START = '<!-- pipeline:start -->'
END = '<!-- pipeline:end -->'
REF_RE = re.compile(r'crm/([A-Za-z0-9._-]+\.md)')


def split_cells(line):
    # Must match digest.py parse_pipeline(): line.split('|')[1:-1]
    return [c.strip() for c in line.split('|')[1:-1]]


def check(crm_md_text, crm_files):
    """Returns a list of error strings. crm_files = set of filenames in crm/."""
    errors = []
    lines = crm_md_text.splitlines()
    try:
        start = next(i for i, l in enumerate(lines) if l.strip() == START)
        end = next(i for i, l in enumerate(lines) if l.strip() == END and i > start)
    except StopIteration:
        return [f'pipeline markers {START} / {END} not found']

    table = [(i + 1, l) for i, l in enumerate(lines[start + 1:end], start=start + 1)
             if l.strip().startswith('|')]
    if len(table) < 2:
        return ['pipeline table has no header/separator']

    header_lineno, header = table[0]
    n = len(split_cells(header))
    seen = {}
    referenced = set()

    for lineno, line in table[2:]:  # skip header + separator
        cells = split_cells(line)
        row_id = cells[0] if cells else '?'
        if len(cells) != n:
            errors.append(f'line {lineno} ({row_id}): {len(cells)} cells, header has {n} '
                          f'-- digest.py will drop this row (unescaped "|" inside a cell?)')
        if not row_id:
            errors.append(f'line {lineno}: empty id cell')
        elif row_id in seen:
            errors.append(f'line {lineno} ({row_id}): duplicate id, first seen on line {seen[row_id]}')
        else:
            seen[row_id] = lineno
        for ref in REF_RE.findall(line):
            referenced.add(ref)
            if ref not in crm_files:
                errors.append(f'line {lineno} ({row_id}): references crm/{ref}, which does not exist')

    for f in sorted(crm_files - referenced):
        errors.append(f'crm/{f} is not referenced by any pipeline row')

    return errors


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--crm-md', default=DEFAULT_CRM_MD)
    ap.add_argument('--crm-dir', default=DEFAULT_CRM_DIR)
    args = ap.parse_args(argv)
    try:
        with open(args.crm_md, encoding='utf-8') as fh:
            text = fh.read()
        files = {f for f in os.listdir(args.crm_dir)
                 if f.endswith('.md') and f != 'README.md'
                 and os.path.isfile(os.path.join(args.crm_dir, f))}
    except OSError as e:
        print(f'ERROR: {e}', file=sys.stderr)
        return 2

    errors = check(text, files)
    for e in errors:
        print(f'ERROR: {e}')
    if errors:
        print(f'\n{len(errors)} structural error(s).')
        return 1
    print(f'Pipeline index OK ({len(files)} lead files, all referenced).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
