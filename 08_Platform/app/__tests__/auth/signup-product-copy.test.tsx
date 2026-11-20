/**
 * SI8-SIGNUP-COPY-1 — the sign-up page's founder-approved product copy (server-rendered markup; the repo has no DOM
 * test environment). Asserts the approved wording verbatim, both product names and prices, the removal of the retired
 * claims from active sign-up copy, and that the page's destination handling and sign-up call are unchanged.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { renderToStaticMarkup } from 'react-dom/server'
import { SignupProductContext, SIGNUP_COPY } from '@/components/auth/SignupProductContext'

const ROOT = join(__dirname, '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')
const PAGE = 'app/auth/signup/page.tsx'
const COMPONENT = 'components/auth/SignupProductContext.tsx'

const APPROVED_CREATOR_RECORD_BULLETS = [
  'Document your AI video production',
  'Add supporting evidence',
  'Receive your PDF automatically',
]
const APPROVED_ASSESSMENT_BULLETS = [
  'SI8 reviews your production and evidence',
  'Receive findings and evidence gaps',
  'Identify commercial-use risks and unresolved issues',
]

const RETIRED_PHRASES = [
  'Chain of Title',
  'SI8 Certified',
  'SI8 VERIFIED',
  'COMMERCIAL AUDIT PASSED',
  'Accepted by brand legal',
  'accepted by brand legal',
  'E&O',
  'E&amp;O',
  'underwriter',
  '$5K',
  'Unlocks',
  'unlock',
  'Rights Verified',
  'Pre-Commercial Record',
  'turnaround',
  'Instant automated delivery',
]

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')

describe('approved copy (verbatim)', () => {
  test('the six approved bullets and two disclaimers are unchanged', () => {
    expect([...SIGNUP_COPY.creatorRecord.bullets]).toEqual(APPROVED_CREATOR_RECORD_BULLETS)
    expect([...SIGNUP_COPY.assessment.bullets]).toEqual(APPROVED_ASSESSMENT_BULLETS)
    expect(SIGNUP_COPY.creatorRecord.disclaimer).toBe('Not human-reviewed or commercial clearance.')
    expect(SIGNUP_COPY.assessment.disclaimer).toBe('Not legal advice or guaranteed clearance.')
    expect(SIGNUP_COPY.heading).toBe('What can you do with SI8?')
    expect(SIGNUP_COPY.subtitle.generic).toBe('Create your SI8 account to get started.')
    expect(SIGNUP_COPY.subtitle.certify).toBe("You'll be taken to the Commercial Assurance Assessment form after signing up.")
  })

  test('product names, labels and prices', () => {
    expect(SIGNUP_COPY.creatorRecord).toMatchObject({ name: 'Creator Record', price: '$29', label: 'Automated' })
    expect(SIGNUP_COPY.assessment).toMatchObject({ name: 'Commercial Assurance Assessment', price: '$499', label: 'Human-reviewed' })
  })
})

describe('rendered product context', () => {
  test.each(['', '/creator-record', '/dashboard'])('destination %p shows the two-product comparison', (nextPath) => {
    const t = text(renderToStaticMarkup(<SignupProductContext nextPath={nextPath} />))
    expect(t).toContain('What can you do with SI8?')
    expect(t).toContain('Creator Record — $29')
    expect(t).toContain('Commercial Assurance Assessment — $499')
    expect(t).toContain('Automated')
    expect(t).toContain('Human-reviewed')
    for (const b of [...APPROVED_CREATOR_RECORD_BULLETS, ...APPROVED_ASSESSMENT_BULLETS]) expect(t).toContain(`✓ ${b}`)
    expect(t).toContain('Not human-reviewed or commercial clearance.')
    expect(t).toContain('Not legal advice or guaranteed clearance.')
  })

  test('destination /certify shows only the Commercial Assurance Assessment', () => {
    const t = text(renderToStaticMarkup(<SignupProductContext nextPath="/certify" />))
    expect(t).toContain('Commercial Assurance Assessment — $499')
    expect(t).toContain('Human-reviewed')
    for (const b of APPROVED_ASSESSMENT_BULLETS) expect(t).toContain(`✓ ${b}`)
    expect(t).toContain('Not legal advice or guaranteed clearance.')
    expect(t).not.toContain('Creator Record')
    expect(t).not.toContain('What can you do with SI8?')
  })

  test.each(['', '/creator-record', '/certify'])('no retired claim is rendered for destination %p', (nextPath) => {
    const html = renderToStaticMarkup(<SignupProductContext nextPath={nextPath} />)
    for (const phrase of RETIRED_PHRASES) expect(html).not.toContain(phrase)
  })
})

describe('active sign-up page source', () => {
  test('no retired claim remains in the page or the component', () => {
    for (const file of [PAGE, COMPONENT]) {
      // The component's header comment names the retired claims it guards against; only rendered copy matters there.
      const src = file === COMPONENT ? read(file).replace(/\/\*\*[\s\S]*?\*\//, '') : read(file)
      for (const phrase of RETIRED_PHRASES) expect(src).not.toContain(phrase)
    }
  })

  test('the obsolete /record presentation branch is gone and the v1 redirect is unchanged', () => {
    const src = read(PAGE)
    expect(src).not.toContain('function ProductContext')
    expect(src).not.toContain("nextPath === '/record'")
    expect(src).toContain("setNextPath(next === '/record' && CREATOR_RECORD_V1_NEW_SALES !== 'open' ? '/creator-record' : next)")
    expect(src).toContain('<SignupProductContext nextPath={nextPath} />')
  })

  test('sign-up call, callback routing, Turnstile and the Sign Up button are unchanged', () => {
    const src = read(PAGE)
    expect(src).toContain('await supabase.auth.signUp({')
    expect(src).toContain('emailRedirectTo: callbackUrl,')
    expect(src).toContain('captchaToken: captchaToken ?? undefined,')
    expect(src).toContain('`${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`')
    expect(src).toContain('<Turnstile')
    expect(src).toContain("{isSubmitting ? 'Creating account...' : 'Sign Up'}")
  })
})
