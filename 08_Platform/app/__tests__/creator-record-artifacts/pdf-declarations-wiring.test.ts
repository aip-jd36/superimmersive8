/**
 * CR-PDF-DECLARATIONS-1 — the recorded declaration flags reach the renderer on every
 * issuance path that loads a submission itself: payment fulfilment (load → legacy
 * generator) and the legacy generator → CreatorRecordPDF.
 */

const captured: { selects: string[]; rendered: Array<Record<string, unknown>>; generated: Array<Record<string, unknown>> } = {
  selects: [], rendered: [], generated: [],
}

jest.mock('@react-pdf/renderer', () => ({
  Document: 'DOCUMENT', Page: 'PAGE', Text: 'TEXT', View: 'VIEW', Image: 'IMAGE', Link: 'LINK',
  StyleSheet: { create: (s: unknown) => s },
  Font: { register: () => undefined },
  renderToStream: async (element: { props: { data: Record<string, unknown> } }) => {
    captured.rendered.push(element.props.data)
    return (async function* () { yield Buffer.from('%PDF-1.4 test') })()
  },
}))

jest.mock('@/lib/supabase/admin', () => {
  const builder = (row: unknown) => {
    const b: Record<string, unknown> = {}
    b.select = (cols: string) => { captured.selects.push(cols); return b }
    b.eq = () => b
    b.maybeSingle = async () => ({ data: row, error: null })
    b.upsert = async () => ({ error: null })
    return b
  }
  return {
    supabaseAdmin: {
      from: () => builder({ id: 'sub-1', custodian_declaration: true, indemnification_confirmed: false }),
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'https://example.invalid/x.pdf' } }),
        }),
      },
    },
  }
})

jest.mock('@/lib/emails', () => ({})) // not exercised; avoids constructing the email client

import { generateCreatorRecordPDF } from '@/lib/pdf/generateChainOfTitle'
import { loadFulfillmentSubmission, type FulfillmentSubmission } from '@/lib/payments/repository'

beforeEach(() => {
  captured.selects = []
  captured.rendered = []
  captured.generated = []
})

const PARAMS = {
  submissionId: '3f2a9c10-0000-4000-8000-000000000001', filmmakerName: 'F', title: 'T', tools: [],
  likenessConfirmation: {}, ipConfirmation: {}, territory: 'Global',
}

describe('legacy generator → renderer', () => {
  test.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
    [null, undefined],
  ])('custodian=%p indemnification=%p reach CreatorRecordPDF unchanged', async (c, i) => {
    await generateCreatorRecordPDF({ ...PARAMS, custodianDeclaration: c, indemnificationConfirmed: i })
    expect(captured.rendered).toHaveLength(1)
    expect(captured.rendered[0].custodianDeclaration).toBe(c)
    expect(captured.rendered[0].indemnificationConfirmed).toBe(i)
  })
})

describe('payment fulfilment', () => {
  test('loads both declaration columns from the submission', async () => {
    const sub = await loadFulfillmentSubmission('sub-1')
    expect(captured.selects[0]).toMatch(/\bcustodian_declaration\b/)
    expect(captured.selects[0]).toMatch(/\bindemnification_confirmed\b/)
    expect(sub).toEqual(expect.objectContaining({ custodian_declaration: true, indemnification_confirmed: false }))
  })

  test('the legacy fulfilment generator passes the loaded flags to the renderer', async () => {
    const { generateFromSubmission } = await import('@/lib/payments/fulfillment-deps')
    const sub: FulfillmentSubmission = {
      id: '3f2a9c10-0000-4000-8000-000000000001', user_id: 'u', tier: 'creator_record', status: 'approved', title: 'T', filmmaker_name: 'F',
      tools_used: '[]', authorship_statement: null, likeness_confirmation: '{}', ip_confirmation: '{}', territory_preferences: 'Global',
      custodian_declaration: false, indemnification_confirmed: true,
    }
    await generateFromSubmission(sub)
    expect(captured.rendered).toHaveLength(1)
    expect(captured.rendered[0].custodianDeclaration).toBe(false)
    expect(captured.rendered[0].indemnificationConfirmed).toBe(true)
  })
})
