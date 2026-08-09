
=== Candidate-Question Generation Quality Report (isolated, no boundary enforcement) ===
Model: claude-sonnet-5 | 8 fixtures x 2 trials = 16 total

has_candidate rate:            50.0% (8/16)
Valid signal-reference rate:   100.0% (16/16) -- target_signal_id null or found in the eligible set
Token usage: 37044 input / 3169 output across 16 trials
Average latency: 5422ms per call

--- By fixture ---
rich_signal: has_candidate 0/2, kinds: [null,null]
no_signal: has_candidate 2/2, kinds: ["uncertainty_clarification","uncertainty_clarification"]
current_vs_historical: has_candidate 2/2, kinds: ["follow_up_on_signal","follow_up_on_signal"]
ambiguous_uncertain: has_candidate 2/2, kinds: ["follow_up_on_signal","follow_up_on_signal"]
full_opt_out: has_candidate 0/2, kinds: [null,null]
mixed_multi_signal: has_candidate 0/2, kinds: [null,null]
ambiguous_multi_surface_tool: has_candidate 2/2, kinds: ["follow_up_on_signal","follow_up_on_signal"]
full_phase_1_to_4_trace: has_candidate 0/2, kinds: [null,null]

--- question_kind distribution (among has_candidate=true trials) ---
follow_up_on_signal: 6 (75.0%)
uncertainty_clarification: 2 (25.0%)

No invalid signal references -- every non-null target_signal_id was in the eligible set.