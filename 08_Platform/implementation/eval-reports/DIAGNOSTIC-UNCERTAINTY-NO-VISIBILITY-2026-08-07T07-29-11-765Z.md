
=== Targeted Diagnostic: uncertainty_no_visibility ===
Model: claude-sonnet-5 | No prompt/schema changes made for this run.
Total trials: 45 (original x20, 5 paraphrases x5 each)

No-visibility preservation rate:              93.3% (42/45)
Confirmed-absence misclassification rate:      6.7% (3/45)
Merged-into-flat-"confirmed" rate (informational, not a named required metric): 0.0% (0/45)
Valid multi-candidate decomposition rate:      63.3% (19/30 trials whose turn states a directly-supported secondary owner fact)
Invented-fact rate:                            0.0% (0/71 candidates)
Scope issues (non-current_project where current_project expected): 0

Token usage: 116335 input / 27695 output across 45 trials
Average latency: 8039ms per call

--- By turn variant ---
original (20 trials): preserved 90.0% (18/20), confirmed-absence misclass 10.0% (2/20)
paraphrase_1_not_involved (5 trials -- Lenient: wording does not name an alternate knower, unlike the other turns -- unresolved_no_visibility and unknown both accepted.): preserved 80.0% (4/5), confirmed-absence misclass 20.0% (1/5)
paraphrase_2_someone_else_handles (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_3_may_be_review (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_4_billing_approval_details (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)
paraphrase_5_another_teammate (5 trials): preserved 100.0% (5/5), confirmed-absence misclass 0.0% (0/5)

--- Candidate-shape distribution (candidate count per trial) ---
1 candidate(s): 21 trial(s) (46.7%)
2 candidate(s): 22 trial(s) (48.9%)
3 candidate(s): 2 trial(s) (4.4%)

--- Visibility-clause confidence-value distribution ---
unresolved_no_visibility: 42 (93.3%)
confirmed_absent: 3 (6.7%)

=== Raw Output For Every Failure (3) ===

--- original (trial 5) ---
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
    "observation_confidence_hint": "confirmed"
  }
]

--- original (trial 8) ---
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

--- paraphrase_1_not_involved (trial 5) ---
Turn: "I'm not involved in that part, so I don't know."
Visibility-clause candidate: {"proposal_id":"c1","turn":1,"raw_text":"I'm not involved in that part, so I don't know.","kind":"project_fact","raw_fact_field":"workflow_role","fact_confidence_hint":"confirmed_absent","fact_value_hint":"not involved in that part","low_confidence":true}
Full candidate output: [
  {
    "proposal_id": "c1",
    "turn": 1,
    "raw_text": "I'm not involved in that part, so I don't know.",
    "kind": "project_fact",
    "raw_fact_field": "workflow_role",
    "fact_confidence_hint": "confirmed_absent",
    "fact_value_hint": "not involved in that part",
    "low_confidence": true
  }
]

=== Provisional Acceptance Standard ===
>= 90% no-visibility preservation: MET (93.3%)
0% conversion into confirmed absence: NOT MET (3/45)
0 invented facts: MET (0)