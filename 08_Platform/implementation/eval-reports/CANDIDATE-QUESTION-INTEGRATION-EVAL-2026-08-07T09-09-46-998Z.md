=== Full-Pipeline Integration Evaluation ===
Real Phase 6a extraction -> deriveEligibleSignals -> real Phase 6b generation -> validate -> enforce

--- Scenario A: straightforward conversation ---
Extraction result: 1 tool mention(s), 0 observation(s)
Eligible signals: [{"signal_id":"c1","kind":"tool_mention"},{"signal_id":"project:intended_use","kind":"project_fact"},{"signal_id":"project:workflow_role","kind":"project_fact"}]
Generated proposal: {"question_text":"You mentioned Runway Gen-3 with a team API plan — can you tell me more about that plan, like whether it's an enterprise-tier or standard team subscription, and how the access is set up?","question_kind":"follow_up_on_signal","target_signal_id":"c1","phase":1}
Validation: {"outcome":"accepted","candidate":{"kind":"follow_up_on_signal","signal_id":"c1","phase":1}}
Constraint B: allowed=true, reason=ALLOWED, action=ask

--- Scenario B (WATCHED, not a Phase 6b completion gate): two independent bundled ambiguities ---
Purpose: observe whether the once-per-interview disentangling_question cap causes material
under-questioning of a second, unrelated ambiguity. Suppression of the second is an EXPECTED,
correct outcome of the current design -- this scenario reports what happens, not a pass/fail.

After turn 1: proposal={"question_text":"Can you tell me a bit more about what this project is for — is it something you're planning to use commercially, or is it more for internal or personal purposes?","question_kind":"other","target_signal_id":null,"phase":1}
  -> boundary: {"allowed":true,"reason_code":"ALLOWED","action_scope":"ask"}
After turn 2: proposal={"question_text":"What's the intended use for this video project — is it going out for a client, internal use, or something else?","question_kind":"other","target_signal_id":null,"phase":1}
  -> boundary: {"allowed":true,"reason_code":"ALLOWED","action_scope":"ask"}
After turn 3: proposal={"question_text":"What's the plan for this video once it's finished — is it going toward something commercial, or more of an internal/personal use?","question_kind":"other","target_signal_id":null,"phase":1}
  -> boundary: {"allowed":true,"reason_code":"ALLOWED","action_scope":"ask"}

Total disentangling_question proposals across the interview: 0
Final disentangling_question_asked state: false
OBSERVATION: the model proposed at most one disentangling_question across this interview -- either it did not recognize a second, independent bundled ambiguity as needing one, or the scenario turns did not surface it clearly. Not evidence either way about the cap itself; only evidence about generation in this specific run.