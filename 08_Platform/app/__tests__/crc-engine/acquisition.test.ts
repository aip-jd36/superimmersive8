/**
 * CRC acquisition attribution (2026-09-29) -- sanitiser, request contract,
 * and the two session-creation writers. Writers use the same small
 * fake-client pattern as supabase-session-store-guided-entry.test.ts.
 *
 * Run: npx jest __tests__/crc-engine/acquisition.test.ts
 */

import {
  ACQUISITION_PARAM_KEYS,
  EMPTY_ACQUISITION,
  readAcquisitionFromSearch,
  sanitizeAcquisition,
  toAcquisitionColumns,
} from '../../lib/crc-engine/acquisition'
import { parseRequest } from '../../lib/crc-engine/api-contract'
import { createGuidedEntrySession, saveCrcSessionCreationMeta } from '../../lib/crc-engine/supabase-session-store'

const ALL_FIVE = { utm_source: 'linkedin', utm_medium: 'outreach', utm_campaign: 'old-lead-test', utm_content: 'v2', ref: 'B087' }

describe('sanitizeAcquisition', () => {
  test('all five approved values are kept exactly as given', () => {
    expect(sanitizeAcquisition(ALL_FIVE)).toEqual(ALL_FIVE)
  })

  test('missing values become null', () => {
    expect(sanitizeAcquisition({ utm_source: 'linkedin' })).toEqual({ ...EMPTY_ACQUISITION, utm_source: 'linkedin' })
  })

  test('extra keys are dropped -- output always has exactly the five approved keys', () => {
    const result = sanitizeAcquisition({ ...ALL_FIVE, gclid: 'abc', fbclid: 'x', email: 'a' })
    expect(Object.keys(result).sort()).toEqual([...ACQUISITION_PARAM_KEYS].sort())
  })

  test('non-string values become null', () => {
    expect(sanitizeAcquisition({ utm_source: 42, utm_medium: true, utm_campaign: ['x'], utm_content: { a: 1 }, ref: null })).toEqual(EMPTY_ACQUISITION)
  })

  test('empty and whitespace-only values become null; surrounding whitespace is trimmed', () => {
    expect(sanitizeAcquisition({ utm_source: '', utm_medium: '   ', utm_campaign: '  q4-test  ' })).toEqual({
      ...EMPTY_ACQUISITION,
      utm_campaign: 'q4-test',
    })
  })

  test('exact maximum lengths pass; one character over becomes null (never truncated)', () => {
    const utm100 = 'a'.repeat(100)
    const ref64 = 'B'.repeat(64)
    expect(sanitizeAcquisition({ utm_campaign: utm100, ref: ref64 })).toEqual({ ...EMPTY_ACQUISITION, utm_campaign: utm100, ref: ref64 })
    expect(sanitizeAcquisition({ utm_campaign: 'a'.repeat(101), ref: 'B'.repeat(65) })).toEqual(EMPTY_ACQUISITION)
  })

  test.each(['old lead', 'a+b', 'x@y.com', 'https://evil.example', 'a/b', '100%', 'a%20b', '<script>', 'ünïcode', "o'neil"])(
    'invalid characters become null: %p',
    (value) => {
      expect(sanitizeAcquisition({ utm_campaign: value }).utm_campaign).toBeNull()
    },
  )

  test('full allowed charset passes: letters, digits, dot, underscore, tilde, hyphen', () => {
    expect(sanitizeAcquisition({ utm_content: 'Aa0._~-Zz9' }).utm_content).toBe('Aa0._~-Zz9')
  })

  test('no case normalization', () => {
    expect(sanitizeAcquisition({ utm_source: 'LinkedIn' }).utm_source).toBe('LinkedIn')
  })

  test.each([null, undefined, 'utm_source=linkedin', 7, [ALL_FIVE]])('non-object input yields all nulls and never throws: %p', (raw) => {
    expect(sanitizeAcquisition(raw)).toEqual(EMPTY_ACQUISITION)
  })
})

describe('readAcquisitionFromSearch', () => {
  test('reads the five approved parameters and ignores everything else', () => {
    expect(readAcquisitionFromSearch('?utm_source=linkedin&utm_medium=outreach&utm_campaign=old-lead-test&utm_content=v2&ref=B087&foo=bar&gclid=x')).toEqual(ALL_FIVE)
  })

  test('percent-encoded valid values decode and pass', () => {
    expect(readAcquisitionFromSearch('?utm_campaign=old%5Flead%2Etest').utm_campaign).toBe('old_lead.test')
  })

  test('untagged URL yields all nulls', () => {
    expect(readAcquisitionFromSearch('')).toEqual(EMPTY_ACQUISITION)
  })
})

describe('toAcquisitionColumns', () => {
  test('maps public ref to acquisition_ref', () => {
    expect(toAcquisitionColumns(sanitizeAcquisition(ALL_FIVE))).toEqual({
      utm_source: 'linkedin',
      utm_medium: 'outreach',
      utm_campaign: 'old-lead-test',
      utm_content: 'v2',
      acquisition_ref: 'B087',
    })
  })

  test('omits null fields entirely -- untagged traffic references no acquisition columns', () => {
    expect(toAcquisitionColumns(EMPTY_ACQUISITION)).toEqual({})
    expect(toAcquisitionColumns({ ...EMPTY_ACQUISITION, utm_campaign: 'c1' })).toEqual({ utm_campaign: 'c1' })
  })
})

describe('parseRequest -- acquisition is not an action field', () => {
  test('message carries sanitized acquisition without tripping the one-action rule', () => {
    expect(parseRequest({ message: 'hi', acquisition: { ...ALL_FIVE, foo: 'bar' } })).toEqual({
      kind: 'message',
      text: 'hi',
      restart: false,
      acquisition: ALL_FIVE,
    })
  })

  test('decline carries sanitized acquisition', () => {
    expect(parseRequest({ declineAction: 'stop_interview', acquisition: { utm_campaign: 'c1' } })).toEqual({
      kind: 'decline',
      action: 'stop_interview',
      restart: false,
      acquisition: { ...EMPTY_ACQUISITION, utm_campaign: 'c1' },
    })
  })

  test('guided init carries sanitized acquisition', () => {
    const parsed = parseRequest({
      // Same valid fixture as api-contract-guided-entry.test.ts.
      guidedInit: {
        guidedEntryInitId: '11111111-1111-4111-8111-111111111111',
        definitionId: 'agency-producing-for-client',
        definitionVersion: 'v2',
        fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }],
        concern: 'Can we use this for a client ad?',
      },
      acquisition: { utm_source: 'linkedin', ref: 'B087' },
    })
    if ('error' in parsed) {
      // Guided payload shape is validated by guided-entry-init.ts; if this
      // fixture drifts from its definitions, fail loudly rather than skip.
      throw new Error(`guided fixture rejected: ${parsed.error}`)
    }
    expect(parsed.kind).toBe('guided_entry_init')
    expect('acquisition' in parsed && parsed.acquisition).toEqual({ ...EMPTY_ACQUISITION, utm_source: 'linkedin', ref: 'B087' })
  })

  test('untagged or fully-invalid acquisition leaves the parsed request exactly as before (no acquisition key)', () => {
    expect(parseRequest({ message: 'hi', acquisition: EMPTY_ACQUISITION })).toEqual({ kind: 'message', text: 'hi', restart: false })
    expect(parseRequest({ message: 'hi', acquisition: { utm_source: 'bad value', ref: 'x@y.com' } })).toEqual({ kind: 'message', text: 'hi', restart: false })
    expect(parseRequest({ message: 'hi' })).toEqual({ kind: 'message', text: 'hi', restart: false })
  })

  test('email and resend requests are unaffected -- acquisition never attaches to them', () => {
    expect(parseRequest({ email: 'A@B.co', acquisition: ALL_FIVE })).toEqual({ kind: 'email', email: 'a@b.co', restart: false })
    expect(parseRequest({ resendResultEmail: true, acquisition: ALL_FIVE })).toEqual({ kind: 'resend_result_email', restart: false })
  })

  test('the one-action rule still applies to the real action fields', () => {
    expect(parseRequest({ message: 'hi', declineAction: 'stop_interview', acquisition: ALL_FIVE })).toHaveProperty('error')
  })
})

// ── Session-creation writers ──────────────────────────────────────────────

function fakeClient(overrides: { insertResult?: { error: unknown }; selectResult?: { data: unknown; error: unknown } } = {}) {
  const insertResult = overrides.insertResult ?? { error: null }
  const selectResult = overrides.selectResult ?? { data: null, error: null }
  const insertCalls: Record<string, unknown>[] = []
  const updateCalls: Record<string, unknown>[] = []
  const client = {
    from: jest.fn(() => ({
      insert: jest.fn(async (payload: Record<string, unknown>) => {
        insertCalls.push(payload)
        return insertResult
      }),
      update: jest.fn((payload: Record<string, unknown>) => {
        updateCalls.push(payload)
        return { eq: jest.fn(async () => ({ error: null })) }
      }),
      select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: jest.fn(async () => selectResult) })) })),
    })),
  }
  return { client: client as any, insertCalls, updateCalls }
}

const GUIDED_INPUT = {
  token: 'tok-abc',
  structured_understanding: { fake: 'su' },
  boundary_state: { fake: 'boundary' },
  guided_entry_definition_id: 'agency-producing-for-client',
  guided_entry_definition_version: 'v1',
  traffic_type: 'pilot',
  abuse_key: null,
  runtime_commit: 'abc123',
  model_config: {},
  attribution_token: 'attr-1',
}

const COLUMNS = toAcquisitionColumns(sanitizeAcquisition(ALL_FIVE))
const ACQ_COLUMN_NAMES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'acquisition_ref']

describe('createGuidedEntrySession -- guided creation stores acquisition in the same atomic insert', () => {
  test('all five columns land in the single insert payload', async () => {
    const { client, insertCalls } = fakeClient()
    await createGuidedEntrySession(client, { ...GUIDED_INPUT, acquisition: COLUMNS })
    expect(insertCalls).toHaveLength(1)
    expect(insertCalls[0]).toMatchObject(COLUMNS)
    expect(insertCalls[0].initialization_source).toBe('guided')
  })

  test('untagged: no acquisition columns appear in the insert payload at all', async () => {
    const { client, insertCalls } = fakeClient()
    await createGuidedEntrySession(client, { ...GUIDED_INPUT, acquisition: {} })
    await createGuidedEntrySession(client, GUIDED_INPUT)
    for (const payload of insertCalls) {
      for (const col of ACQ_COLUMN_NAMES) expect(payload).not.toHaveProperty(col)
    }
  })

  test('guided retry (duplicate key) never overwrites: the failed insert is the only write, no update is issued', async () => {
    const { client, insertCalls, updateCalls } = fakeClient({
      insertResult: { error: { code: '23505', message: 'duplicate key' } },
      selectResult: {
        data: {
          initialization_source: 'guided',
          guided_entry_definition_id: 'agency-producing-for-client',
          guided_entry_definition_version: 'v1',
          turn_count: 1,
          transcript: [],
        },
        error: null,
      },
    })
    const result = await createGuidedEntrySession(client, { ...GUIDED_INPUT, acquisition: toAcquisitionColumns({ ...EMPTY_ACQUISITION, utm_campaign: 'second-touch' }) })
    expect(result.outcome).toBe('already_initialized')
    expect(insertCalls).toHaveLength(1)
    expect(updateCalls).toHaveLength(0)
  })
})

describe('saveCrcSessionCreationMeta -- free-form creation stores acquisition in the one-time creation update', () => {
  const META = {
    traffic_type: 'pilot',
    abuse_key: null,
    runtime_commit: 'abc123',
    model_config: {},
    attribution_token: 'attr-2',
    initialization_source: 'free_form' as const,
  }

  test('all five columns land in the single creation update', async () => {
    const { client, updateCalls } = fakeClient()
    await saveCrcSessionCreationMeta(client, 'tok-ff', { ...META, ...COLUMNS })
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]).toMatchObject({ ...COLUMNS, initialization_source: 'free_form', attribution_token: 'attr-2' })
  })

  test('untagged: the creation update contains no acquisition columns (unchanged from before)', async () => {
    const { client, updateCalls } = fakeClient()
    await saveCrcSessionCreationMeta(client, 'tok-ff', { ...META, ...toAcquisitionColumns(EMPTY_ACQUISITION) })
    expect(updateCalls[0]).toEqual(META)
  })
})
