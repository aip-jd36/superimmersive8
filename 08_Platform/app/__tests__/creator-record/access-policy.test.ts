/**
 * CR-PUBLIC-1 — the Creator Record v2 access policy (`lib/creator-record-flow/access-policy.ts`).
 *
 * The default and committed state is 'invitation' (Production today). 'public' is reachable only by changing a reviewed code
 * constant; nothing a client sends can select it. Every production port binds the one policy check, and nothing else decides
 * access. Simulated public-mode behaviour of each service is tested beside its invitation tests (customer-flow, customer-purchase,
 * evidence-intake, customer-examination).
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'

const invited = new Set(['11111111-1111-4111-8111-111111111111'])
const lookups: string[] = []
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, userId: string) => ({
          maybeSingle: async () => {
            lookups.push(`${table}:${userId}`)
            return { data: invited.has(userId) ? { user_id: userId } : null, error: null }
          },
        }),
      }),
    }),
  },
}))

import {
  CREATOR_RECORD_V2_ACCESS, createCreatorRecordAccessCheck, creatorRecordAccessMode, resolveCreatorRecordAccessMode,
} from '@/lib/creator-record-flow/access-policy'
import { hasCreatorRecordAccess, PILOT_ACCESS_TABLE } from '@/lib/creator-record-flow/pilot-access'

const APP = path.join(__dirname, '..', '..')
const src = (p: string) => readFileSync(path.join(APP, p), 'utf8').replace(/\r\n/g, '\n')
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const full = path.join(dir, n)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })

beforeEach(() => { lookups.length = 0 })

describe('mode resolution (fail closed)', () => {
  test('only exactly "public" is public; anything else is invitation', () => {
    expect(resolveCreatorRecordAccessMode('public')).toBe('public')
    for (const v of [undefined, null, '', 'invitation', 'PUBLIC', 'Public', ' public', 'public ', 'open', 'true', true, 1, {}, ['public']]) {
      expect(resolveCreatorRecordAccessMode(v)).toBe('invitation')
    }
  })

  test('the committed switch is invitation-only (Production today)', () => {
    expect(CREATOR_RECORD_V2_ACCESS).toBe('invitation')
    expect(creatorRecordAccessMode()).toBe('invitation')
    expect(src('lib/creator-record-flow/access-policy.ts')).toMatch(/export const CREATOR_RECORD_V2_ACCESS: string = 'invitation'\n/)
  })

  test('the switch is a code constant: no environment variable, request, cookie or client input can select it', () => {
    const s = src('lib/creator-record-flow/access-policy.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(s).not.toMatch(/process\.env|NEXT_PUBLIC|searchParams|headers|cookies|request|localStorage/)
  })
})

describe('the access check', () => {
  test('invitation mode asks the invitation list and admits only invited users', async () => {
    const isInvited = jest.fn(async (u: string) => u === 'invited-user')
    const check = createCreatorRecordAccessCheck('invitation', isInvited)
    expect(await check('invited-user')).toBe(true)
    expect(await check('someone-else')).toBe(false)
    expect(isInvited).toHaveBeenCalledTimes(2)
  })

  test('public mode admits any signed-in user without reading the list', async () => {
    const isInvited = jest.fn(async () => false)
    const check = createCreatorRecordAccessCheck('public', isInvited)
    expect(await check('anyone')).toBe(true)
    expect(isInvited).not.toHaveBeenCalled()
  })

  test('a missing user id is never eligible, in either mode', async () => {
    for (const mode of ['invitation', 'public'] as const) {
      const check = createCreatorRecordAccessCheck(mode, async () => true)
      for (const u of ['', undefined, null]) expect(await check(u as unknown as string)).toBe(false)
    }
  })

  test('the production check, in the default state, reads the invitation table', async () => {
    expect(await hasCreatorRecordAccess('11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(await hasCreatorRecordAccess('22222222-2222-4222-8222-222222222222')).toBe(false)
    expect(lookups).toEqual([`${PILOT_ACCESS_TABLE}:11111111-1111-4111-8111-111111111111`, `${PILOT_ACCESS_TABLE}:22222222-2222-4222-8222-222222222222`])
  })
})

describe('enforcement points: one policy, no bypass', () => {
  const PORT_FILES = ['lib/creator-record-flow/production.ts', 'lib/creator-record-flow/evidence-production.ts', 'lib/creator-record-flow/examination-customer.ts']

  test('every production port binds the policy check, never the bare invitation lookup', () => {
    const bindings = PORT_FILES.flatMap((f) => (src(f).match(/^\s+hasPilotAccess[:,].*$/gm) ?? []).map((l) => `${f}: ${l.trim()}`))
    expect(bindings).toHaveLength(4) // productionFlowDeps, productionPurchaseDeps, evidence intake, customer examination
    for (const b of bindings) expect(b).toMatch(/hasPilotAccess: hasCreatorRecordAccess,/)
  })

  test('the four services gate on that one port; the page uses the flow deps', () => {
    for (const f of ['lib/creator-record/customer-flow/service.ts', 'lib/creator-record/customer-flow/purchase.ts', 'lib/creator-record/evidence-intake/service.ts', 'lib/creator-record/customer-flow/examination.ts']) {
      expect({ f, n: (src(f).match(/await deps\.hasPilotAccess\(userId\)/g) ?? []).length }).toEqual({ f, n: 1 })
    }
    expect(src('app/creator-record/page.tsx')).toMatch(/const deps = productionFlowDeps\(\)[\s\S]*await deps\.hasPilotAccess\(userId\)/)
  })

  test('no route, page or component reads the invitation table or the policy directly', () => {
    const files = ['app', 'components'].flatMap((d) => walk(path.join(APP, d))).filter((f) => /\.(tsx?)$/.test(f))
    const direct = files.filter((f) => /pilot-access|access-policy|creator_record_v2_pilot_access/.test(readFileSync(f, 'utf8')))
    expect(direct.map((f) => path.relative(APP, f))).toEqual([])
  })

  test('payment fulfilment, issuance and downloads do not consult invitation or access policy', () => {
    for (const f of ['app/api/webhooks/stripe/route.ts', 'app/api/creator-record/[id]/pdf/route.ts', 'app/api/checkout/create-session/route.ts']) {
      expect({ f, hit: /hasCreatorRecordAccess|access-policy|pilot-access/.test(src(f)) }).toEqual({ f, hit: false })
    }
  })
})
