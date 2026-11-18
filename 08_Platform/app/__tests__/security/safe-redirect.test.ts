/**
 * CR-PUBLIC-2A-FINAL — post-authentication redirect validation (`lib/auth/safe-redirect.ts`), as used by `/auth/callback` and
 * `/auth/login`. Before: `next.startsWith('/')` let `//evil.example` (protocol-relative) send a signed-in user off-site.
 */
import { readFileSync } from 'fs'
import path from 'path'

const exchangeCodeForSession = jest.fn(async () => ({ data: { user: null }, error: { message: 'no' } }))
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { exchangeCodeForSession } }) }))
jest.mock('@/lib/emails', () => ({ sendNewUserSignupEmail: jest.fn() }))

import { safeRedirectPath } from '@/lib/auth/safe-redirect'
import { GET } from '@/app/auth/callback/route'

const APP = path.join(__dirname, '..', '..')

describe('safeRedirectPath', () => {
  test.each([
    ['/dashboard', '/dashboard'],
    ['/creator-record', '/creator-record'],
    ['/creator-record?step=2#top', '/creator-record?step=2#top'],
    ['/admin/creator-record-v2/uat', '/admin/creator-record-v2/uat'],
    ['/a%20b', '/a%20b'],
    ['/a/../creator-record', '/creator-record'],
  ])('keeps the internal path %s', (raw, expected) => {
    expect(safeRedirectPath(raw)).toBe(expected)
  })

  test.each([
    ['protocol-relative', '//evil.example'],
    ['protocol-relative with path', '//evil.example/creator-record'],
    ['three slashes', '///evil.example'],
    ['backslash after slash', '/\\evil.example'],
    ['backslash variant', '/\\/evil.example'],
    ['backslash in path', '/creator-record\\..\\x'],
    ['dot segment collapsing to protocol-relative', '/.//evil.example'],
    ['parent segment collapsing to protocol-relative', '/a/..//evil.example'],
    ['encoded dot segment', '/%2e//evil.example'],
    ['encoded slash', '/%2F%2Fevil.example'],
    ['encoded slash, lower case', '/%2f%2fevil.example'],
    ['encoded backslash', '/%5Cevil.example'],
    ['encoded backslash, lower case', '/%5cevil.example'],
    ['double-encoded is kept on-origin, not decoded twice', null],
    ['absolute https', 'https://evil.example'],
    ['absolute http', 'http://evil.example/'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/html,x'],
    ['scheme-like after slash', '/https://evil.example'],
    ['no leading slash', 'dashboard'],
    ['tab injection', '/\t/evil.example'],
    ['newline injection', '/\n/evil.example'],
    ['encoded newline', '/%0A/evil.example'],
    ['NUL', '/\u0000evil'],
    ['malformed encoding', '/%E0%A4%A'],
    ['empty', ''],
    ['too long', '/' + 'a'.repeat(2048)],
  ])('rejects %s', (label, raw) => {
    if (raw === null) {
      // "/%252F%252Fevil" decodes once to "/%2F%2Fevil": still a same-origin path, returned as given (never resolved off-site).
      expect(safeRedirectPath('/%252F%252Fevil.example')).toBe('/%252F%252Fevil.example')
      return
    }
    const out = safeRedirectPath(raw)
    if (label === 'scheme-like after slash') {
      // "/https://evil.example" is a same-origin path, not a redirect elsewhere.
      expect(out).toBe('/https://evil.example')
      return
    }
    expect(out).toBe('/dashboard')
  })

  test('non-strings and a custom fallback', () => {
    for (const v of [undefined, null, 42, {}, ['/dashboard']]) expect(safeRedirectPath(v)).toBe('/dashboard')
    expect(safeRedirectPath('//evil.example', '/')).toBe('/')
  })

  test('never returns anything with a scheme, host or leading "//"', () => {
    const inputs = ['//a', '/\\a', '/%2f%2fa', 'https://a', '/ok', '/x?y=//z', '/#//a', '/.//a']
    for (const i of inputs) {
      const out = safeRedirectPath(i)
      expect(out.startsWith('/')).toBe(true)
      expect(out.startsWith('//')).toBe(false)
      expect(new URL(out, 'https://app.test').origin).toBe('https://app.test')
    }
  })
})

describe('/auth/callback and /auth/login use the validator', () => {
  const location = async (next: string) => (await GET({ url: `https://app.test/auth/callback?next=${encodeURIComponent(next)}` } as never)).headers.get('location')

  test('off-site and bypass attempts land on the dashboard; internal paths are kept', async () => {
    for (const bad of ['//evil.example', '/\\evil.example', '/%2F%2Fevil.example', 'https://evil.example', '/%5Cevil.example']) {
      expect(await location(bad)).toBe('https://app.test/dashboard')
    }
    expect(await location('/creator-record')).toBe('https://app.test/creator-record')
    expect(await location('/creator-record?step=2')).toBe('https://app.test/creator-record?step=2')
  })

  test('both entry points call safeRedirectPath and no longer use a bare startsWith check', () => {
    for (const f of ['app/auth/callback/route.ts', 'app/auth/login/page.tsx']) {
      const s = readFileSync(path.join(APP, f), 'utf8')
      expect(s).toContain('safeRedirectPath(')
      expect(s).not.toMatch(/startsWith\('\/'\)\s*\?/)
    }
  })
})
