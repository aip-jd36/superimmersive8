/**
 * Fixed evaluation corpus for the real-model extraction evaluator
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6a substage 2).
 *
 * Each scenario is one or more fixed user turns plus a check() that
 * inspects the diagnostics produced by running the REAL extractor's output
 * through the same deterministic pipeline substage 1 already proved
 * (normalizeCandidate -> attestCandidate -> mutation). check() only
 * evaluates the real extractor's candidate quality -- normalization,
 * attestation, and mutation are unit-tested elsewhere and are not what's
 * under test here.
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'
import type { ExtractionDiagnostic, RawUserTurn } from '../extraction'

export interface EvalScenario {
  id: string
  category: string
  description: string
  turns: RawUserTurn[]
  /** diagnosticsByTurn[i] corresponds to turns[i]. */
  check(diagnosticsByTurn: ExtractionDiagnostic[][], finalSU: StructuredUnderstanding): { passed: boolean; notes: string }
}

function allCandidates(diagnosticsByTurn: ExtractionDiagnostic[][]) {
  return diagnosticsByTurn.flat().map((d) => d.candidate)
}

export const EVAL_CORPUS: EvalScenario[] = [
  {
    id: 'single_known_tool',
    category: 'single known tool',
    description: 'One unambiguous tool named in a simple sentence.',
    turns: [{ turn: 1, text: 'We used Runway Gen-3 for the whole thing.' }],
    check(diagnosticsByTurn) {
      const tools = allCandidates(diagnosticsByTurn).filter((c) => c.kind === 'tool_mention')
      const passed = tools.length === 1 && /runway/i.test(tools[0]?.raw_tool_name ?? '')
      return { passed, notes: `tool candidates: ${JSON.stringify(tools.map((t) => t.raw_tool_name))}` }
    },
  },

  {
    id: 'multiple_tools_one_sentence',
    category: 'multiple tools in one sentence',
    description: 'Two distinct tools named together.',
    turns: [{ turn: 1, text: 'We used Runway for the visuals and ElevenLabs for the voiceover.' }],
    check(diagnosticsByTurn) {
      const tools = allCandidates(diagnosticsByTurn).filter((c) => c.kind === 'tool_mention')
      const names = tools.map((t) => (t.raw_tool_name ?? '').toLowerCase())
      const passed = tools.length === 2 && names.some((n) => n.includes('runway')) && names.some((n) => n.includes('eleven'))
      return { passed, notes: `tool candidates: ${JSON.stringify(names)}` }
    },
  },

  {
    id: 'nano_banana_ambiguous',
    category: 'ambiguous Nano Banana',
    description: 'Names the tool with no access-method signal -- must stay unresolved, never guessed.',
    turns: [{ turn: 1, text: 'I used Nano Banana for this one.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = !!d && d.normalization.status === 'known_ambiguous'
      return { passed, notes: `normalization: ${JSON.stringify(d?.normalization)}` }
    },
  },

  {
    id: 'nano_banana_consumer',
    category: 'explicitly consumer-app Nano Banana',
    description: 'Names the tool with a clear consumer-app access-method signal.',
    turns: [{ turn: 1, text: "I used Nano Banana -- just the app on my phone, not anything technical." }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = d?.normalization.status === 'resolved' && (d.normalization as { canonical_identifier: string }).canonical_identifier === 'gemini-consumer-app'
      return { passed, notes: `normalization: ${JSON.stringify(d?.normalization)}` }
    },
  },

  {
    id: 'nano_banana_api',
    category: 'explicitly API Nano Banana',
    description: 'Names the tool with a clear API access-method signal.',
    turns: [{ turn: 1, text: 'I used Nano Banana through the API, with my own developer key.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = d?.normalization.status === 'resolved' && (d.normalization as { canonical_identifier: string }).canonical_identifier === 'gemini-api'
      return { passed, notes: `normalization: ${JSON.stringify(d?.normalization)}` }
    },
  },

  {
    id: 'contradictory_access_surface',
    category: 'contradictory access-surface signals',
    description: 'Both surfaces implied in the same turn -- must stay unresolved rather than pick one.',
    turns: [{ turn: 1, text: 'I used Nano Banana, the app I think, but actually maybe it was through the API -- I forget.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = d?.normalization.status === 'known_ambiguous'
      return { passed, notes: `normalization: ${JSON.stringify(d?.normalization)}` }
    },
  },

  {
    id: 'unrecognized_tool',
    category: 'unrecognized tool',
    description: 'A tool name not in any registry.',
    turns: [{ turn: 1, text: 'We used a tool called Aurora Draft for the concept art.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = d?.normalization.status === 'unrecognized'
      return { passed, notes: `normalization: ${JSON.stringify(d?.normalization)}` }
    },
  },

  {
    id: 'current_and_historical',
    category: 'current-project plus historical-project facts',
    description: 'Distinguishes the current project from a past one on the same topic.',
    turns: [
      {
        turn: 1,
        text: "This one hasn't gone anywhere yet, but on a project last year, our client's legal team asked for our prompt logs before sign-off.",
      },
    ],
    check(diagnosticsByTurn) {
      const observations = allCandidates(diagnosticsByTurn).filter((c) => c.kind === 'scoped_observation')
      const scopes = new Set(observations.map((o) => o.scope))
      const passed = scopes.has('current_project') && scopes.has('historical_project')
      return { passed, notes: `observation scopes: ${JSON.stringify(observations.map((o) => o.scope))}` }
    },
  },

  {
    id: 'bundled_multi_signal',
    category: 'bundled multi-signal response',
    description: 'One turn containing several distinct facts that must be split, not merged.',
    turns: [
      {
        turn: 1,
        text: 'It went through our internal creative review first -- we always do that. Separately, a bigger client account started asking for tool and version documentation before sign-off last quarter.',
      },
    ],
    check(diagnosticsByTurn) {
      const observations = allCandidates(diagnosticsByTurn).filter((c) => c.kind === 'scoped_observation')
      const passed = observations.length >= 2
      return { passed, notes: `split into ${observations.length} observation candidate(s)` }
    },
  },

  {
    id: 'late_correction',
    category: 'late correction',
    description: 'A second turn corrects a tool named in the first.',
    turns: [
      { turn: 1, text: 'We used Kling for this one.' },
      { turn: 2, text: 'Actually wait, I mixed it up -- it was Runway, not Kling.' },
    ],
    check(diagnosticsByTurn) {
      const turn2Candidates = diagnosticsByTurn[1]?.map((d) => d.candidate) ?? []
      const passed = turn2Candidates.some((c) => c.is_correction === true)
      return { passed, notes: `turn 2 candidates: ${JSON.stringify(turn2Candidates.map((c) => ({ kind: c.kind, is_correction: c.is_correction })))}` }
    },
  },

  {
    id: 'explicit_absence',
    category: 'explicit absence',
    description: 'A clean "no" to a review/process question.',
    turns: [{ turn: 1, text: 'No, nobody reviewed it before it went out.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'scoped_observation')
      const passed = d?.candidate.observation_confidence_hint === 'confirmed_absent'
      return { passed, notes: `confidence hint: ${d?.candidate.observation_confidence_hint}` }
    },
  },

  {
    id: 'uncertainty_no_visibility',
    category: 'uncertainty/no visibility',
    description: 'The user genuinely lacks visibility into the fact, distinct from not knowing at all.',
    turns: [{ turn: 1, text: "Honestly, I don't have access to that -- someone else on the team manages billing and approvals." }],
    check(diagnosticsByTurn) {
      // Semantic scoring: a correct answer may represent the visibility fact
      // as either project_fact or scoped_observation -- the original check()
      // here required scoped_observation exclusively, which the Phase 6a
      // targeted diagnostic (2026-08-07) showed was too rigid against real
      // model output; both kinds are valid under the current schema, so
      // neither is required over the other.
      const candidates = diagnosticsByTurn.flat().map((d) => d.candidate)
      const confidenceOf = (c: (typeof candidates)[number]) => c.observation_confidence_hint ?? c.fact_confidence_hint
      const visibilityCandidate = candidates.find((c) => confidenceOf(c) === 'unresolved_no_visibility')
      // Guards against the specific failure mode the diagnostic found: the
      // "I don't have access" clause getting confidently misclassified as
      // confirmed_absent instead of (or alongside) the correct candidate.
      const confirmedAbsentForAccessClause = candidates.some(
        (c) => confidenceOf(c) === 'confirmed_absent' && /don't have access/i.test(c.raw_text),
      )
      const passed = !!visibilityCandidate && !confirmedAbsentForAccessClause
      return {
        passed,
        notes: `visibility candidate: ${JSON.stringify(visibilityCandidate)}; confirmed_absent misclassification present: ${confirmedAbsentForAccessClause}`,
      }
    },
  },

  {
    id: 'refusal_decline',
    category: 'refusal/decline',
    description: 'The user explicitly declines to answer.',
    turns: [{ turn: 1, text: "I'd honestly rather not get into that." }],
    check(diagnosticsByTurn) {
      const cands = allCandidates(diagnosticsByTurn)
      // goal_confidence_hint added to this check (Milestone 1, 2026-08-15):
      // this turn is genuinely context-free about WHAT is being declined --
      // before user_goal existed, "declined" could only land on
      // observation_confidence_hint/fact_confidence_hint; now that a
      // user_goal classification legitimately exists too, a live-model run
      // classifying this exact ambiguous refusal as a declined goal instead
      // of a declined observation/fact is not a regression to reject, it's
      // the same "explicitly declined" fact landing on a newly-real third
      // possible kind. Widening this check is a direct, honest consequence
      // of user_goal's own addition, not a weakening of what this scenario
      // verifies (an explicit decline must still be captured as declined,
      // under SOME kind -- that invariant is unchanged).
      const passed = cands.some((c) => c.observation_confidence_hint === 'declined' || c.fact_confidence_hint === 'declined' || c.goal_confidence_hint === 'declined')
      return { passed, notes: `candidates: ${JSON.stringify(cands.map((c) => ({ kind: c.kind, obs: c.observation_confidence_hint, fact: c.fact_confidence_hint, goal: c.goal_confidence_hint })))}` }
    },
  },

  {
    id: 'intended_use_and_workflow_role',
    category: 'intended use and workflow role in ordinary conversational language',
    description: 'Both project-level facts stated casually in one turn.',
    turns: [{ turn: 1, text: "I'm the producer on this one, and it's for a paid social ad campaign, not internal." }],
    check(diagnosticsByTurn) {
      const facts = allCandidates(diagnosticsByTurn).filter((c) => c.kind === 'project_fact')
      const fields = new Set(facts.map((f) => f.raw_fact_field))
      const passed = fields.has('workflow_role') && fields.has('intended_use')
      return { passed, notes: `project_fact fields: ${JSON.stringify([...fields])}` }
    },
  },

  // ── Plan-tier extraction reliability (A3 fix, CRC Pilot Findings, 2026-08-15) ──
  // Regression coverage for a confirmed real-pilot defect: the live extractor's
  // schema previously had no fields at all for access_surface/plan_tier hints
  // (anthropic-extractor.ts), so an explicit "paid tier on Kling" / "free plan
  // via the website" statement could never be preserved, regardless of how the
  // deterministic pipeline (extraction.ts's own resolveAttestedToolField, which
  // was already correct) would have consumed it. These cases exercise the real
  // model's ability to populate the new hint fields the schema now carries.

  {
    id: 'plan_tier_kling_paid',
    category: 'plan tier -- explicit paid statement',
    description: "User states a paid tier for a named tool, matching the real pilot session's own wording.",
    turns: [{ turn: 1, text: "I'm using the paid tier on Kling." }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = d?.candidate.plan_tier_confidence_hint === 'confirmed' && /paid/i.test(d.candidate.plan_tier_value_hint ?? '')
      return { passed, notes: `plan_tier hint: ${JSON.stringify({ confidence: d?.candidate.plan_tier_confidence_hint, value: d?.candidate.plan_tier_value_hint })}` }
    },
  },

  {
    id: 'plan_tier_elevenlabs_free_via_website',
    category: 'plan tier -- explicit free statement plus access surface',
    description: "User states a free tier AND an access surface in one statement, matching the real pilot session's own wording.",
    turns: [{ turn: 1, text: 'For ElevenLabs, I used their free plan via the website.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const planOk = d?.candidate.plan_tier_confidence_hint === 'confirmed' && /free/i.test(d.candidate.plan_tier_value_hint ?? '')
      const surfaceOk = d?.candidate.access_surface_confidence_hint === 'confirmed' && /website/i.test(d.candidate.access_surface_value_hint ?? '')
      const passed = planOk && surfaceOk
      return {
        passed,
        notes: `plan_tier: ${JSON.stringify({ confidence: d?.candidate.plan_tier_confidence_hint, value: d?.candidate.plan_tier_value_hint })}; access_surface: ${JSON.stringify({ confidence: d?.candidate.access_surface_confidence_hint, value: d?.candidate.access_surface_value_hint })}`,
      }
    },
  },

  {
    id: 'plan_tier_veo_personal_paid',
    category: 'plan tier -- personal paid plan (compound wording)',
    description: 'User states a compound personal+paid tier for a tool, matching the earlier Veo pilot finding.',
    turns: [{ turn: 1, text: "I'm on Google Veo's personal paid plan." }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = d?.candidate.plan_tier_confidence_hint === 'confirmed' && /personal/i.test(d.candidate.plan_tier_value_hint ?? '') && /paid/i.test(d.candidate.plan_tier_value_hint ?? '')
      return { passed, notes: `plan_tier hint: ${JSON.stringify({ confidence: d?.candidate.plan_tier_confidence_hint, value: d?.candidate.plan_tier_value_hint })}` }
    },
  },

  {
    id: 'plan_tier_business',
    category: 'plan tier -- business plan',
    description: 'User states a business-tier plan for a named tool.',
    turns: [{ turn: 1, text: "We're on Runway's business plan." }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = d?.candidate.plan_tier_confidence_hint === 'confirmed' && /business/i.test(d.candidate.plan_tier_value_hint ?? '')
      return { passed, notes: `plan_tier hint: ${JSON.stringify({ confidence: d?.candidate.plan_tier_confidence_hint, value: d?.candidate.plan_tier_value_hint })}` }
    },
  },

  {
    id: 'plan_tier_enterprise',
    category: 'plan tier -- enterprise plan',
    description: 'User states an enterprise-tier plan for a named tool.',
    turns: [{ turn: 1, text: 'Our team has the enterprise plan for Midjourney.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = d?.candidate.plan_tier_confidence_hint === 'confirmed' && /enterprise/i.test(d.candidate.plan_tier_value_hint ?? '')
      return { passed, notes: `plan_tier hint: ${JSON.stringify({ confidence: d?.candidate.plan_tier_confidence_hint, value: d?.candidate.plan_tier_value_hint })}` }
    },
  },

  {
    id: 'plan_tier_ambiguous_uncertain',
    category: 'plan tier -- expressed uncertainty, must not be reported as confirmed',
    description: 'User is unsure which tier they have -- must preserve uncertainty, never guess a branded tier name.',
    turns: [{ turn: 1, text: 'I think it might be Pro on Kling, but I honestly forget.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      // Must NOT be reported as confidently confirmed -- either omitted (null/undefined) or explicitly 'unknown'.
      const passed = d?.candidate.plan_tier_confidence_hint !== 'confirmed'
      return { passed, notes: `plan_tier hint: ${JSON.stringify({ confidence: d?.candidate.plan_tier_confidence_hint, value: d?.candidate.plan_tier_value_hint })}` }
    },
  },

  {
    id: 'plan_tier_absent',
    category: 'plan tier -- no plan information stated at all',
    description: 'Tool named with zero plan/tier information -- must not fabricate a hint from nothing.',
    turns: [{ turn: 1, text: 'We used Pika for the b-roll.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'tool_mention')
      const passed = d?.candidate.plan_tier_confidence_hint !== 'confirmed'
      return { passed, notes: `plan_tier hint: ${JSON.stringify({ confidence: d?.candidate.plan_tier_confidence_hint, value: d?.candidate.plan_tier_value_hint })}` }
    },
  },

  // ── User goal capture (Milestone 1, CRC User Goal, 2026-08-15) ─────────────
  // Regression coverage for the live extractor's new "user_goal" candidate
  // kind (anthropic-extractor.ts): capture-only, no downstream effect on
  // Interview Engine/Retrieval/Projection (enforced structurally elsewhere,
  // not by these scenarios) -- these seven cases test only whether the live
  // model correctly identifies WHICH statements are a stated goal at all.

  {
    id: 'user_goal_question_form',
    category: 'user goal -- question-phrased',
    description: 'A goal stated as a direct question.',
    turns: [{ turn: 1, text: 'Can I use this commercially?' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'user_goal')
      const passed = d?.candidate.goal_confidence_hint === 'confirmed'
      return { passed, notes: `user_goal candidate: ${JSON.stringify(d?.candidate)}` }
    },
  },

  {
    id: 'user_goal_declarative_form',
    category: 'user goal -- declarative need, not phrased as a question',
    description: "A goal stated as a declarative need rather than a question -- must be captured identically to a question-phrased goal.",
    turns: [{ turn: 1, text: 'My client needs proof this is cleared.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'user_goal')
      const passed = d?.candidate.goal_confidence_hint === 'confirmed'
      return { passed, notes: `user_goal candidate: ${JSON.stringify(d?.candidate)}` }
    },
  },

  {
    id: 'user_goal_two_in_one_turn',
    category: 'user goal -- two distinct goals in one message',
    description: 'A single turn stating two distinct goals -- both must be proposed as separate candidates, never merged into one.',
    turns: [{ turn: 1, text: 'Can I use this commercially and do I own the copyright?' }],
    check(diagnosticsByTurn) {
      const goals = diagnosticsByTurn.flat().filter((x) => x.candidate.kind === 'user_goal' && x.candidate.goal_confidence_hint === 'confirmed')
      const passed = goals.length === 2
      return { passed, notes: `user_goal candidates: ${JSON.stringify(goals.map((g) => g.candidate.raw_text))}` }
    },
  },

  {
    id: 'user_goal_incidental_product_question_not_captured',
    category: 'user goal -- incidental CRC-product question must NOT be captured',
    description: 'A question about CRC itself/the process, not about commercial readiness -- must never be proposed as a user_goal.',
    turns: [{ turn: 1, text: 'What does CRC do?' }],
    check(diagnosticsByTurn) {
      const goals = diagnosticsByTurn.flat().filter((x) => x.candidate.kind === 'user_goal')
      const passed = goals.length === 0
      return { passed, notes: `user_goal candidates (expected none): ${JSON.stringify(goals.map((g) => g.candidate.raw_text))}` }
    },
  },

  {
    id: 'user_goal_plain_workflow_statement_not_captured',
    category: 'user goal -- plain workflow statement with no stated goal must NOT be captured',
    description: 'A tool_mention-bearing statement with no accompanying question or stated need -- must not also produce a user_goal candidate.',
    turns: [{ turn: 1, text: "I'm using Kling for a client ad." }],
    check(diagnosticsByTurn) {
      const goals = diagnosticsByTurn.flat().filter((x) => x.candidate.kind === 'user_goal')
      const tools = diagnosticsByTurn.flat().filter((x) => x.candidate.kind === 'tool_mention')
      const passed = goals.length === 0 && tools.length >= 1
      return { passed, notes: `user_goal candidates (expected none): ${JSON.stringify(goals.map((g) => g.candidate.raw_text))}; tool candidates: ${tools.length}` }
    },
  },

  {
    id: 'user_goal_introduced_on_turn_3',
    category: 'user goal -- introduced on a later turn, not the opening message',
    description: 'No goal stated on turns 1-2; a goal is introduced on turn 3 -- must still be captured.',
    turns: [
      { turn: 1, text: "I'm using Kling for a commercial." },
      { turn: 2, text: "I'm the one directly creating the content." },
      { turn: 3, text: 'Actually, can I ask -- will my client own the finished video?' },
    ],
    check(diagnosticsByTurn) {
      const turn1And2Goals = [...diagnosticsByTurn[0], ...diagnosticsByTurn[1]].filter((x) => x.candidate.kind === 'user_goal')
      const turn3Goals = diagnosticsByTurn[2].filter((x) => x.candidate.kind === 'user_goal' && x.candidate.goal_confidence_hint === 'confirmed')
      const passed = turn1And2Goals.length === 0 && turn3Goals.length === 1
      return { passed, notes: `turn 1-2 goal candidates (expected none): ${turn1And2Goals.length}; turn 3 goal candidates (expected 1): ${JSON.stringify(turn3Goals.map((g) => g.candidate.raw_text))}` }
    },
  },

  {
    id: 'user_goal_correction_retraction',
    category: 'user goal -- correction/retraction of an earlier stated goal',
    description: 'Turn 1 states a goal; turn 2 explicitly retracts/replaces it -- must be flagged is_correction with an identifiable correction_of_raw_text.',
    turns: [
      { turn: 1, text: 'Do I own the copyright on this video?' },
      { turn: 2, text: "Actually, I don't care about copyright -- I just need to know if my client can use it for their campaign." },
    ],
    check(diagnosticsByTurn) {
      const turn2Goals = diagnosticsByTurn[1].filter((x) => x.candidate.kind === 'user_goal')
      const correctionCandidate = turn2Goals.find((x) => x.candidate.is_correction === true)
      const passed = !!correctionCandidate
      return { passed, notes: `turn 2 user_goal candidates: ${JSON.stringify(turn2Goals.map((g) => ({ raw_text: g.candidate.raw_text, is_correction: g.candidate.is_correction, correction_of_raw_text: g.candidate.correction_of_raw_text })))}` }
    },
  },

  // ── User goal category/scope classification (Milestone 2, Bounded
  // Interpretation, 2026-08-15). Regression coverage for the two new
  // classification hints (goal_category_hint/goal_scope_hint) the live
  // extractor now proposes alongside a user_goal candidate. These hints are
  // routing metadata only (they decide which governed knowledge, if any, a
  // goal is even a candidate for) -- these scenarios test classification
  // accuracy only, not anything about the resulting Bounded Interpretation
  // (covered deterministically by __tests__/bounded-interpretation/).

  {
    id: 'user_goal_category_commercial_use',
    category: 'user goal -- category classification: commercial_use',
    description: 'An ordinary commercial-use question must classify as category commercial_use.',
    turns: [{ turn: 1, text: 'Can I use this in a paid ad campaign for my client?' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'user_goal')
      const passed = d?.candidate.goal_category_hint === 'commercial_use'
      return { passed, notes: `goal_category_hint: ${d?.candidate.goal_category_hint}` }
    },
  },

  {
    id: 'user_goal_category_copyright_ownership',
    category: 'user goal -- category classification: copyright_ownership',
    description: 'A question about who owns the output must classify as copyright_ownership, distinct from copyrightability.',
    turns: [{ turn: 1, text: 'Do I own the copyright on this video, or does the AI tool?' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'user_goal')
      const passed = d?.candidate.goal_category_hint === 'copyright_ownership'
      return { passed, notes: `goal_category_hint: ${d?.candidate.goal_category_hint}` }
    },
  },

  {
    id: 'user_goal_category_copyrightability',
    category: 'user goal -- category classification: copyrightability',
    description: 'A question about whether AI video is copyrightable AT ALL (not who owns it) must classify as copyrightability.',
    turns: [{ turn: 1, text: 'Is AI-generated video even copyrightable as a category, or is it automatically public domain?' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'user_goal')
      const passed = d?.candidate.goal_category_hint === 'copyrightability'
      return { passed, notes: `goal_category_hint: ${d?.candidate.goal_category_hint}` }
    },
  },

  {
    id: 'user_goal_category_likeness',
    category: 'user goal -- category classification: likeness',
    description: "A question about a real person's voice/likeness must classify as likeness.",
    turns: [{ turn: 1, text: "This uses a cloned voice of a real narrator we hired -- is that okay to use commercially?" }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'user_goal')
      const passed = d?.candidate.goal_category_hint === 'likeness'
      return { passed, notes: `goal_category_hint: ${d?.candidate.goal_category_hint}` }
    },
  },

  {
    id: 'user_goal_scope_informational_default',
    category: 'user goal -- scope classification: ordinary question is informational',
    description: 'An ordinary commercial-readiness question, not addressed to CRC itself as a certifier, must classify as scope informational.',
    turns: [{ turn: 1, text: 'Can I use this commercially?' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'user_goal')
      const passed = d?.candidate.goal_scope_hint === 'informational' || d?.candidate.goal_scope_hint === undefined
      return { passed, notes: `goal_scope_hint: ${d?.candidate.goal_scope_hint}` }
    },
  },

  {
    id: 'user_goal_scope_determination_request',
    category: 'user goal -- scope classification: explicit request for CRC to certify/clear',
    description: 'A statement explicitly asking CRC/this conversation to certify or clear the video must classify as scope determination_request.',
    turns: [{ turn: 1, text: 'Can you certify that this video is officially cleared for commercial use?' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'user_goal')
      const passed = d?.candidate.goal_scope_hint === 'determination_request'
      return { passed, notes: `goal_scope_hint: ${d?.candidate.goal_scope_hint}` }
    },
  },

  {
    id: 'user_goal_scope_stated_need_still_informational',
    category: 'user goal -- scope classification: a stated NEED for proof is still informational, not a determination_request',
    description: "Stating that a client needs proof is a need, not itself asking CRC to issue a determination right now -- must classify as informational.",
    turns: [{ turn: 1, text: 'My client needs proof this is cleared before they will pay the invoice.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'user_goal')
      const passed = d?.candidate.goal_scope_hint === 'informational' || d?.candidate.goal_scope_hint === undefined
      return { passed, notes: `goal_scope_hint: ${d?.candidate.goal_scope_hint}` }
    },
  },

  // ── Jurisdiction extraction (CRC Living Knowledge Phase 1, 2026-08-16;
  // candidate shape updated -- CRC Assessment-Jurisdiction Mention Model —
  // Post-Integration Cleanup, 2026-08-28) ────────────────────────────────
  // Regression coverage for the live extractor's jurisdiction handling.
  // Mechanically retargeted from the retired `project_fact`/
  // `raw_fact_field: 'jurisdiction'` candidate shape (removed at the type
  // level by this cleanup's own Finding 1) to the current
  // `assessment_jurisdiction_mention` candidate kind -- field access only,
  // each case's ORIGINAL pass/fail expectation is preserved unchanged here.
  //
  // NOT addressed by this cleanup (out of scope -- a live-model eval-corpus
  // behavioral review, not a structural/type/prompt-text cleanup item): the
  // first two cases' own pass EXPECTATIONS may now be stricter than what the
  // current extractor prompt actually supports. The live prompt's own
  // context-prefix EXCEPTION (anthropic-extractor.ts) only allows a bare,
  // otherwise-indirect-looking answer (e.g. a lone "United States.") to be
  // captured when the turn carries the
  // `[Context: your immediately preceding question directly asked...]`
  // prefix -- these two corpus turns carry no such prefix. Similarly, "We're
  // based in Taiwan, so Taiwan copyright rules would be most relevant" is a
  // location-derived-relevance statement, exactly the shape the current
  // prompt says must NEVER be inferred as assessment scope, regardless of
  // how confident the location detail is. Flagged here rather than silently
  // redecided -- resolving what SHOULD pass for these two cases under the
  // current architecture is a product/eval judgment call for a dedicated
  // pass, not this bounded cleanup.

  {
    id: 'jurisdiction_direct_single_country',
    category: 'jurisdiction -- direct, unambiguous single-country statement',
    description: 'A direct statement of one country in answer to a jurisdiction question must be captured as a confirmed assessment_jurisdiction_mention.',
    turns: [{ turn: 1, text: 'United States.' }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'assessment_jurisdiction_mention')
      const passed = !d?.candidate.is_jurisdiction_exclusion && d?.candidate.raw_jurisdiction_value === 'United States'
      return { passed, notes: `assessment_jurisdiction_mention: ${JSON.stringify(d?.candidate)}` }
    },
  },

  {
    id: 'jurisdiction_direct_stated_in_sentence',
    category: 'jurisdiction -- direct statement embedded in a fuller sentence',
    description: 'A direct jurisdiction statement phrased as a full sentence must still be captured, not require a bare one-word answer.',
    turns: [{ turn: 1, text: "We're based in Taiwan, so Taiwan copyright rules would be most relevant." }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'assessment_jurisdiction_mention')
      const passed = !d?.candidate.is_jurisdiction_exclusion && !!d?.candidate.raw_jurisdiction_value?.toLowerCase().includes('taiwan')
      return { passed, notes: `assessment_jurisdiction_mention: ${JSON.stringify(d?.candidate)}` }
    },
  },

  {
    id: 'jurisdiction_ambiguous_multi_country_not_guessed',
    category: 'jurisdiction -- ambiguous multi-country statement must never collapse to a single guessed value',
    description: 'Naming two countries with no clear single answer must never be proposed as a single confirmed jurisdiction value.',
    turns: [{ turn: 1, text: 'My client is American but we filmed the whole thing in Taiwan.' }],
    check(diagnosticsByTurn) {
      const ds = diagnosticsByTurn.flat().filter((x) => x.candidate.kind === 'assessment_jurisdiction_mention')
      // Passing means EITHER no jurisdiction candidate was proposed at all,
      // OR every one proposed is an explicit exclusion -- never a
      // fabricated single-country inclusion choice between the two named
      // (both are location statements, not an explicit assessment-scope
      // request -- see this section's own header note on the current
      // prompt's location-inference rule).
      const passed = ds.length === 0 || ds.every((d) => d.candidate.is_jurisdiction_exclusion)
      return { passed, notes: `assessment_jurisdiction_mention(s): ${JSON.stringify(ds.map((d) => d.candidate))}` }
    },
  },

  {
    id: 'jurisdiction_incidental_location_mention_not_captured',
    category: 'jurisdiction -- an incidental mention of a filming/working location (not a direct jurisdiction answer) must NOT be captured',
    description: 'Mentioning a location in passing, unrelated to any jurisdiction question, must not be inferred as a jurisdiction statement.',
    turns: [{ turn: 1, text: "I was using Kling from a cafe in Taipei to knock this out between meetings." }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'assessment_jurisdiction_mention')
      const passed = !d
      return { passed, notes: `assessment_jurisdiction_mention (expected none): ${JSON.stringify(d?.candidate)}` }
    },
  },

  {
    id: 'jurisdiction_not_mentioned_no_candidate',
    category: 'jurisdiction -- ordinary turn with no jurisdiction content at all',
    description: 'A turn about something else entirely must never produce a jurisdiction candidate.',
    turns: [{ turn: 1, text: "I'm using Kling for a client ad." }],
    check(diagnosticsByTurn) {
      const d = diagnosticsByTurn.flat().find((x) => x.candidate.kind === 'assessment_jurisdiction_mention')
      const passed = !d
      return { passed, notes: `assessment_jurisdiction_mention (expected none): ${JSON.stringify(d?.candidate)}` }
    },
  },
]
