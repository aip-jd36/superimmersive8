"""
SI8-INTEL-NEWS-4A/4B -- Living Knowledge boundary + genericity tests.

News Intelligence is an observational/input system only: it may surface an
"action": "review_living_knowledge" signal for a human, but it must never
itself write, mutate, or invoke Living Knowledge / CRC governance
machinery. Nothing in this repository's Python News Intelligence tooling
can literally import TypeScript modules from 08_Platform/app/lib -- that
boundary is partly enforced by the toolchain itself. This test proves the
narrower, meaningful claim: every module in the Development-centric
pipeline imports only a small, explicit, intelligence-only allowlist, so a
future edit that added a database/network write path would have to add a
new import this test does not recognize -- and fail.

Mirrors the static-analysis spirit of
tools/lk-source-monitor/verify_no_mutation.py, adapted to Python via
import-allowlisting rather than "every reference to a path constant must
be read-only" (the right idiom for a different language/architecture, same
underlying principle: statically prove absence of a mutation capability).

SI8-INTEL-NEWS-4B additionally asserts genericity: no NEWS-3 cluster name
is hardcoded into the priority/composition/triage logic, and no
persistence/cross-run-memory mechanism has been introduced.
"""

import ast
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

NEWS_DIGEST_DIR = Path(__file__).resolve().parent.parent

# Governed-knowledge-flavored substrings that must never appear in these
# modules' source at all -- not in an import, not in a string literal, not
# in a comment referencing a file this module would touch. A hit here
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

# Persistence/cross-run-memory substrings -- SI8-INTEL-NEWS-4B explicitly
# defers durable Development identity/history to a later milestone; none
# of the Development-centric modules may introduce a database, file-based
# key/value store, or pickle-style persistence mechanism.
_FORBIDDEN_PERSISTENCE_SUBSTRINGS = (
    "sqlite3",
    "shelve",
    "pickle",
    ".db",
    "DIGEST_LOG_PATH",  # log writing stays in digest.py's own orchestration layer, not in these pure modules
    "AUDIT_LOG_PATH",   # same -- audit.py builds a RunAudit, it never touches a file path itself
)

# Every module in the Development-centric pipeline must import only from
# this allowlist. None needs network access, a database driver, or any
# CRC/Living Knowledge module -- each receives an already-constructed
# model client via dependency injection instead of reaching out for one
# itself.
_ALLOWED_IMPORT_ROOTS = {
    "__future__",
    "json",
    "re",
    "uuid",
    "dataclasses",
    "datetime",
    "typing",
    "development",       # interpretation.py / triage.py / prioritization.py / composition.py / audit.py's own intra-package imports
    "interpretation",    # prioritization.py / composition.py
    "prioritization",    # composition.py / audit.py
    "triage",            # composition.py / audit.py
    "composition",       # audit.py (IntelligenceDigest)
    "policy",            # triage.py / prioritization.py / composition.py
}

_MODULES_UNDER_TEST = [
    "development.py",
    "interpretation.py",
    "triage.py",
    "prioritization.py",
    "composition.py",
    "policy.py",
    "audit.py",
]

# The exact NEWS-3 cluster identifiers (tools/news-digest/keywords.py) --
# none of these may appear, hardcoded, anywhere in the priority/triage/
# composition logic. Cluster names are legitimate as DATA flowing through
# (Development.clusters, populated by digest.py from keywords.py), never
# as a literal string a prioritizer/composer branches on.
_KNOWN_CLUSTER_NAMES = (
    "litigation_commercial_media_core",
    "litigation_named_case_tracker",
    "regulation_policy_commercial_media",
    "provider_commercial_terms",
    "living_knowledge_domain_signals",
    "buyer_risk_governance_signals",
    "commercial_adoption_validation",
    "provenance_authenticity_infrastructure",
    "material_capability_changes",
)

_GENERIC_MODULES = ["triage.py", "prioritization.py", "composition.py", "audit.py"]


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
        """No module may construct its own model/network/database client
        -- each must receive one via dependency injection (the `client=`
        parameter), never instantiate `Anthropic()`, `requests`, or any
        client themselves. This keeps every network/DB access point in
        the codebase visible at the call site, not hidden inside an
        intelligence module."""
        for filename in _MODULES_UNDER_TEST:
            with self.subTest(filename=filename):
                source = (NEWS_DIGEST_DIR / filename).read_text(encoding="utf-8")
                self.assertNotIn("Anthropic(", source)
                self.assertNotIn("requests.", source)


class TestNoCrossRunMemoryIntroduced(unittest.TestCase):
    """SI8-INTEL-NEWS-4B explicitly defers durable Development identity/
    cross-run history to a later milestone. Development.id stays an
    ephemeral uuid4 (NEWS-4A); nothing here may introduce a database, a
    file-based key/value store, or a persistence mechanism of any kind."""

    def test_no_persistence_substrings(self):
        for filename in _MODULES_UNDER_TEST:
            with self.subTest(filename=filename):
                code = _code_only((NEWS_DIGEST_DIR / filename).read_text(encoding="utf-8"))
                for forbidden in _FORBIDDEN_PERSISTENCE_SUBSTRINGS:
                    self.assertNotIn(
                        forbidden, code,
                        f"{filename} references '{forbidden}' -- Development-centric modules "
                        "must remain current-run-only; DIGEST-LOG writing stays in digest.py's "
                        "own orchestration layer, and no other persistence mechanism is authorized.",
                    )

    def test_development_id_still_ephemeral_uuid4(self):
        import development
        d1 = development.build_developments([{"title": "a", "clusters": set(), "queries": set(), "pub_date": None}])
        d2 = development.build_developments([{"title": "a", "clusters": set(), "queries": set(), "pub_date": None}])
        self.assertNotEqual(d1[0].id, d2[0].id, "Development identity must remain ephemeral/random, not derived from stable content (that would be a quiet step toward cross-run identity)")


class TestGenericAcrossClustersNoDomainSpecificOrchestration(unittest.TestCase):
    """SI8-INTEL-NEWS-4B: triage/priority/composition must work identically
    for any cluster, jurisdiction, legal theory, or provider -- none of
    those concepts may be named in code (only ever handled as opaque data
    flowing through Development.clusters / BoundedInterpretation text)."""

    def test_no_known_cluster_name_hardcoded(self):
        for filename in _GENERIC_MODULES:
            with self.subTest(filename=filename):
                code = _code_only((NEWS_DIGEST_DIR / filename).read_text(encoding="utf-8"))
                for cluster_name in _KNOWN_CLUSTER_NAMES:
                    self.assertNotIn(
                        cluster_name, code,
                        f"{filename} hardcodes cluster name '{cluster_name}' -- triage/priority/"
                        "composition must be generic across every cluster, not special-case any one.",
                    )

    def test_no_domain_specific_keyword_orchestration(self):
        """No jurisdiction, legal theory, or provider name may drive a
        code branch in the generic pipeline stages."""
        banned_domain_terms = (
            "california", "sb 1050", "copyright", "trademark", "lawsuit",
            "runway", "kling", "pika", "elevenlabs", "adobe", "synthesia",
            "gdpr", "eu ai act", "ftc", "asa",
        )
        for filename in _GENERIC_MODULES:
            with self.subTest(filename=filename):
                code = _code_only((NEWS_DIGEST_DIR / filename).read_text(encoding="utf-8")).lower()
                for term in banned_domain_terms:
                    self.assertNotIn(
                        term, code,
                        f"{filename} references domain-specific term '{term}' -- this pipeline "
                        "must remain generic, with no per-topic/per-provider/per-jurisdiction code path.",
                    )


if __name__ == "__main__":
    unittest.main()
