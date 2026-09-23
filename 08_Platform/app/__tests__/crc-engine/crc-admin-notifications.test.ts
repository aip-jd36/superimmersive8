/**
 * CRC-OPS-NOTIFY-1 (2026-09-23) -- sendCrcSessionStartedAdminNotification /
 * sendCrcResultsEmailCapturedAdminNotification tests. Mocks the `resend`
 * package directly, same convention already established by
 * material-demand-admin-notification.test.ts (lib/emails.ts's own first
 * such test file).
 */

const mockSend = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

import {
  sendCrcSessionStartedAdminNotification,
  sendCrcResultsEmailCapturedAdminNotification,
  type CrcSessionStartedNotification,
  type CrcResultsEmailCapturedNotification,
} from '../../lib/emails'

function startedPayload(overrides: Partial<CrcSessionStartedNotification> = {}): CrcSessionStartedNotification {
  return {
    sessionId: 'f4358c65-0c2e-4458-a787-db863d6a9345',
    initializationSource: 'free_form',
    attributionToken: 'attr-token-1',
    ...overrides,
  }
}

function completedPayload(overrides: Partial<CrcResultsEmailCapturedNotification> = {}): CrcResultsEmailCapturedNotification {
  return {
    sessionId: 'f4358c65-0c2e-4458-a787-db863d6a9345',
    turnCount: 6,
    initializationSource: 'free_form',
    email: 'partner@example.com',
    attributionToken: 'attr-token-1',
    ...overrides,
  }
}

beforeEach(() => {
  mockSend.mockReset()
  mockSend.mockResolvedValue({ data: { id: 'resend-msg-1' }, error: null })
})

describe('sendCrcSessionStartedAdminNotification', () => {
  test('sends to ADMIN_EMAIL using the established SI8 sender convention', async () => {
    await sendCrcSessionStartedAdminNotification(startedPayload())
    expect(mockSend).toHaveBeenCalledTimes(1)
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('jd@superimmersive8.com')
    expect(call.from).toBe('SI8 Creator Portal <noreply@superimmersive8.com>')
    expect(call.subject).toBe('New CRC session started')
  })

  test('renders event type, session ID, and initialization source', async () => {
    await sendCrcSessionStartedAdminNotification(startedPayload({ sessionId: 'sess-abc', initializationSource: 'guided' }))
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('crc_session_started')
    expect(call.html).toContain('sess-abc')
    expect(call.html).toContain('guided')
  })

  test('includes attribution token when present', async () => {
    await sendCrcSessionStartedAdminNotification(startedPayload({ attributionToken: 'my-attr-token' }))
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('my-attr-token')
  })

  test('omits the attribution-token line entirely when absent (data minimization: no fabricated field)', async () => {
    await sendCrcSessionStartedAdminNotification(startedPayload({ attributionToken: null }))
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toContain('Attribution token')
  })

  test('CRC-OPS-GEO-1: renders "Approximate country: Taiwan" when present', async () => {
    await sendCrcSessionStartedAdminNotification(startedPayload({ approximateCountry: 'Taiwan' }))
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('<strong>Approximate country:</strong> Taiwan')
  })

  test('CRC-OPS-GEO-1: omits the approximate-country line entirely when absent -- never renders "Unknown"', async () => {
    await sendCrcSessionStartedAdminNotification(startedPayload({ approximateCountry: null }))
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toContain('Approximate country')
    expect(call.html).not.toContain('Unknown')
  })

  test('data minimization: contains no transcript, IP, or abuse-key-shaped content', async () => {
    await sendCrcSessionStartedAdminNotification(startedPayload())
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toMatch(/transcript/i)
    expect(call.html).not.toMatch(/raw_ip|rawIp/i)
    expect(call.html).not.toMatch(/abuse.?key/i)
  })

  test('user-controlled session ID is HTML-escaped', async () => {
    await sendCrcSessionStartedAdminNotification(startedPayload({ sessionId: '<script>alert(1)</script>' }))
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toContain('<script>')
    expect(call.html).toContain('&lt;script&gt;')
  })

  test('a provider rejection is swallowed/logged and never throws to the caller', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockResolvedValue({ data: null, error: { message: 'provider rejected' } })
    await expect(sendCrcSessionStartedAdminNotification(startedPayload())).resolves.toBeUndefined()
    spy.mockRestore()
  })

  test('a thrown network/provider exception is swallowed/logged and never throws to the caller', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockRejectedValue(new Error('network timeout'))
    await expect(sendCrcSessionStartedAdminNotification(startedPayload())).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('sendCrcResultsEmailCapturedAdminNotification', () => {
  test('sends to ADMIN_EMAIL using the established SI8 sender convention', async () => {
    await sendCrcResultsEmailCapturedAdminNotification(completedPayload())
    expect(mockSend).toHaveBeenCalledTimes(1)
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('jd@superimmersive8.com')
    expect(call.from).toBe('SI8 Creator Portal <noreply@superimmersive8.com>')
    expect(call.subject).toBe('CRC results email captured')
  })

  test('renders event type, session ID, turn count, initialization source, and the submitted email', async () => {
    await sendCrcResultsEmailCapturedAdminNotification(
      completedPayload({ sessionId: 'sess-xyz', turnCount: 9, initializationSource: 'guided', email: 'buyer@partner-co.com' }),
    )
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('crc_results_email_captured')
    expect(call.html).toContain('sess-xyz')
    expect(call.html).toContain('9')
    expect(call.html).toContain('guided')
    expect(call.html).toContain('buyer@partner-co.com')
  })

  test('null initialization source renders as "unknown", never fabricated as free_form/guided', async () => {
    await sendCrcResultsEmailCapturedAdminNotification(completedPayload({ initializationSource: null }))
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('unknown')
  })

  test('includes attribution token when present, omits the line entirely when absent', async () => {
    const withToken = await (async () => {
      await sendCrcResultsEmailCapturedAdminNotification(completedPayload({ attributionToken: 'present-token' }))
      return mockSend.mock.calls[0][0].html as string
    })()
    expect(withToken).toContain('present-token')
    mockSend.mockClear()
    await sendCrcResultsEmailCapturedAdminNotification(completedPayload({ attributionToken: null }))
    const withoutToken = mockSend.mock.calls[0][0].html as string
    expect(withoutToken).not.toContain('Attribution token')
  })

  test('CRC-OPS-GEO-1: renders "Approximate country: Taiwan" when present, omits the line entirely when absent (never "Unknown")', async () => {
    await sendCrcResultsEmailCapturedAdminNotification(completedPayload({ approximateCountry: 'Taiwan' }))
    const withCountry = mockSend.mock.calls[0][0].html as string
    expect(withCountry).toContain('<strong>Approximate country:</strong> Taiwan')
    mockSend.mockClear()
    await sendCrcResultsEmailCapturedAdminNotification(completedPayload({ approximateCountry: null }))
    const withoutCountry = mockSend.mock.calls[0][0].html as string
    expect(withoutCountry).not.toContain('Approximate country')
    expect(withoutCountry).not.toContain('Unknown')
  })

  test('data minimization: contains no transcript, IP, abuse-key, or StructuredUnderstanding-shaped content', async () => {
    await sendCrcResultsEmailCapturedAdminNotification(completedPayload())
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toMatch(/transcript/i)
    expect(call.html).not.toMatch(/raw_ip|rawIp/i)
    expect(call.html).not.toMatch(/abuse.?key/i)
    expect(call.html).not.toMatch(/structured_understanding|StructuredUnderstanding/)
    expect(call.html).not.toMatch(/tool_mentions|scoped_observations/)
  })

  test('user-controlled email address is HTML-escaped', async () => {
    await sendCrcResultsEmailCapturedAdminNotification(completedPayload({ email: '"><script>alert(1)</script>' }))
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toContain('<script>')
  })

  test('a provider rejection is swallowed/logged and never throws to the caller', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockResolvedValue({ data: null, error: { message: 'provider rejected' } })
    await expect(sendCrcResultsEmailCapturedAdminNotification(completedPayload())).resolves.toBeUndefined()
    spy.mockRestore()
  })

  test('a thrown network/provider exception is swallowed/logged and never throws to the caller', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockRejectedValue(new Error('network timeout'))
    await expect(sendCrcResultsEmailCapturedAdminNotification(completedPayload())).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
