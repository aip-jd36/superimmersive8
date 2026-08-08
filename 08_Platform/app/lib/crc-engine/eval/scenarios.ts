/**
 * Live Interview Runtime evaluation scenarios (Live Interview Runtime
 * milestone, live-model validation). Eval-only -- lives under eval/,
 * imported by nothing outside this harness, mirrors
 * lib/interview-engine/eval/dialogue-scenarios.ts's own role for
 * Interview Engine's Phase 7 battery.
 *
 * Scripted as `runTurn()`-shaped input (userText + optional declineAction)
 * rather than Phase 7's own `{ phase, decline }` shape -- this runtime
 * computes phase itself and takes explicit UI-affordance decline actions,
 * not script-supplied phase or free-text-interpreted decline. Where a
 * scenario's underlying narrative reuses a canonical dialogue fixture's
 * own content, that's noted explicitly; none of Phase 7's own scripts are
 * imported or run as-is, since their shape no longer matches this
 * runtime's input contract.
 *
 * Twelve scenarios, matching the twelve required-coverage behaviors named
 * for this milestone. Several scenarios legitimately provide double
 * coverage (e.g. a scenario reaching natural completion also exercises
 * Gate 2 stabilization) -- noted per scenario via `covers`, not hidden.
 */

import type { DeclineAction } from '../decline'

export interface ScenarioTurn {
  userText: string
  declineAction?: DeclineAction
}

export interface Scenario {
  id: string
  description: string
  covers: string[]
  turns: ScenarioTurn[]
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'rich_first_turn',
    description: 'User volunteers tool, role, and intended use in a single rich opening turn -- reuses rich_signal\'s own narrative content.',
    covers: ['rich first turn', 'early Gate 1 satisfaction'],
    turns: [
      { userText: 'We shot the whole thing in Runway Gen-3, team API plan. I\'m the producer on this one, and it\'s for a paid social campaign, a 30-second cutdown.' },
      { userText: 'Once this was finished, it went straight to the client -- no internal review, they just wanted it fast.' },
      { userText: 'Nothing else has come up about it since. Pretty standard project for us.' },
    ],
  },
  {
    id: 'gradual_discovery',
    description: 'One fact volunteered per turn -- tool, then role, then intended use, then a workflow detail -- watching phase advance incrementally rather than all at once.',
    covers: ['gradual discovery'],
    turns: [
      { userText: 'We used Kling for this one.' },
      { userText: 'I\'m the editor on it.' },
      { userText: 'It\'s a client-facing pitch deck video, not a paid campaign.' },
      { userText: 'The client hasn\'t reviewed it yet, still mid-edit.' },
    ],
  },
  {
    id: 'decline_mid_conversation',
    description: 'Two normal turns, then a question-scope decline via explicit UI action mid-conversation, then the conversation continues (question-scope declines do not end the interview).',
    covers: ['decline mid-conversation'],
    turns: [
      { userText: 'We used ElevenLabs for the voiceover, team plan.' },
      { userText: 'I\'m the creative director on this.' },
      { userText: 'skip', declineAction: 'skip_question' },
      { userText: 'It went to internal review before it shipped, actually.' },
    ],
  },
  {
    id: 'correction_after_supersession',
    description: 'User names a tool, then corrects it in a later turn -- testing that Extraction/Mutation correctly supersede rather than merely add.',
    covers: ['correction after supersession'],
    turns: [
      { userText: 'We used Midjourney for the visuals.' },
      { userText: 'Actually, sorry -- that was wrong, we used Runway for the visuals, not Midjourney.' },
      { userText: 'I\'m the motion designer on it.' },
    ],
  },
  {
    id: 'bundled_answer_requiring_rule5',
    description: 'A single bundled turn naming two distinct facts spanning current and historical projects without disambiguating which applies where -- exercising Rule 5\'s disentangling-question mechanism.',
    covers: ['bundled answer requiring Rule 5'],
    turns: [
      { userText: 'This one went straight out, no review. But on a project last year, a client asked for our full prompt log before they\'d sign off.' },
      { userText: 'For the one last year -- we put together a doc listing every tool and prompt we used, and they accepted it.' },
    ],
  },
  {
    id: 'unresolved_ambiguity_across_turns',
    description: 'Reuses ambiguous_multi_surface_tool\'s own "Nano Banana" narrative -- an ambiguous multi-surface tool named, held unresolved across turns, tests pending_clarification persisting and Extraction correctly using it on the next turn.',
    covers: ['unresolved ambiguity across turns', 'pending clarification being created then cleared'],
    turns: [
      { userText: 'I used Nano Banana for this one.' },
      { userText: 'Oh, through the API -- I have a developer key, it\'s not the app on my phone.' },
      { userText: 'I\'m the designer on it, and it\'s just an internal concept test.' },
    ],
  },
  {
    id: 'gate2_stabilization',
    description: 'A longer conversation where early turns each add materially new facts and later turns are confirmatory/repetitive, watching Gate 2 transition from not_yet_stable to stable and completion fire once phase 3 is reached.',
    covers: ['Gate 2 stabilization', 'conversation ending normally'],
    turns: [
      { userText: 'We used Runway Gen-3, team API plan, for a paid social ad campaign.' },
      { userText: 'I\'m the producer.' },
      { userText: 'Once this was finished, our internal legal team reviewed it before it went out.' },
      { userText: 'That\'s pretty much it -- nothing else notable happened with this one.' },
      { userText: 'Yeah, that covers it. Nothing more to add.' },
    ],
  },
  {
    id: 'conversation_ending_through_decline',
    description: 'Some normal content established, then an explicit interview-scope decline -- verifying immediate completion and a valid (partial) ProjectionOutput.',
    covers: ['conversation ending through decline'],
    turns: [
      { userText: 'We used Pika for this one.' },
      { userText: 'stop', declineAction: 'stop_interview' },
    ],
  },
  {
    id: 'full_opt_out',
    description: 'Immediate interview-scope decline on turn 1, zero content established -- reuses full_opt_out\'s own narrative and expected all-empty ProjectionOutput.',
    covers: ['full opt-out'],
    turns: [{ userText: 'I\'d rather not go through this right now, can we stop?', declineAction: 'stop_interview' }],
  },
  {
    id: 'phase_advances_within_bundled_turn',
    description: 'A single turn supplying both a resolved tool and a workflow_role at once -- checking Candidate B\'s own same-turn-advancement design (Section 11: a single turn can supply Phase 1/2/3-relevant information simultaneously) holds under a real model\'s own extraction, not just hand-built fixtures.',
    covers: ['gradual discovery', 'early Gate 1 satisfaction'],
    turns: [
      { userText: 'We used ElevenLabs, and I\'m the sound designer on it.' },
      { userText: 'Once it was done, it just shipped -- no one reviewed it.' },
    ],
  },
]
