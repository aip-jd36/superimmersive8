/**
 * recordCrcCompletionTrace / recordCrcExtractionTrace tests (CRC-PILOT-OBS-3,
 * Durable Pipeline Trace Implementation; turn_number identity added by
 * CRC-PILOT-OBS-3A; recordCrcExtractionTrace added by CRC-EXTRACTION-OBS-2,
 * 2026-09-28). Same fake-client dependency-injection pattern as
 * pilot-events.test.ts/supabase-session-store.test.ts.
 */

import { recordCrcCompletionTrace, recordCrcExtractionTrace, TRACE_SCHEMA_VERSION } from '../../lib/crc-engine/turn-traces'
import { runCRCConversation } from '../../lib/crc-engine/run-crc-conversation'
import { DIALOGUE_FIXTURES } from '../../lib/interview-engine/fixtures'
import { MATRIX_FIXTURE } from '../../lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '../../lib/retrieval-engine/topic-claims-fixture'
import { runExtractionPipeline, type CandidateObservation } from '../../lib/interview-engine/extraction'
import { constantExtractor } from '../../lib/interview-engine/mock-extractor'
import type { StructuredUnderstanding } from '../../types/interview-engine'

function fakeClient(overrides: { insertResult?: { error: unknown } } = {}) {
  const insertResult = overrides.insertResult ?? { error: null }
  const insertCalls: unknown[] = []
  const client = {
    from: jest.fn(() => ({
      insert: jest.fn(async (payload: unknown) => {
        insertCalls.push(payload)
        return insertResult
      }),
    })),
  }
  return { client: client as any, insertCalls }
}

// A real, fully-computed CRCPipelineResult -- not a hand-built stub -- so
// this test proves the writer persists the actual runtime objects
// runCRCConversation() produces, not a shape that merely satisfies the
// TypeScript type.
const realResult = runCRCConversation(DIALOGUE_FIXTURES.rich_signal.structured_understanding, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)

describe('recordCrcCompletionTrace', () => {
  test('writes turn_number, trace_kind, runtime_commit, trace_schema_version, and session_id', async () => {
    const { client, insertCalls } = fakeClient()
    await recordCrcCompletionTrace(client, { sessionId: 'session-123', turnNumber: 5, result: realResult })
    expect(insertCalls).toHaveLength(1)
    const row = insertCalls[0] as any
    expect(row.session_id).toBe('session-123')
    expect(row.turn_number).toBe(5)
    expect(row.trace_kind).toBe('completion')
    expect(row.trace_schema_version).toBe(TRACE_SCHEMA_VERSION)
    expect(typeof row.runtime_commit).toBe('string')
    expect(row.runtime_commit.length).toBeGreaterThan(0)
  })

  test('payload preserves the exact runtime objects -- faithful, not a reduced/summarized DTO', async () => {
    const { client, insertCalls } = fakeClient()
    await recordCrcCompletionTrace(client, { sessionId: 'session-123', turnNumber: 5, result: realResult })
    const payload = (insertCalls[0] as any).payload

    expect(payload.structured_understanding).toBe(realResult.structured_understanding)
    expect(payload.output).toBe(realResult.output)
    expect(payload.plan).toBe(realResult.plan)
    expect(payload.bounded_interpretations).toBe(realResult.bounded_interpretations)
    expect(payload.consultative_notes).toBe(realResult.consultative_notes)
    expect(payload.discovered_topic_occurrences).toBe(realResult.discovered_topic_occurrences)
    expect(payload.retrieval_results).toBe(realResult.trace.retrieval_results)
    expect(payload.retrieval_diagnostics).toBe(realResult.diagnostics.retrieval)

    // No extra transformation/summarization has been applied -- the
    // payload's own knowledge_items are byte-identical to the pipeline's,
    // not re-derived or trimmed.
    expect(payload.output.knowledge_items).toEqual(realResult.output.knowledge_items)
  })

  test('a Supabase insert error does not throw -- best-effort, fail-open', async () => {
    const { client } = fakeClient({ insertResult: { error: { message: 'write failed' } } })
    await expect(recordCrcCompletionTrace(client, { sessionId: 'x', turnNumber: 1, result: realResult })).resolves.toBeUndefined()
  })

  test('a unique-constraint violation (e.g. a genuine race between two completion attempts on the same turn) does not throw', async () => {
    const { client } = fakeClient({
      insertResult: { error: { code: '23505', message: 'duplicate key value violates unique constraint "crc_turn_traces_session_turn_kind_unique"' } },
    })
    await expect(recordCrcCompletionTrace(client, { sessionId: 'x', turnNumber: 1, result: realResult })).resolves.toBeUndefined()
  })

  test('an unexpected exception from the client does not throw', async () => {
    const client = {
      from: jest.fn(() => {
        throw new Error('client blew up')
      }),
    } as any
    await expect(recordCrcCompletionTrace(client, { sessionId: 'x', turnNumber: 1, result: realResult })).resolves.toBeUndefined()
  })
})

// ── recordCrcExtractionTrace (CRC-EXTRACTION-OBS-2, 2026-09-28) ────────────

function emptySU(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    organization_location_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

// Distinctive marker strings -- if any of these ever leak into a persisted
// extraction-trace payload, the data-minimization tests below must fail.
const SECRET_RAW_TEXT = 'SECRET-RAW-TEXT-MARKER-do-not-persist'
const SECRET_TOOL_NAME = 'SECRET-TOOL-NAME-MARKER'
const SECRET_PROVIDER_NAME = 'SECRET-PROVIDER-NAME-MARKER'
const SECRET_JURISDICTION_VALUE = 'SECRET-JURISDICTION-VALUE-MARKER'

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'c1', turn: 1, raw_text: SECRET_RAW_TEXT, kind: 'tool_mention', raw_tool_name: SECRET_TOOL_NAME, ...overrides }
}

function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'c1', turn: 1, raw_text: SECRET_RAW_TEXT, kind: 'user_goal', goal_confidence_hint: 'confirmed', ...overrides }
}

describe('recordCrcExtractionTrace', () => {
  test('writes turn_number, trace_kind, runtime_commit, trace_schema_version, and session_id', async () => {
    const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([toolCandidate()]))
    const { client, insertCalls } = fakeClient()
    await recordCrcExtractionTrace(client, { sessionId: 'session-123', turnNumber: 5, diagnostics })
    expect(insertCalls).toHaveLength(1)
    const row = insertCalls[0] as any
    expect(row.session_id).toBe('session-123')
    expect(row.turn_number).toBe(5)
    expect(row.trace_kind).toBe('extraction')
    expect(row.trace_schema_version).toBe(TRACE_SCHEMA_VERSION)
    expect(typeof row.runtime_commit).toBe('string')
    expect(row.runtime_commit.length).toBeGreaterThan(0)
  })

  describe('zero-candidate distinction (Phase 5)', () => {
    test('extraction completed with zero candidates -> a row is still written, with candidate_count: 0 and candidates: []', async () => {
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'nothing extractable here' }, constantExtractor([]))
      expect(diagnostics).toEqual([])
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 'session-zero', turnNumber: 1, diagnostics })
      expect(insertCalls).toHaveLength(1)
      const payload = (insertCalls[0] as any).payload
      expect(payload).toEqual({ candidate_count: 0, candidates: [] })
    })

  })

  describe('generic candidate coverage (Phase 8)', () => {
    test('an accepted tool_mention candidate', async () => {
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([toolCandidate({ raw_tool_name: 'Runway' })]))
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      expect(payload.candidate_count).toBe(1)
      expect(payload.candidates[0]).toMatchObject({ ordinal: 0, proposal_id: 'c1', candidate_kind: 'tool_mention', disposition: 'accepted' })
      expect(typeof payload.candidates[0].applied_identifier).toBe('string')
      expect(payload.candidates[0]).not.toHaveProperty('reason_code')
    })

    test('an accepted user_goal candidate, and a deferred/rejected one', async () => {
      const accepted = goalCandidate({ proposal_id: 'g-ok' })
      const deferred = goalCandidate({ proposal_id: 'g-low', goal_confidence_hint: undefined })
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([accepted, deferred]))
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      expect(payload.candidate_count).toBe(2)
      expect(payload.candidates[0]).toMatchObject({ candidate_kind: 'user_goal', disposition: 'accepted' })
      expect(payload.candidates[1]).toMatchObject({ candidate_kind: 'user_goal', disposition: 'deferred', reason_code: 'CANDIDATE_UNCLASSIFIABLE' })
    })

    test('an accepted assessment_jurisdiction_mention candidate', async () => {
      const candidate: CandidateObservation = { proposal_id: 'j1', turn: 1, raw_text: SECRET_RAW_TEXT, kind: 'assessment_jurisdiction_mention', raw_jurisdiction_value: SECRET_JURISDICTION_VALUE }
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([candidate]))
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      expect(payload.candidates[0]).toMatchObject({ candidate_kind: 'assessment_jurisdiction_mention', disposition: 'accepted' })
    })

    test('a tool/provider-related candidate (asset_provider_mention)', async () => {
      const candidate: CandidateObservation = { proposal_id: 'p1', turn: 1, raw_text: SECRET_RAW_TEXT, kind: 'asset_provider_mention', raw_provider_name: SECRET_PROVIDER_NAME }
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([candidate]))
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      expect(payload.candidates[0]).toMatchObject({ candidate_kind: 'asset_provider_mention', disposition: 'accepted' })
    })

    test('a correction/supersession candidate (tool_mention correcting a prior mention) still traces through the same generic shape', async () => {
      const first = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([toolCandidate({ proposal_id: 'c1', raw_tool_name: 'Runway' })]))
      const toolMentionId = first.updated.tool_mentions[0].mention_id
      const correction = toolCandidate({ proposal_id: 'c2', turn: 2, raw_tool_name: 'Kling', supersedes_tool_mention_id: toolMentionId, is_correction: true })
      const { diagnostics } = await runExtractionPipeline(first.updated, { turn: 2, text: 'x' }, constantExtractor([correction]))
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 2, diagnostics })
      const payload = (insertCalls[0] as any).payload
      expect(payload.candidates[0]).toMatchObject({ candidate_kind: 'tool_mention', disposition: 'accepted' })
      // applied_identifier is a structural mention id, never raw text.
      expect(payload.candidates[0].applied_identifier).not.toMatch(/Kling|Runway/)
    })

    // material_demand_mention is explicitly OUT OF SCOPE for this
    // milestone (CRC-EXTRACTION-OBS-1's own finding #6, reconfirmed here):
    // runExtractionPipeline's own material_demand_mention branch produces
    // NO ExtractionDiagnostic at all (see extraction.ts's own comment on
    // that branch), so there is nothing for buildExtractionTracePayload to
    // observe for this candidate kind. Not fixed here.
    test('a material_demand_mention candidate produces no diagnostic entry at all -- the known, disclosed gap, not a bug in this milestone', async () => {
      const materialDemand: CandidateObservation = {
        proposal_id: 'm1',
        turn: 1,
        raw_text: 'Specifically I used Getty stock footage.',
        kind: 'material_demand_mention',
      }
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([materialDemand]))
      expect(diagnostics).toEqual([])
    })
  })

  describe('compound-goal observability canary (Phase 9)', () => {
    test('two explicit user_goal candidates in one turn, both accepted -> both preserved independently in the trace', async () => {
      const goalA = goalCandidate({ proposal_id: 'ga', raw_text: SECRET_RAW_TEXT })
      const goalB = goalCandidate({ proposal_id: 'gb', raw_text: SECRET_RAW_TEXT })
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalA, goalB]))
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      expect(payload.candidate_count).toBe(2)
      expect(payload.candidates).toHaveLength(2)
      expect(payload.candidates[0]).toMatchObject({ ordinal: 0, proposal_id: 'ga', candidate_kind: 'user_goal', disposition: 'accepted' })
      expect(payload.candidates[1]).toMatchObject({ ordinal: 1, proposal_id: 'gb', candidate_kind: 'user_goal', disposition: 'accepted' })
    })

    test('two explicit user_goal candidates in one turn, one accepted + one deferred -> both preserved independently, with distinct dispositions', async () => {
      const goalA = goalCandidate({ proposal_id: 'ga' })
      const goalB = goalCandidate({ proposal_id: 'gb', goal_confidence_hint: undefined })
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalA, goalB]))
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      expect(payload.candidates[0]).toMatchObject({ proposal_id: 'ga', disposition: 'accepted' })
      expect(payload.candidates[1]).toMatchObject({ proposal_id: 'gb', disposition: 'deferred', reason_code: 'CANDIDATE_UNCLASSIFIABLE' })
    })
  })

  describe('deferred/rejected reason-code fidelity (Phase 10)', () => {
    test('a rejected candidate persists the EXISTING reason_code verbatim, unreworded', async () => {
      const candidate = toolCandidate({ supersedes_tool_mention_id: 'does-not-exist' })
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([candidate]))
      expect(diagnostics[0].decision).toMatchObject({ outcome: 'rejected', reason_code: 'MUTATION_TARGET_NOT_FOUND' })
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      expect(payload.candidates[0].reason_code).toBe('MUTATION_TARGET_NOT_FOUND')
    })

    test('an accepted candidate carries no reason_code at all -- never fabricated', async () => {
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([toolCandidate()]))
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      expect(payload.candidates[0]).not.toHaveProperty('reason_code')
    })
  })

  describe('data minimization (Phase 11)', () => {
    test('the persisted payload never contains raw candidate text/tool/provider/jurisdiction content', async () => {
      const candidates: CandidateObservation[] = [
        toolCandidate({ proposal_id: 'c1' }),
        goalCandidate({ proposal_id: 'c2' }),
        { proposal_id: 'c3', turn: 1, raw_text: SECRET_RAW_TEXT, kind: 'asset_provider_mention', raw_provider_name: SECRET_PROVIDER_NAME },
        { proposal_id: 'c4', turn: 1, raw_text: SECRET_RAW_TEXT, kind: 'assessment_jurisdiction_mention', raw_jurisdiction_value: SECRET_JURISDICTION_VALUE },
      ]
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor(candidates))
      expect(diagnostics.length).toBeGreaterThanOrEqual(4)
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      const serialized = JSON.stringify(payload)
      expect(serialized).not.toMatch(SECRET_RAW_TEXT)
      expect(serialized).not.toMatch(SECRET_TOOL_NAME)
      expect(serialized).not.toMatch(SECRET_PROVIDER_NAME)
      expect(serialized).not.toMatch(SECRET_JURISDICTION_VALUE)
    })

    test('each candidate entry contains ONLY the fixed allowlisted keys -- no other field from ExtractionDiagnostic/CandidateObservation/NormalizationResult/ProposedFact leaks through', async () => {
      const candidates: CandidateObservation[] = [toolCandidate({ proposal_id: 'c1' }), goalCandidate({ proposal_id: 'c2', goal_confidence_hint: undefined })]
      const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor(candidates))
      const { client, insertCalls } = fakeClient()
      await recordCrcExtractionTrace(client, { sessionId: 's', turnNumber: 1, diagnostics })
      const payload = (insertCalls[0] as any).payload
      const ALLOWED_KEYS = new Set(['ordinal', 'proposal_id', 'candidate_kind', 'disposition', 'reason_code', 'applied_identifier'])
      for (const candidateEntry of payload.candidates) {
        for (const key of Object.keys(candidateEntry)) {
          expect(ALLOWED_KEYS.has(key)).toBe(true)
        }
      }
      expect(Object.keys(payload).sort()).toEqual(['candidate_count', 'candidates'])
    })
  })

  test('a Supabase insert error does not throw -- best-effort, fail-open', async () => {
    const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([toolCandidate()]))
    const { client } = fakeClient({ insertResult: { error: { message: 'write failed' } } })
    await expect(recordCrcExtractionTrace(client, { sessionId: 'x', turnNumber: 1, diagnostics })).resolves.toBeUndefined()
  })

  test('a unique-constraint violation (e.g. a genuine race between two requests computing the same turn_number) does not throw', async () => {
    const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([toolCandidate()]))
    const { client } = fakeClient({
      insertResult: { error: { code: '23505', message: 'duplicate key value violates unique constraint "crc_turn_traces_session_turn_kind_unique"' } },
    })
    await expect(recordCrcExtractionTrace(client, { sessionId: 'x', turnNumber: 1, diagnostics })).resolves.toBeUndefined()
  })

  test('an unexpected exception from the client does not throw', async () => {
    const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([toolCandidate()]))
    const client = {
      from: jest.fn(() => {
        throw new Error('client blew up')
      }),
    } as any
    await expect(recordCrcExtractionTrace(client, { sessionId: 'x', turnNumber: 1, diagnostics })).resolves.toBeUndefined()
  })
})
