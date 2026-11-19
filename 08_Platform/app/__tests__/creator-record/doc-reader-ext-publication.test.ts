/**
 * CR-DOC-READER-EXT-6E — the four Creator Record claims as published (D1-D4, founder approval JD-CR-DOC-READER-EXT-6E-20261119),
 * through the REAL Production inputs: the governance bundle, its approved Source Text, and the PDF template set Production selects.
 *
 *   - selected only from their own question (music from M1, stock from M3), with or without documents;
 *   - conclusion capped by the open dependencies (requirements_met), dependencies listed with their approved labels;
 *   - the stock Editorial-designation and separate-authorisation points stay evidence-only (no declaration resolves them);
 *   - a document note is not printed without a relevant document (the explanation and open point are);
 *   - licence reading stays off and v8 pending; nothing else in the ledger changed.
 */
import { approvedCustomerRecordInputs, approvedPdfTemplates, LICENCE_READING_SWITCH, licenceReadingEnabled } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, documentText } from '@/lib/creator-record/customer-pdf/document-model'
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_PUBLICATION_LEDGER } from '@/lib/creator-record/governed/sources'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const AS_OF = '2026-11-19'
const ARTLIST = 'CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1'
const EPIDEMIC = 'CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1'
const STOCK = 'CLAIM-STOCK-EDITORIAL-001-v2'
const POND5 = 'CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1'
const inputs = approvedCustomerRecordInputs(GOV)
const BASE = { P1: ['Publication test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], H1: ['edited'] }
const RUNWAY = { T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }

function record(materials: Record<string, string[]>) {
  const r = buildCustomerRecord({
    state: { answers: { ...BASE, ...materials }, tools: [RUNWAY], acknowledgements: { A1: true, A2: true } } as never,
    sources: inputs.sources as never, source_text: inputs.source_text as never, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF,
    record: { record_id: 'PREP-publication-test', record_version: 1, captured_at: `${AS_OF}T00:00:00.000Z` },
  })
  if (!r.ok) throw new Error(JSON.stringify(r).slice(0, 600))
  return r
}
const claims = (r: ReturnType<typeof record>) => r.record.guidance.items.map((i) => i.claim_id).sort()
const item = (r: ReturnType<typeof record>, id: string) => r.record.guidance.items.find((i) => i.claim_id === id)!
const pdf = (r: ReturnType<typeof record>) => {
  const t = approvedPdfTemplates(GOV, { id: CUSTOMER_RECORD_SCHEMA, version: r.record.schema_version })
  return documentText(buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: { record_id: 'CR-2026-0000E6E1', issued_on: AS_OF }, templates: t.templates, template_approval: t.approval! })).join('\n')
}
const published = (id: string) => CREATOR_RECORD_PUBLICATION_LEDGER.find((e) => e.claim_id === id && e.superseded_by === null)!

describe('published from their own question, with or without documents', () => {
  test('music (M1): Artlist and Epidemic Sound each select their claim; no stock claim', () => {
    expect(claims(record({ M0: ['music'], M1: ['artlist'], M2: ['no'] }))).toEqual(expect.arrayContaining([ARTLIST]))
    expect(claims(record({ M0: ['music'], M1: ['epidemic-sound'], M2: ['no'] }))).toEqual(expect.arrayContaining([EPIDEMIC]))
    for (const p of ['artlist', 'epidemic-sound']) expect(claims(record({ M0: ['music'], M1: [p], M2: ['no'] }))).not.toEqual(expect.arrayContaining([STOCK]))
  })
  test('stock (M3): Getty, iStock, Shutterstock and Adobe Stock select Stock Editorial; Pond5 selects the Pond5 claim; no music claim', () => {
    for (const p of ['getty', 'istock', 'shutterstock', 'adobe-stock']) {
      const c = claims(record({ M0: ['stock'], M3: [p], M3D: ['no'] }))
      expect(c).toContain(STOCK)
      expect(c).not.toContain(ARTLIST)
    }
    expect(claims(record({ M0: ['stock'], M3: ['pond5'], M3D: ['no'] }))).toContain(POND5)
  })
  test('the conclusion is capped by the open dependencies and every dependency carries its approved label', () => {
    const music = item(record({ M0: ['music'], M1: ['artlist'], M2: ['no'] }), ARTLIST)
    expect(music.conclusion).not.toBe(item(record({ M0: ['none'] }), 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1').conclusion)
    expect(music.dependency_rows.map((d) => [d.dependency_id, d.label])).toEqual(expect.arrayContaining([['artlist_license_type_confirmed', 'Which Artlist licence applies']]))
    const stock = item(record({ M0: ['stock'], M3: ['shutterstock'], M3D: ['yes'] }), STOCK)
    const rows = Object.fromEntries(stock.dependency_rows.map((d) => [d.dependency_id, d]))
    expect(rows.editorial_designation_confirmed.label).toBe('Whether the asset is marked Editorial')
    expect(rows.separate_authorization_obtained.label).toBe('Whether separate written authorisation was obtained')
  })
  test('Editorial designation and separate authorisation stay evidence-only: no declaration resolves them', () => {
    for (const [p, id] of [['shutterstock', STOCK], ['pond5', POND5]] as const) {
      const rows = Object.fromEntries(item(record({ M0: ['stock'], M3: [p], M3D: ['yes'] }), id).dependency_rows.map((d) => [d.dependency_id, d]))
      for (const dep of ['editorial_designation_confirmed', 'separate_authorization_obtained']) expect(rows[dep].declarations).toEqual([])
    }
  })
})

describe('the PDF Production selects (no documents)', () => {
  test('prints the explanation and the open point, never a document note', () => {
    const r = record({ M0: ['music'], M1: ['artlist'], M2: ['no'] })
    expect(r.record.documents.items).toEqual([])
    const t = pdf(r)
    expect(t).toContain(published(ARTLIST).explanation as string)
    expect(t).toContain('Which Artlist licence applies')
    expect(t).not.toContain('A document you added may show')
  })
  test('stock and Pond5 likewise', () => {
    for (const [p, id] of [['shutterstock', STOCK], ['pond5', POND5]] as const) {
      const t = pdf(record({ M0: ['stock'], M3: [p], M3D: ['no'] }))
      expect(t).toContain(published(id).explanation as string)
      expect(t).not.toContain('A document you added may show')
    }
  })
})

describe('nothing else is activated', () => {
  test('licence reading off; schema 8 still selects v7 and schema 7 v6; v8 pending', () => {
    expect(LICENCE_READING_SWITCH).toBe('off')
    expect(licenceReadingEnabled()).toBe(false)
    expect(approvedPdfTemplates(GOV, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).approval?.version).toBe(7)
    expect(approvedPdfTemplates(GOV, { id: CUSTOMER_RECORD_SCHEMA, version: 7 }).approval?.version).toBe(6)
    expect(GOV.pdf_template_sets?.find((s) => s.approval.version === 8)?.approval.lifecycle).toBe('pending')
  })
  test('the earlier entries are unchanged and Runway guidance is identical with and without the music answer', () => {
    const r1 = item(record({ M0: ['none'] }), 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1')
    const r2 = item(record({ M0: ['music'], M1: ['artlist'], M2: ['no'] }), 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1')
    expect(r2.conclusion).toBe(r1.conclusion)
    expect(r2.dependency_rows).toEqual(r1.dependency_rows)
  })
})
