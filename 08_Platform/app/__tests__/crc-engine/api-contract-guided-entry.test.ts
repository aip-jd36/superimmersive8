/**
 * Guided Entry Foundation (GE-1) — api-contract.ts's new `guidedInit`
 * request kind. Focused on the parsing/mutual-exclusivity contract itself;
 * validation-detail coverage lives in guided-entry-init.test.ts.
 *
 * Run: npx jest __tests__/crc-engine/api-contract-guided-entry.test.ts
 */

import { parseRequest, type TurnRequestBody } from '../../lib/crc-engine/api-contract'

const VALID_ID = '22222222-2222-4222-8222-222222222222'

function validGuidedBody(): TurnRequestBody {
  return {
    guidedInit: {
      guidedEntryInitId: VALID_ID,
      definitionId: 'agency-producing-for-client',
      definitionVersion: 'v1',
      fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }],
      concern: 'Can I use this commercially?',
    },
  }
}

describe('parseRequest — guidedInit', () => {
  test('parses a valid guidedInit into kind: guided_entry_init, restart always false', () => {
    const result = parseRequest(validGuidedBody())
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.kind).toBe('guided_entry_init')
    expect(result.restart).toBe(false)
    if (result.kind === 'guided_entry_init') {
      expect(result.guidedEntryInitId).toBe(VALID_ID)
      expect(result.selection.definitionId).toBe('agency-producing-for-client')
    }
  })

  test('propagates a validation failure from validateGuidedEntryRequest as a parse error, never silently falling through to another kind', () => {
    const body: TurnRequestBody = { guidedInit: { ...(validGuidedBody().guidedInit as object), definitionId: 'unknown-definition' } }
    const result = parseRequest(body)
    expect('error' in result).toBe(true)
  })

  test('guidedInit is mutually exclusive with message', () => {
    const body: TurnRequestBody = { ...validGuidedBody(), message: 'hello' }
    const result = parseRequest(body)
    expect('error' in result).toBe(true)
    if ('error' in result) expect(result.error).toMatch(/exactly one of/)
  })

  test('guidedInit is mutually exclusive with declineAction, email, and resendResultEmail', () => {
    expect('error' in parseRequest({ ...validGuidedBody(), declineAction: 'skip_question' })).toBe(true)
    expect('error' in parseRequest({ ...validGuidedBody(), email: 'a@b.com' })).toBe(true)
    expect('error' in parseRequest({ ...validGuidedBody(), resendResultEmail: true })).toBe(true)
  })

  test('a missing guidedEntryInitId is rejected before reaching definition validation', () => {
    const body: TurnRequestBody = { guidedInit: { definitionId: 'agency-producing-for-client', definitionVersion: 'v1', fields: [], concern: 'x' } }
    const result = parseRequest(body)
    expect('error' in result).toBe(true)
    if ('error' in result) expect(result.error).toMatch(/guidedEntryInitId is required/)
  })

  test('malformed request with none of message/declineAction/email/resendResultEmail/guidedInit is rejected', () => {
    const result = parseRequest({})
    expect('error' in result).toBe(true)
  })
})
