/**
 * CR-V2-MVP-PROD-PREP-1, corrected by CR-V2-APPROVAL-AUTHORITY-FIX-1 — the customer wording identity is derived from the wording
 * itself; the template fingerprint and the inline-wording guard are the same check every production build runs.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { CUSTOMER_WORDING_SET_ID, CUSTOMER_WORDING_SOURCES, CUSTOMER_WORDING_TEMPLATES_SHA256, customerWordingIdentity } from '@/lib/creator-record-flow/customer-wording'
import { V2_CHECKOUT_COPY, V2_READY_EMAIL } from '@/lib/creator-record-flow/wording'
import { T } from '@/lib/creator-record/presentation/templates'
import { SOURCE_TEXT_CATEGORIES, sourceTextContent } from '@/lib/creator-record/customer-record/source-text'
import { approvedCustomerRecordInputs } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY } from '@/lib/creator-record/governed/sources'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const check = require('../../scripts/customer-wording-check.js') as {
  GUARDED: { file: string }[]
  checkCustomerWording(appRoot: string): string[]
  inlineWording(source: string): string[]
  templatesSha256(appRoot: string): string
}
const APP = path.resolve(__dirname, '../..')

describe('customer wording identity: derived from the wording itself', () => {
  test('editing any customer string changes the identity at runtime, with no re-pinning step (restored afterwards)', () => {
    const before = customerWordingIdentity()
    const original = V2_CHECKOUT_COPY.description
    try {
      ;(V2_CHECKOUT_COPY as { description: string }).description = 'An unapproved edit.'
      expect(customerWordingIdentity().sha256).not.toBe(before.sha256)
    } finally {
      ;(V2_CHECKOUT_COPY as { description: string }).description = original
    }
    expect(customerWordingIdentity()).toEqual(before)
    expect(before.set_id).toBe(CUSTOMER_WORDING_SET_ID)
  })

  test('a template function is identified by its place in the set; its wording by the pinned templates fingerprint', () => {
    expect(typeof T.basis_plan).toBe('function')
    expect(CUSTOMER_WORDING_TEMPLATES_SHA256).toMatch(/^[0-9a-f]{64}$/)
  })

  test('every entry is wording: a string, a {slot} template, a nested map or a template function; nothing else', () => {
    const walk = (v: unknown, at: string): void => {
      if (typeof v === 'string' || typeof v === 'function') return
      if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${at}[${i}]`))
      if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => walk(x, `${at}.${k}`))
      throw new Error(`${at}: ${typeof v}`)
    }
    walk(CUSTOMER_WORDING_SOURCES, 'sources')
  })

  test('it is a Source Text Approval category, and the approved inputs carry the derived identity, never one from a bundle', () => {
    expect(SOURCE_TEXT_CATEGORIES).toContain('customer_wording')
    const inputs = approvedCustomerRecordInputs(CREATOR_RECORD_GOVERNANCE_AUTHORITY)
    expect(inputs.sources.customer_wording).toEqual(customerWordingIdentity())
    const reg = loadQuestionRegistry(inputs.sources.registry_input)
    if (!reg.ok) throw new Error('registry')
    expect(sourceTextContent(inputs.sources, reg.registry, {}).customer_wording).toEqual(customerWordingIdentity())
  })

  test('the ready email and dashboard chrome are in the set', () => {
    expect([V2_READY_EMAIL.greeting, V2_READY_EMAIL.sign_off, V2_READY_EMAIL.signature]).toEqual(['Hi {name},', 'Best,', 'The SI8 Team'])
  })
})

describe('the production build check (scripts/customer-wording-check.js, run from next.config.js)', () => {
  test('passes on the shipped source: templates match their pin and no guarded surface types its own wording', () => {
    expect(check.templatesSha256(APP)).toBe(CUSTOMER_WORDING_TEMPLATES_SHA256)
    expect(check.checkCustomerWording(APP)).toEqual([])
  })

  test('every production build runs it, whatever command starts the build', () => {
    const config = readFileSync(path.join(APP, 'next.config.js'), 'utf8')
    expect(config).toMatch(/phase === PHASE_PRODUCTION_BUILD/)
    expect(config).toMatch(/require\('\.\/scripts\/customer-wording-check'\)\.checkCustomerWording\(__dirname\)/)
    expect(config).toMatch(/throw new Error/)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nextConfig = require('../../next.config.js') as (phase: string) => unknown
    expect(() => nextConfig('phase-production-build')).not.toThrow()
  })

  test('the guard covers the customer surfaces, including the ready email and the v2 dashboard', () => {
    expect(check.GUARDED.map((g) => g.file)).toEqual(expect.arrayContaining([
      'components/creator-record/CreatorRecordQuestionnaire.tsx', 'app/creator-record/CreatorRecordV2Client.tsx', 'lib/emails.ts',
      'app/dashboard/submissions/[id]/page.tsx', 'app/dashboard/page.tsx',
    ]))
  })

  test('the guard finds inline wording of each kind', () => {
    expect(check.inlineWording('<p>Back to Dashboard</p>')).toEqual(['Back to Dashboard'])
    expect(check.inlineWording('<p>{x}</p><span>Started {d}</span>')).toEqual(['Started'])
    expect(check.inlineWording('<input aria-label="Choose a document" />')).toHaveLength(1)
    expect(check.inlineWording("const a = 'Something went wrong.'")).toHaveLength(1)
    expect(check.inlineWording('<p>{T.title}</p>')).toEqual([])
  })
})
