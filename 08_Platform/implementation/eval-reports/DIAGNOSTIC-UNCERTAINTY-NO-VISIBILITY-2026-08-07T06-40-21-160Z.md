
=== Targeted Diagnostic: uncertainty_no_visibility ===
Model: claude-sonnet-5 | No prompt/schema changes made for this run.
Total trials: 45 (original x20, 5 paraphrases x5 each)

No-visibility preservation rate:              95.6% (43/45)
Confirmed-absence misclassification rate:      4.4% (2/45)
Merged-into-flat-"confirmed" rate (informational, not a named required metric): 0.0% (0/45)
Valid multi-candidate decomposition rate:      53.3% (16/30 trials whose turn states a directly-supported secondary owner fact)
Invented-fact rate:                            0.0% (0/70 candidates)
Scope issues (non-current_project where current_project expected): 0

Token usage: 116335 input / 29686 output across 45 trials
Average latency: 7805ms per call

--- By turn variant ---
original (20 trials): preserved 95.0% (19/20), confirmed-absence misclass 5.0% (1/20)
paraphrase_1_not_involved (5 trials -- Lenient: wording does not name an alternate knower, unlike the other turns -- unresolved_no_visibility and unknown both accepted.): preserved 80.0% (4/5), confirmed-absence misclass 20.0% (1/5)
paraphrase_2_someone_else_handles (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_3_may_be_review (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_4_billing_approval_details (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_5_another_teammate (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)

--- Candidate-shape distribution (candidate count per trial) ---
1 candidate(s): 20 trial(s) (44.4%)
2 candidate(s): 25 trial(s) (55.6%)

--- Visibility-clause confidence-value distribution ---
unresolved_no_visibility: 43 (95.6%)
confirmed_absent: 2 (4.4%)

=== Raw Output For Every Failure (2) ===

--- original (trial 16) ---
Turn: "Honestly, I don't have access to that -- someone else on the team manages billing and approvals."
Visibility-clause candidate: {"proposal_id":"c1","turn":1,"raw_text":"I don't have access to that","kind":"project_fact","raw_fact_field":"workflow_role","fact_confidence_hint":"confirmed_absent"}
Full candidate output: [
  {
    "proposal_id": "c1",
    "turn": 1,
    "raw_text": "I don't have access to that",
    "kind": "project_fact",
    "raw_fact_field": "workflow_role",
    "fact_confidence_hint": "confirmed_absent"
  },
  {
    "proposal_id": "c2",
    "turn": 1,
    "raw_text": "someone else on the team manages billing and approvals",
    "kind": "scoped_observation",
    "scope": "current_project",
    "workflow_stage": "T2",
    "observation_confidence_hint": "confirmed"
  }
]

--- paraphrase_1_not_involved (trial 4) ---
Turn: "I'm not involved in that part, so I don't know."
Visibility-clause candidate: {"proposal_id":"c1","turn":1,"raw_text":"I'm not involved in that part, so I don't know.","kind":"project_fact","raw_fact_field":"workflow_role","fact_confidence_hint":"confirmed_absent"}
Full candidate output: [
  {
    "proposal_id": "c1",
    "turn": 1,
    "raw_text": "I'm not involved in that part, so I don't know.",
    "kind": "project_fact",
    "raw_fact_field": "workflow_role",
    "fact_confidence_hint": "confirmed_absent"
  },
  {
    "proposal_id": "c2",
    "turn": 1,
    "raw_text": "I'm not involved in that part, so I don't know.",
    "kind": "scoped_observation",
    "scope": "current_project",
    "observation_confidence_hint": "unresolved_no_visibility",
    "low_confidence": true
  }
]

=== Provisional Acceptance Standard ===
>= 90% no-visibility preservation: MET (95.6%)
0% conversion into confirmed absence: NOT MET (2/45)
0 invented facts: MET (0)