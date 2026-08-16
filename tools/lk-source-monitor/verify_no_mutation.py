#!/usr/bin/env python3
"""
Static proof that monitor.py never writes to GOVERNED-CLAIMS.md or
topic-claims-fixture.ts (LK Phase 1, 2026-08-16).

This is the Python-side equivalent of the TypeScript subsystem-boundary
tests (__tests__/crc-engine/subsystem-boundaries.test.ts) -- a grep-based
structural check, run in CI immediately before/after monitor.py, that fails
loudly if a future edit ever gives this automation a code path to mutate
governed knowledge directly.

Exit code 0 = proof holds. Exit code 1 = proof violated; do not merge.
"""

import re
import sys
from pathlib import Path

MONITOR_PATH = Path(__file__).parent / "monitor.py"

# Every CODE line (comments excluded) that references either protected
# constant must be one of: its own `NAME = ...` definition, or a read-only
# method call (`.exists()`, `.read_text(...)`). Any other usage on a line
# mentioning the constant -- in particular any write-mode call -- fails the
# check. This directly encodes the actual invariant (read-only access only)
# rather than a brittle total-occurrence count, so it doesn't false-positive
# on this file's own explanatory comments.
PROTECTED_CONSTANTS = ["GOVERNED_CLAIMS_PATH", "TOPIC_CLAIMS_FIXTURE_PATH"]
SAFE_LINE_PATTERNS = [
    re.compile(r"^\s*(GOVERNED_CLAIMS_PATH|TOPIC_CLAIMS_FIXTURE_PATH)\s*="),  # definition
    re.compile(r"\.exists\(\)"),   # read-only existence check
    re.compile(r"\.read_text\("),  # read-only content load
]


def strip_comment(line: str) -> str:
    # monitor.py never puts '#' inside a string literal on a line that also
    # references either protected constant, so a plain split is sufficient
    # here (this file is small and hand-written, not adversarial input).
    return line.split("#", 1)[0]


def main() -> int:
    if not MONITOR_PATH.exists():
        print(f"FAIL: {MONITOR_PATH} not found", file=sys.stderr)
        return 1

    source = MONITOR_PATH.read_text(encoding="utf-8")
    lines = source.splitlines()
    ok = True
    definition_seen = {name: False for name in PROTECTED_CONSTANTS}
    readonly_use_seen = {name: False for name in PROTECTED_CONSTANTS}

    for line_no, raw_line in enumerate(lines, start=1):
        code = strip_comment(raw_line)
        for name in PROTECTED_CONSTANTS:
            if not re.search(rf"\b{re.escape(name)}\b", code):
                continue
            if any(p.search(code) for p in SAFE_LINE_PATTERNS):
                if re.match(rf"^\s*{re.escape(name)}\s*=", code):
                    definition_seen[name] = True
                else:
                    readonly_use_seen[name] = True
                continue
            print(f"FAIL: line {line_no} references {name} in a way that is not the definition or a recognized read-only call: {code.strip()}", file=sys.stderr)
            ok = False

    for name in PROTECTED_CONSTANTS:
        if not definition_seen[name]:
            print(f"FAIL: {name}'s own definition line was not found -- has it been renamed or removed?", file=sys.stderr)
            ok = False
        if not readonly_use_seen[name]:
            print(f"FAIL: {name} is never actually used for a read-only load -- is its loader function still wired up?", file=sys.stderr)
            ok = False
        if definition_seen[name] and readonly_use_seen[name]:
            print(f"OK: {name} is only ever defined and read-only-loaded, never written")

    if ok:
        print("\nPASS: monitor.py has no write code path to GOVERNED-CLAIMS.md or topic-claims-fixture.ts.")
        return 0
    else:
        print("\nFAIL: see above.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
