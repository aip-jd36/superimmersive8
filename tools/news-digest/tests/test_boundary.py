"""
SI8-INTEL-NEWS-4A -- Phase 7/9 Living Knowledge boundary test.

News Intelligence is an observational/input system only: it may surface an
"action": "review_living_knowledge" signal for a human, but it must never
itself write, mutate, or invoke Living Knowledge / CRC governance
machinery. Nothing in this repository's Python News Intelligence tooling
can literally import TypeScript modules from 08_Platform/app/lib -- that
boundary is partly enforced by the toolchain itself. This test proves the
narrower, meaningful claim: development.py and interpretation.py import
only a small, explicit, intelligence-only allowlist, so a future edit that
added a database/network write path would have to add a new import this
test does not recognize -- and fail.

Mirrors the static-analysis spirit of
tools/lk-source-monitor/verify_no_mutation.py, adapted to Python via
import-allowlisting rather than "every reference to a path constant must
be read-only" (the right idiom for a different language/architecture, same
underlying principle: statically prove absence of a mutation capability).
"""

import ast
import sys
import unittest
from pathlib import Path

NEWS_DIGEST_DIR = Path(__file__).resolve().parent.parent

# Governed-knowledge-flavored substrings that must never appear in these
# two modules' source at all -- not in an import, not in a string literal,
# not in a comment referencing a file this module would touch. A hit here
# means someone tried to wire a Living Knowledge / CRC / database path into
# what must stay an observational-only tool.
_FORBIDDEN_SUBSTRINGS = (
    "GOVERNED-CLAIMS",
    "topic-claims-fixture",
    "supabase",
    "psycopg",
    "sqlalchemy",
    "crc_eligible",
    "provider_scope",
    "applicability_requirements",
    "08_Platform/app/lib",
)

# development.py / interpretation.py must import only from this allowlist.
# Both currently need nothing beyond the standard library plus each other
# (interpretation.py imports Development from development.py). Neither
# needs network access, a database driver, or any CRC/Living Knowledge
# module -- they receive an already-constructed model client via
# dependency injection instead of reaching out for one themselves.
_ALLOWED_IMPORT_ROOTS = {
    "__future__",
    "json",
    "re",
    "uuid",
    "dataclasses",
    "datetime",
    "typing",
    "development",  # interpretation.py's own intra-package import
}

_MODULES_UNDER_TEST = ["development.py", "interpretation.py"]


def _code_only(source: str) -> str:
    """Strip the module docstring and trailing '#' comments before the
    forbidden-substring scan. Both modules under test document their own
    Living Knowledge boundary in prose (their module docstrings legitimately
    NAME 'GOVERNED-CLAIMS.md' etc. as the thing they must never touch,
    exactly the same self-documenting-comment pattern used elsewhere in
    this repository) -- the substring check must apply to executable code,
    not to a comment disclaiming the very thing it's checking for."""
    tree = ast.parse(source)
    docstring_lines: set[int] = set()
    if (
        tree.body
        and isinstance(tree.body[0], ast.Expr)
        and isinstance(tree.body[0].value, ast.Constant)
        and isinstance(tree.body[0].value.value, str)
    ):
        node = tree.body[0]
        docstring_lines = set(range(node.lineno, (node.end_lineno or node.lineno) + 1))
    out_lines = []
    for i, line in enumerate(source.splitlines(), start=1):
        if i in docstring_lines:
            continue
        out_lines.append(line.split("#", 1)[0])
    return "\n".join(out_lines)


def _imported_roots(source: str) -> set[str]:
    tree = ast.parse(source)
    roots = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                roots.add(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                roots.add(node.module.split(".")[0])
    return roots


class TestLivingKnowledgeBoundary(unittest.TestCase):
    def test_import_allowlist(self):
        for filename in _MODULES_UNDER_TEST:
            with self.subTest(filename=filename):
                source = (NEWS_DIGEST_DIR / filename).read_text(encoding="utf-8")
                roots = _imported_roots(source)
                disallowed = roots - _ALLOWED_IMPORT_ROOTS
                self.assertEqual(
                    disallowed, set(),
                    f"{filename} imports {disallowed}, outside the intelligence-only allowlist "
                    f"{_ALLOWED_IMPORT_ROOTS} -- if this is a genuine new need, it still must not "
                    "be a Living Knowledge/CRC/database write path.",
                )

    def test_no_forbidden_substrings(self):
        for filename in _MODULES_UNDER_TEST:
            with self.subTest(filename=filename):
                code = _code_only((NEWS_DIGEST_DIR / filename).read_text(encoding="utf-8"))
                for forbidden in _FORBIDDEN_SUBSTRINGS:
                    self.assertNotIn(
                        forbidden, code,
                        f"{filename} references '{forbidden}' -- News Intelligence must never "
                        "touch governed Living Knowledge/CRC state.",
                    )

    def test_no_network_or_database_client_construction(self):
        """Neither module may construct its own model/network/database
        client -- both must receive one via dependency injection (the
        `client=` parameter), never instantiate `Anthropic()`, `requests`,
        or any client themselves. This keeps every network/DB access point
        in the codebase visible at the call site, not hidden inside an
        intelligence module."""
        for filename in _MODULES_UNDER_TEST:
            with self.subTest(filename=filename):
                source = (NEWS_DIGEST_DIR / filename).read_text(encoding="utf-8")
                self.assertNotIn("Anthropic(", source)
                self.assertNotIn("requests.", source)


if __name__ == "__main__":
    unittest.main()
