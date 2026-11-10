/**
 * CR-V2-MVP-LEGAL-CONTENT-6 — the published content is exactly the founder-approved, frozen CR-V2-MVP-LEGAL-CONTENT-5 set
 * (approval JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109).
 *
 * The digests below are those recorded in the frozen approval packet. Each is recomputed here from the code, in the packet's own
 * canonical form, so any change to approved wording, legal text or consent wording fails this test until a new approval is
 * recorded. The packet itself is not in the repository; these digests identify it.
 */
import { createHash } from 'node:crypto'
import { PRIVACY_NOTICE, TERMS_OF_SERVICE } from '@/lib/legal/policies'
import * as Governed from '@/lib/creator-record/governed/sources'
import { CUSTOMER_WORDING_SOURCES, customerWordingIdentity } from '@/lib/creator-record-flow/customer-wording'
import { EXAM_LIVE_TEXT, EXAM_TEXT } from '@/lib/creator-record-flow/examination-ui'
import { AI_EXAMINATION_PERMISSION_APPROVED_WORDING, EVIDENCE_CONSENT_APPROVED_WORDING } from '@/lib/creator-record/evidence-intake/contract'

const REF = 'JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109'
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

/** The packet's JSON form: sorted keys, two-space indent, UTF-8, trailing newline (Python json.dumps(..., sort_keys=True)). */
function packetJson(v: unknown): string {
  const sort = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(sort) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, sort((x as Record<string, unknown>)[k])])) : x
  // Python's json.dumps with indent=2 uses ', ' / ': ' separators and the same escaping as JSON.stringify for these strings.
  return JSON.stringify(sort(v), null, 2) + '\n'
}

describe('the published legal documents are the approved text', () => {
  test.each([
    ['Privacy Notice', PRIVACY_NOTICE, 'privacy-2026-11-09', 'Creator Record Privacy Notice', '5d1da758c484c1710b8f03fb84ed267b1f8589bf78c7f85484fb8eb3788e063e', 42],
    ['Terms of Service', TERMS_OF_SERVICE, 'terms-2026-11-09', 'Creator Record Terms of Service', 'aad8575ff4b5db9c38355fbb1caa6650360944dd2dd76c0727a236e922a91c31', 31],
  ])('%s: version, date, approval and every paragraph', (_, doc, version, title, paragraphsSha, count) => {
    expect(doc).not.toBeNull()
    expect(doc!).toMatchObject({ version, effective_date: '2026-11-09', approval_reference: REF, title })
    expect(doc!.paragraphs).toHaveLength(count)
    expect(sha(doc!.paragraphs.join('\n\n'))).toBe(paragraphsSha)
    expect(doc!.paragraphs.join('\n')).not.toMatch(/\[(CONFIRM|VERIFY|FOUNDER|PENDING)|PUBLICATION GATE/)
  })
})

describe('the governed content is the approved R2-R5 wording', () => {
  test('R2 question wording (text, help, option labels) equals the packet', () => {
    const versions = new Map(Governed.CREATOR_RECORD_REGISTRY_INPUT.questions.map((q) => [q.q_id, q.version]))
    const questions = Object.fromEntries(Object.entries(Governed.CREATOR_RECORD_PRESENTATION).map(([id, p]) => [id, { help: p.help, option_labels: p.option_labels, q_version: versions.get(id), text: p.text }]))
    expect(sha(packetJson({ item: 'R2 question wording, help and option labels', questions }))).toBe('25aa8fc0a21624dcaa00c32f3d8ccbbb896b7f5d61791a1563913fbc3c256fed')
  })
  test('R3 acknowledgements A1 and A2, with the Terms and Privacy agreement', () => {
    expect(sha(packetJson({ item: 'R3 acknowledgements A1 and A2', acknowledgements: Governed.CREATOR_RECORD_ACKNOWLEDGEMENTS }))).toBe('d978e6158fe62fd975de37fb6f93b8ea568d1c11d7cce81cd4abb2bfdb284362')
    expect(Governed.CREATOR_RECORD_ACKNOWLEDGEMENTS.A2).toMatch(/I agree to the Creator Record Terms of Service and acknowledge that I have read the Privacy Notice\.$/)
  })
  test('R4 dependency labels and R5 caveats', () => {
    expect(sha(packetJson({ item: 'R4 launch dependency labels', dependency_labels: Governed.CREATOR_RECORD_DEPENDENCY_LABELS }))).toBe('5ec6e19c9c756f421b10507138a8ff77de3c9d18f3bd91bf50e8ef4cfb808525')
    expect(sha(packetJson({ item: 'R5 caveats', caveats: Governed.CREATOR_RECORD_CAVEATS }))).toBe('fe4538761172a56293f02eaad552de63c60821626dc7dc01365f9e37a44ab7b9')
  })
  test('every launch question carries the founder approval; no ledger entry is published', () => {
    for (const q of Governed.CREATOR_RECORD_REGISTRY_INPUT.questions) expect(q.approval).toMatchObject({ status: 'approved', review_ref: REF, decision_date: '2026-11-09' })
    expect(Governed.CREATOR_RECORD_PUBLICATION_LEDGER).toEqual([])
  })
})

describe('R6 consent and AI permission, and the R11 customer wording set', () => {
  test('R6: the approved identifiers and labels, each naming the current customer wording identity', () => {
    const r6 = {
      item: 'R6 storage consent and AI-examination permission',
      storage_consent: { approved_wording_id: EVIDENCE_CONSENT_APPROVED_WORDING!.id, label: EXAM_LIVE_TEXT.consent_label },
      ai_examination_permission: { approved_wording_id: AI_EXAMINATION_PERMISSION_APPROVED_WORDING!.id, label: EXAM_TEXT.ai_permission_label },
      binding: '<approved_wording_id>__<privacy version>__<terms version>; each slot also names the customer wording identity computed from R11',
    }
    expect(sha(packetJson(r6))).toBe('dd4ee378b2f85efd96c3a05b70302c76925ee4a748bf84b55166527cb26041c4')
    const identity = customerWordingIdentity().sha256
    expect([EVIDENCE_CONSENT_APPROVED_WORDING!.customer_wording_sha256, AI_EXAMINATION_PERMISSION_APPROVED_WORDING!.customer_wording_sha256]).toEqual([identity, identity])
    expect(identity).toBe('be6e06e826cff62c0d3b8838c10d73464c78f6b5c719a4cde75822ac031a01ec')
  })
  test('R11: the app renders the approved 452-string customer wording set (45 replacements, 407 unchanged)', () => {
    const flat: string[] = []
    const walk = (v: unknown) => {
      if (typeof v === 'string' || typeof v === 'function') flat.push(String(typeof v))
      else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x)
    }
    walk(CUSTOMER_WORDING_SOURCES)
    expect(flat).toHaveLength(452)
  })
})
