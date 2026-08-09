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
      const passed = cands.some((c) => c.observation_confidence_hint === 'declined' || c.fact_confidence_hint === 'declined')
      return { passed, notes: `candidates: ${JSON.stringify(cands.map((c) => ({ kind: c.kind, obs: c.observation_confidence_hint, fact: c.fact_confidence_hint })))}` }
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
]
