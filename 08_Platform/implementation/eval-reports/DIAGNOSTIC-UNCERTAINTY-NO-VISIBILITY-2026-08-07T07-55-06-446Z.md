
=== Targeted Diagnostic: uncertainty_no_visibility ===
Model: claude-sonnet-5 | No prompt/schema changes made for this run.
Total trials: 45 (original x20, 5 paraphrases x5 each)

No-visibility preservation rate:              100.0% (45/45)
Confirmed-absence misclassification rate:      0.0% (0/45)
Merged-into-flat-"confirmed" rate (informational, not a named required metric): 0.0% (0/45)
Valid multi-candidate decomposition rate:      100.0% (30/30 trials whose turn states a directly-supported secondary owner fact)
Invented-fact rate:                            0.0% (0/76 candidates)
Scope issues (non-current_project where current_project expected): 0

Token usage: 127630 input / 19173 output across 45 trials
Average latency: 6013ms per call

--- By turn variant ---
original (20 trials): preserved 100.0% (20/20), confirmed-absence misclass 0.0% (0/20)
paraphrase_1_not_involved (5 trials -- Lenient: wording does not name an alternate knower, unlike the other turns -- unresolved_no_visibility and unknown both accepted.): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_2_someone_else_handles (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_3_may_be_review (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_4_billing_approval_details (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_5_another_teammate (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)

--- Candidate-shape distribution (candidate count per trial) ---
1 candidate(s): 14 trial(s) (31.1%)
2 candidate(s): 31 trial(s) (68.9%)

--- Visibility-clause confidence-value distribution ---
unresolved_no_visibility: 45 (100.0%)

No failures -- every trial preserved lack-of-visibility correctly.

=== Provisional Acceptance Standard ===
>= 90% no-visibility preservation: MET (100.0%)
0% conversion into confirmed absence: MET (0/45)
0 invented facts: MET (0)