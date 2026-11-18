/**
 * CR-PUBLIC-2A-FIX — the admin "new account" notification.
 *
 * Proves: the public `POST /api/notify-signup` is gone and nothing calls it; the notification is sent only from
 * `/auth/callback` after Supabase exchanged the single-use confirmation code for a session, and only for an email confirmed
 * within the window (a replayed link, an invalid code or an old account sends nothing); user-controlled values are escaped; a
 * failing send never affects the redirect; every outcome redirects identically, so nothing reveals whether an account exists.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'

const exchangeCodeForSession = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { exchangeCodeForSession } }) }))
const sent: Array<Record<string, unknown>> = []
let sendThrows = false
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: async (msg: Record<string, unknown>) => { if (sendThrows) throw new Error('provider down'); sent.push(msg); return { data: { id: 'x' }, error: null } } },
  })),
}))

import { GET } from '@/app/auth/callback/route'
import { sendNewUserSignupEmail } from '@/lib/emails'
import { isFreshConfirmation, notifyConfirmedSignup, signupProductLabel, SIGNUP_NOTIFY_WINDOW_MS } from '@/lib/auth/signup-notification'

const APP = path.join(__dirname, '..', '..')
const NOW = Date.parse('2026-11-18T10:00:00.000Z')
const user = (over: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111', email: 'new.creator@example.test',
  email_confirmed_at: new Date(Date.now() - 1000).toISOString(), user_metadata: { full_name: 'New Creator' }, ...over,
})
const callback = (qs: string) => GET({ url: `https://app.test/auth/callback${qs}` } as never)

beforeEach(() => { exchangeCodeForSession.mockReset(); sent.length = 0; sendThrows = false })

describe('the public notification endpoint is gone', () => {
  test('no /api/notify-signup route file, and nothing in the app calls it', () => {
    expect(existsSync(path.join(APP, 'app', 'api', 'notify-signup'))).toBe(false)
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const f = path.join(d, n); return statSync(f).isDirectory() ? walk(f) : [f] })
    const files = ['app', 'components', 'lib'].flatMap((d) => walk(path.join(APP, d))).filter((f) => /\.(tsx?|jsx?)$/.test(f))
    const callers = files.filter((f) => /['"`]\/api\/notify-signup/.test(readFileSync(f, 'utf8')))
    expect(callers.map((f) => path.relative(APP, f))).toEqual([])
  })

  test('only the auth callback sends the sign-up email; no API route does', () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const f = path.join(d, n); return statSync(f).isDirectory() ? walk(f) : [f] })
    const users = walk(path.join(APP, 'app')).filter((f) => /\.(tsx?)$/.test(f) && /sendNewUserSignupEmail/.test(readFileSync(f, 'utf8')))
    expect(users.map((f) => path.relative(APP, f).split(path.sep).join('/'))).toEqual(['app/auth/callback/route.ts'])
  })
})

describe('eligibility: a fresh confirmation proven by Supabase', () => {
  test('confirmed within the window, with an email', () => {
    expect(isFreshConfirmation({ email: 'a@b.co', email_confirmed_at: new Date(NOW - 1000).toISOString() }, NOW)).toBe(true)
    expect(isFreshConfirmation({ email: 'a@b.co', email_confirmed_at: new Date(NOW - SIGNUP_NOTIFY_WINDOW_MS + 1000).toISOString() }, NOW)).toBe(true)
  })

  test('not eligible: no user, no email, unconfirmed, invalid, too old, or in the future', () => {
    for (const u of [null, undefined, {}, { email: '' }, { email: 'a@b.co' }, { email: 'a@b.co', email_confirmed_at: null },
      { email: 'a@b.co', email_confirmed_at: 'not a date' }, { email: 'a@b.co', email_confirmed_at: new Date(NOW - SIGNUP_NOTIFY_WINDOW_MS - 1000).toISOString() },
      { email: 'a@b.co', email_confirmed_at: new Date(NOW + 60_000).toISOString() }]) {
      expect(isFreshConfirmation(u as never, NOW)).toBe(false)
    }
  })

  test('product label comes from the callback destination, as fixed text', () => {
    expect(signupProductLabel('/creator-record')).toBe('Creator Record')
    expect(signupProductLabel('/creator-record?x=1')).toBe('Creator Record')
    expect(signupProductLabel('/certify')).toBe('SI8 Certified')
    expect(signupProductLabel('/dashboard')).toBe('Not specified')
    expect(signupProductLabel('/<script>')).toBe('Not specified')
  })

  test('a failing sender is swallowed with a fixed log code (no personal data)', async () => {
    const logs: string[] = []
    const r = await notifyConfirmedSignup({ email: 'a@b.co', email_confirmed_at: new Date(NOW).toISOString() }, '/creator-record', { send: async () => { throw new Error('a@b.co') }, now: () => NOW, log: (c) => logs.push(c) })
    expect(r).toBe('failed')
    expect(logs).toEqual(['send_failed'])
  })
})

describe('/auth/callback', () => {
  test('a freshly confirmed account: one escaped notification, then the usual redirect', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user: user({ user_metadata: { full_name: '<img src=x onerror=alert(1)> Eve' } }) }, error: null })
    const res = await callback('?code=abc&next=%2Fcreator-record')
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.test/creator-record')
    expect(sent).toHaveLength(1)
    const html = String(sent[0].html)
    expect(html).not.toMatch(/<img/)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; Eve')
    expect(html).toContain('Creator Record')
    expect(html).toContain('Email confirmed')
  })

  test('replayed or invalid code, no code, or an old confirmation: nothing is sent, same redirect', async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: 'invalid flow state' } })
    const replay = await callback('?code=used&next=%2Fcreator-record')
    const none = await callback('?next=%2Fcreator-record')
    exchangeCodeForSession.mockResolvedValueOnce({ data: { user: user({ email_confirmed_at: '2026-01-01T00:00:00.000Z' }) }, error: null })
    const old = await callback('?code=abc&next=%2Fcreator-record')
    for (const r of [replay, none, old]) {
      expect(r.status).toBe(307)
      expect(r.headers.get('location')).toBe('https://app.test/creator-record')
    }
    expect(sent).toHaveLength(0)
  })

  test('a failing email provider never breaks sign-up: the redirect still happens', async () => {
    sendThrows = true
    exchangeCodeForSession.mockResolvedValue({ data: { user: user() }, error: null })
    const res = await callback('?code=abc')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.test/dashboard')
  })

  test('the redirect logic is unchanged (default /dashboard; relative next only)', async () => {
    expect((await callback('')).headers.get('location')).toBe('https://app.test/dashboard')
    expect((await callback('?next=https%3A%2F%2Fevil.example')).headers.get('location')).toBe('https://app.test/dashboard')
  })
})

describe('sendNewUserSignupEmail escapes every user-controlled value', () => {
  test('HTML, subject and mailto are safe for hostile input', async () => {
    await sendNewUserSignupEmail('A <b>bold</b>\r\nBcc: x@evil.example', 'x"><script>@evil.example', 'Creator Record')
    expect(sent).toHaveLength(1)
    const msg = sent[0]
    expect(String(msg.subject)).not.toMatch(/[\r\n]/)
    expect(String(msg.html)).not.toMatch(/<b>|<script>|"><script/)
    expect(String(msg.html)).toContain('A &lt;b&gt;bold&lt;/b&gt;')
    expect(String(msg.html)).toMatch(/href="mailto:x%22%3E%3Cscript%3E%40evil\.example"/)
  })
})
