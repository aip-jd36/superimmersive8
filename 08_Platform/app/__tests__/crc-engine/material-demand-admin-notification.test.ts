/**
 * sendMaterialDemandAdminNotification tests (LK-DEMAND-2E, 2026-09-18).
 * Mocks the `resend` package directly (lib/emails.ts's own dependency) --
 * no existing test file for lib/emails.ts predates this one, so this
 * establishes the mocking convention for it.
 */

const mockSend = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

import { sendMaterialDemandAdminNotification, type MaterialDemandObservation } from '../../lib/emails'

function observation(overrides: Partial<MaterialDemandObservation> = {}): MaterialDemandObservation {
  return {
    occurrence_id: 'kd-t2-abc123',
    session_id: 'f4358c65-0c2e-4458-a787-db863d6a9345',
    source_turn: 2,
    raw_text: 'on YouTube',
    created_at: '2026-09-18T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  mockSend.mockReset()
  mockSend.mockResolvedValue({ data: { id: 'resend-msg-1' }, error: null })
})

describe('sendMaterialDemandAdminNotification', () => {
  test('11. email goes to the established ADMIN_EMAIL address (module fallback -- no ADMIN_EMAIL set in the test environment)', async () => {
    await sendMaterialDemandAdminNotification([observation()])
    expect(mockSend).toHaveBeenCalledTimes(1)
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('jd@superimmersive8.com')
  })

  test('12. uses the established SI8 sender/from convention, unchanged from the rest of lib/emails.ts', async () => {
    await sendMaterialDemandAdminNotification([observation()])
    const call = mockSend.mock.calls[0][0]
    expect(call.from).toBe('SI8 Creator Portal <noreply@superimmersive8.com>')
  })

  test('13. one email correctly contains one new observation', async () => {
    await sendMaterialDemandAdminNotification([observation({ raw_text: 'on YouTube' })])
    expect(mockSend).toHaveBeenCalledTimes(1)
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('on YouTube')
    expect(call.subject).toBe('New CRC Material Demand observation')
  })

  test('14. one email can contain multiple observations from the same turn batch', async () => {
    await sendMaterialDemandAdminNotification([
      observation({ occurrence_id: 'kd-t2-a', raw_text: 'on Kick' }),
      observation({ occurrence_id: 'kd-t2-b', raw_text: 'on Twitch' }),
    ])
    expect(mockSend).toHaveBeenCalledTimes(1) // still exactly ONE email
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('on Kick')
    expect(call.html).toContain('on Twitch')
  })

  test('zero observations -- no provider call at all', async () => {
    await sendMaterialDemandAdminNotification([])
    expect(mockSend).not.toHaveBeenCalled()
  })

  test('15. user-controlled HTML in raw_text is escaped -- cannot become active HTML', async () => {
    const malicious = `<script>alert('xss')</script> & "quoted" 'stuff'`
    await sendMaterialDemandAdminNotification([observation({ raw_text: malicious })])
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toContain('<script>')
    expect(call.html).not.toContain("alert('xss')")
    expect(call.html).toContain('&lt;script&gt;')
    expect(call.html).toContain('&amp;')
    expect(call.html).toContain('&quot;quoted&quot;')
    expect(call.html).toContain('&#39;stuff&#39;')
  })

  test('session_id and occurrence_id are also escaped, not just raw_text', async () => {
    await sendMaterialDemandAdminNotification([observation({ session_id: '<b>injected</b>', occurrence_id: '"quoted-id"' })])
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toContain('<b>injected</b>')
    expect(call.html).toContain('&lt;b&gt;injected&lt;/b&gt;')
    expect(call.html).toContain('&quot;quoted-id&quot;')
  })

  test('very long raw_text is truncated for display only, with a clear truncation indicator', async () => {
    const longText = 'x'.repeat(1000)
    await sendMaterialDemandAdminNotification([observation({ raw_text: longText })])
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toContain(longText)
    expect(call.html).toContain('truncated for display only')
  })

  test('16. the governance-status sentence is present exactly as fixed SI8 copy', async () => {
    await sendMaterialDemandAdminNotification([observation()])
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain(
      'Raw Material Demand evidence only. Not yet classified as a governed subject, knowledge gap, or governance candidate. No action is implied.',
    )
  })

  test('the governance-status sentence is identical regardless of observation content -- never composed from occurrence data', async () => {
    const withYouTube = await (async () => {
      await sendMaterialDemandAdminNotification([observation({ raw_text: 'on YouTube' })])
      return mockSend.mock.calls[0][0].html as string
    })()
    mockSend.mockClear()
    const withFooVideo = await (async () => {
      await sendMaterialDemandAdminNotification([observation({ raw_text: 'on FooVideo' })])
      return mockSend.mock.calls[0][0].html as string
    })()
    const extractStatus = (html: string) => html.split('Governance status')[1]
    expect(extractStatus(withYouTube)).toBe(extractStatus(withFooVideo))
  })

  test('17. the email never contains a forbidden governance conclusion phrase', async () => {
    await sendMaterialDemandAdminNotification([observation({ raw_text: 'on YouTube' })])
    const call = mockSend.mock.calls[0][0]
    const forbidden = [
      'New Living Knowledge gap',
      'New LK domain',
      'new domain discovered',
      'Missing Living Knowledge',
      'YouTube needs onboarding',
      'needs onboarding',
      'Unsupported platform',
      'Coverage failure',
      'knowledge gap identified',
    ]
    for (const phrase of forbidden) {
      expect(call.html.toLowerCase()).not.toContain(phrase.toLowerCase())
    }
  })

  test('18/19. a provider rejection is swallowed/logged and does not throw to the caller', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockResolvedValue({ data: null, error: { message: 'provider rejected' } })
    await expect(sendMaterialDemandAdminNotification([observation()])).resolves.toBeUndefined()
    spy.mockRestore()
  })

  test('18/19. a thrown network/provider exception is swallowed/logged and does not throw to the caller', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockRejectedValue(new Error('network timeout'))
    await expect(sendMaterialDemandAdminNotification([observation()])).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('20. the database-created timestamp (created_at) is rendered verbatim from the passed row, not invented', async () => {
    await sendMaterialDemandAdminNotification([observation({ created_at: '2026-01-02T03:04:05.000Z' })])
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('2026-01-02T03:04:05.000Z')
  })

  test('session_id, source_turn, and occurrence_id are all present in the email body', async () => {
    await sendMaterialDemandAdminNotification([observation({ session_id: 'sess-abc', source_turn: 7, occurrence_id: 'kd-t7-xyz' })])
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('sess-abc')
    expect(call.html).toContain('7')
    expect(call.html).toContain('kd-t7-xyz')
  })

  test('does not contain a customer email address or any PII field', async () => {
    await sendMaterialDemandAdminNotification([observation()])
    const call = mockSend.mock.calls[0][0]
    expect(call.html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/) // no email-address-shaped string embedded in the body
  })
})
