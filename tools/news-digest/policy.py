"""
SI8 News Intelligence -- centralized triage/priority policy constants
(SI8-INTEL-NEWS-4B).

Every value here is a PROVISIONAL RESOURCE-CONTROL VALUE, not a semantic
truth about what matters to SI8. They exist to bound model-call volume,
cost, and email length -- never to express materiality. See triage.py's own
module docstring for the full architectural distinction between "resource
allocation" (this file, triage.py) and "materiality judgment"
(prioritization.py).

Centralized deliberately so no orchestration code carries an unexplained
magic number -- and so the numbers can be revisited after the first real
Production acceptance run (SI8-INTEL-NEWS-4B Phase 16) without hunting
through multiple files.
"""

# Off-topic exclusion floor (triage.py): a Development whose STRONGEST
# contributing article's trimmed relevance score falls below this is
# excluded from triage entirely. Reuses the one part of the legacy
# per-article score that is reliable -- rough in-domain/off-topic
# separation -- never its "how important" framing. On a 1-10 scale, this
# mirrors the "skip" (1-3) boundary the legacy score_batch already used.
TRIAGE_RELEVANCE_FLOOR = 3

# Global cap (triage.py): the maximum number of Developments per run that
# receive an expensive bounded-interpretation model call. A cost/latency
# control only -- never treated as a materiality cutoff (a Development
# excluded by the cap is DEFERRED, not judged unimportant; see triage.py).
TRIAGE_GLOBAL_ADMISSION_CAP = 40

# Per-cluster admission floor (triage.py): minimum number of Developments
# admitted per NEWS-3 cluster actually represented in this run (subject to
# the global cap), so one high-volume/noisy cluster cannot mechanically
# starve interpretation of every other cluster's Developments. A
# fairness-of-consideration guarantee -- it decides who gets READ, never
# how a Development is judged once read.
TRIAGE_PER_CLUSTER_ADMISSION_FLOOR = 2

# Priority batch size (prioritization.py): how many admitted, interpreted
# Developments are classified together in one structured priority-
# classification model call. Mirrors digest.py's existing score_batch
# batching pattern, giving the classifier genuine cross-Development
# comparative context within a batch while bounding call size.
PRIORITY_BATCH_SIZE = 8

# Executive Summary policy (composition.py): the summary composer may see
# at most this many HIGH-tier Developments (bounds prompt size and keeps
# the synthesis genuinely "executive"), and may emit at most this many
# summary statements.
EXECUTIVE_SUMMARY_MAX_SOURCE_DEVELOPMENTS = 10
EXECUTIVE_SUMMARY_MAX_STATEMENTS = 5
