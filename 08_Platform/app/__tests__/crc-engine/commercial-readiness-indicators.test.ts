/**
 * Commercial Readiness Indicators deterministic test suite (CRC Limited
 * Pilot, 2026-08-12). Pure function, no live model. Covers, per indicator:
 * positive (affirmative phrase hits), negative (negative phrase hits),
 * ambiguous (no phrase list match -> unknown, even though a human reading
 * the sentence might guess otherwise), and incidental-word false positives
 * (a naive substring match on a bare risky word would misfire; the phrase
 * list is built specifically to not misfire here) -- plus source-location
 * coverage (all three confirmed-text sources read; superseded observations
 * ignored).
 */

import { deriveCommercialReadinessIndicators } from '@/lib/crc-engine/commercial-readiness-indicators'
import { emptyStructuredUnderstanding } from '@/lib/interview-engine/eval/empty-structured-understanding'
import type { StructuredUnderstanding } from '@/types/interview-engine'

function withWorkflowRole(text: string): StructuredUnderstanding {
  const su = emptyStructuredUnderstanding()
  return {
    ...su,
    project_facts: {
      ...su.project_facts,
      workflow_role: { attestation: { state: 'confirmed', value: text }, source_turn: 1, source_statement: text },
    },
  }
}

function withIntendedUse(text: string): StructuredUnderstanding {
  const su = emptyStructuredUnderstanding()
  return {
    ...su,
    project_facts: {
      ...su.project_facts,
      intended_use: { attestation: { state: 'confirmed', value: text }, source_turn: 1, source_statement: text },
    },
  }
}

function withObservationNote(text: string, opts?: { superseded?: boolean }): StructuredUnderstanding {
  const su = emptyStructuredUnderstanding()
  return {
    ...su,
    scoped_observations: [
      {
        observation_id: 'obs-1',
        scope: 'current_project',
        workflow_stage: null,
        confidence: 'confirmed',
        status: null,
        note: text,
        superseded_by: opts?.superseded ? 'obs-2' : null,
        source_turn: 1,
        source_statement: text,
      },
    ],
  }
}

// ── Source-location coverage ────────────────────────────────────────────

describe('deriveCommercialReadinessIndicators -- reads all three confirmed-text sources', () => {
  test('reads workflow_role when confirmed', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('made the video for a client')).client_involvement).toBe('affirmative')
  })

  test('reads intended_use when confirmed', () => {
    expect(deriveCommercialReadinessIndicators(withIntendedUse('this is for a client campaign')).client_involvement).toBe('affirmative')
  })

  test('reads active scoped_observations notes', () => {
    expect(deriveCommercialReadinessIndicators(withObservationNote('working on this for a client')).client_involvement).toBe('affirmative')
  })

  test('ignores superseded scoped_observations notes', () => {
    expect(deriveCommercialReadinessIndicators(withObservationNote('working on this for a client', { superseded: true })).client_involvement).toBe(
      'unknown',
    )
  })

  test('unconfirmed project_facts (state !== confirmed) contribute no text', () => {
    const su = emptyStructuredUnderstanding() // intended_use/workflow_role both 'unknown' state
    expect(deriveCommercialReadinessIndicators(su)).toEqual({
      client_involvement: 'unknown',
      person_depicted: 'unknown',
      reference_material_used: 'unknown',
    })
  })
})

// ── client_involvement ──────────────────────────────────────────────────

describe('client_involvement', () => {
  test('POSITIVE: "made the AI video for a client" (real pilot transcript language) -> affirmative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('made the AI video for a client')).client_involvement).toBe('affirmative')
  })

  test('POSITIVE: "This was for my client\'s product launch" -> affirmative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole("This was for my client's product launch")).client_involvement).toBe('affirmative')
  })

  test('POSITIVE: "on behalf of a client" -> affirmative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('made it on behalf of a client')).client_involvement).toBe('affirmative')
  })

  test('NEGATIVE: "this is a personal project" -> negative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('this is a personal project')).client_involvement).toBe('negative')
  })

  test('NEGATIVE: "no client involved, just for myself" -> negative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('no client involved, just for myself')).client_involvement).toBe('negative')
  })

  test('AMBIGUOUS: "I made a video using Runway" (no client language either way) -> unknown', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('I made a video using Runway')).client_involvement).toBe('unknown')
  })

  test('AMBIGUOUS: "just me, I don\'t have anyone else on my team" (real pilot transcript; solo-operator language must NOT be read as no-client) -> unknown', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole("just me, I don't have anyone else on my team")).client_involvement).toBe('unknown')
  })

  test('AMBIGUOUS: "I\'m a freelance video editor working with clients" (general/background capability language, not asserting THIS project is client work) -> unknown (acceptable false negative, disclosed)', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole("I'm a freelance video editor working with clients")).client_involvement).toBe(
      'unknown',
    )
  })

  test('INCIDENTAL FALSE POSITIVE AVOIDED: "I used the Runway web client to generate this" (software client, not a business client) -> unknown, not affirmative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('I used the Runway web client to generate this')).client_involvement).toBe(
      'unknown',
    )
  })
})

// ── person_depicted ─────────────────────────────────────────────────────

describe('person_depicted', () => {
  test('POSITIVE: "the video shows my face talking to the camera" -> affirmative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('the video shows my face talking to the camera')).person_depicted).toBe(
      'affirmative',
    )
  })

  test('POSITIVE: "we used a reference photo of a friend for the character\'s face" -> affirmative', () => {
    expect(
      deriveCommercialReadinessIndicators(withWorkflowRole("we used a reference photo of a friend for the character's face")).person_depicted,
    ).toBe('affirmative')
  })

  test('POSITIVE: "It shows my own face and voice talking straight to camera" (live-validated fix, 2026-08-12 -- real trial produced unknown before "my own face" was added) -> affirmative', () => {
    expect(
      deriveCommercialReadinessIndicators(withWorkflowRole('It shows my own face and voice talking straight to camera')).person_depicted,
    ).toBe('affirmative')
  })

  test('POSITIVE: "an actor performs in the video" -> affirmative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('an actor performs in the video')).person_depicted).toBe('affirmative')
  })

  test('NEGATIVE: "it\'s a product shot, no people" -> negative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole("it's a product shot, no people")).person_depicted).toBe('negative')
  })

  test('NEGATIVE: "fully synthetic characters, not based on anyone real" -> negative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('fully synthetic characters, not based on anyone real')).person_depicted).toBe(
      'negative',
    )
  })

  test('AMBIGUOUS: "I made a short ad using Runway" (no subject-matter language either way) -> unknown', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('I made a short ad using Runway')).person_depicted).toBe('unknown')
  })

  test('AMBIGUOUS: "the client is featured in it" (plausibly a person, but not an unambiguous phrase-list hit) -> unknown (acceptable false negative, disclosed)', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('the client is featured in it')).person_depicted).toBe('unknown')
  })

  test('INCIDENTAL FALSE POSITIVE AVOIDED: "I used the Runway model to generate the clip" (AI model, not a person) -> unknown, not affirmative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('I used the Runway model to generate the clip')).person_depicted).toBe('unknown')
  })
})

// ── reference_material_used ─────────────────────────────────────────────

describe('reference_material_used', () => {
  test('POSITIVE: "I used a reference image to guide the generation" -> affirmative', () => {
    expect(
      deriveCommercialReadinessIndicators(withWorkflowRole('I used a reference image to guide the generation')).reference_material_used,
    ).toBe('affirmative')
  })

  test('POSITIVE: "based on a photo I had from before" -> affirmative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('based on a photo I had from before')).reference_material_used).toBe(
      'affirmative',
    )
  })

  test('POSITIVE: "used footage from my phone as a starting point" -> affirmative', () => {
    expect(
      deriveCommercialReadinessIndicators(withWorkflowRole('used footage from my phone as a starting point')).reference_material_used,
    ).toBe('affirmative')
  })

  test('NEGATIVE: "generated entirely from a text prompt, no reference material" -> negative', () => {
    expect(
      deriveCommercialReadinessIndicators(withWorkflowRole('generated entirely from a text prompt, no reference material'))
        .reference_material_used,
    ).toBe('negative')
  })

  test('NEGATIVE: "text-to-video only" -> negative', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('text-to-video only')).reference_material_used).toBe('negative')
  })

  test('AMBIGUOUS: "I used Runway to make a video for my client" (real pilot transcript turn 1; no input-methodology language either way) -> unknown', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('I used Runway to make a video for my client')).reference_material_used).toBe(
      'unknown',
    )
  })

  test('POSITIVE: "I started with an image" -> affirmative ("started with an image" is an explicit phrase-list entry)', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('I started with an image')).reference_material_used).toBe('affirmative')
  })

  test('AMBIGUOUS: "I began with an image I liked" (a genuine near-miss -- "began" is not "started", so it does not hit the phrase list) -> unknown (acceptable false negative, disclosed)', () => {
    expect(deriveCommercialReadinessIndicators(withWorkflowRole('I began with an image I liked')).reference_material_used).toBe('unknown')
  })

  test('INCIDENTAL FALSE POSITIVE AVOIDED: "I referenced the pricing page before choosing a plan" (contains "referenc-" but not any listed phrase) -> unknown, not affirmative', () => {
    expect(
      deriveCommercialReadinessIndicators(withWorkflowRole('I referenced the pricing page before choosing a plan')).reference_material_used,
    ).toBe('unknown')
  })
})

// ── Precedence ───────────────────────────────────────────────────────────

describe('precedence: negative wins if a negative and an affirmative phrase both match the SAME indicator', () => {
  test('"this started as a personal project but the final cut was for a client" contains both a negative and an affirmative client_involvement phrase -> resolves negative, not affirmative (biases toward the same failure mode as unknown -- suppressing the question -- rather than injecting one)', () => {
    const text = 'this started as a personal project but the final cut was for a client'
    expect(deriveCommercialReadinessIndicators(withWorkflowRole(text)).client_involvement).toBe('negative')
  })

  test('a match on one indicator does not affect an unrelated indicator computed from the same text', () => {
    const text = 'this is a personal project, though I used a reference image for the background'
    expect(deriveCommercialReadinessIndicators(withWorkflowRole(text)).client_involvement).toBe('negative')
    expect(deriveCommercialReadinessIndicators(withWorkflowRole(text)).reference_material_used).toBe('affirmative')
  })
})
