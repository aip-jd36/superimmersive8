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
    // CR-V2-MVP-RELEASE-AUTHORIZATION-1: founder-approved §4/§5 revision (Pika removed; document-reading separation).
    ['Terms of Service', TERMS_OF_SERVICE, 'terms-2026-11-14', 'Creator Record Terms of Service', 'd54e55bb785b4cecdb6dd2b87febb619d48c747bddc272aceaf169b4ad11a8fb', 31, '2026-11-14', 'JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 terms'],
  ])('%s: version, date, approval and every paragraph', (_, doc, version, title, paragraphsSha, count, date = '2026-11-09', ref = REF) => {
    expect(doc).not.toBeNull()
    expect(doc!).toMatchObject({ version, effective_date: date, approval_reference: ref, title })
    expect(doc!.paragraphs).toHaveLength(count)
    expect(sha(doc!.paragraphs.join('\n\n'))).toBe(paragraphsSha)
    expect(doc!.paragraphs.join('\n')).not.toMatch(/\[(CONFIRM|VERIFY|FOUNDER|PENDING)|PUBLICATION GATE/)
  })
})

describe('the governed content is the approved R2-R5 wording', () => {
  test('R2 question wording (text, help, option labels) equals the packet', () => {
    const versions = new Map(Governed.CREATOR_RECORD_REGISTRY_INPUT.questions.map((q) => [q.q_id, q.version]))
    const questions: Record<string, { help: string | null | undefined; option_labels: Record<string, string>; q_version: number | undefined; text: string }> = Object.fromEntries(Object.entries(Governed.CREATOR_RECORD_PRESENTATION).map(([id, p]) => [id, { help: p.help, option_labels: p.option_labels, q_version: versions.get(id), text: p.text }]))
    // CR-V2-MVP-PROVIDER-SCOPE-2: T1 is now version 3, offering only Higgsfield, Runway and "Not sure", with the founder-approved
    // shortened help text. Restoring exactly the R2 T1 (version 1, every option label, the original help) reproduces the R2
    // packet, so nothing else in the approved wording changed.
    expect(questions.T1.q_version).toBe(3)
    expect(questions.T1.help).toBe('Choose it from the list. You can add up to 3 tools.')
    expect(questions.T1.option_labels).toEqual({ higgsfield: 'Higgsfield', not_sure: 'Not sure', 'runway-gen3': 'Runway' })
    const R2_T1_LABELS = {
      'adobe-firefly': 'Adobe Firefly', elevenlabs: 'ElevenLabs', 'gemini-api': 'Gemini API (developer access)', 'gemini-consumer-app': 'Gemini app (consumer)', 'google-veo': 'Google Veo',
      higgsfield: 'Higgsfield', kling: 'Kling', luma: 'Luma Dream Machine', midjourney: 'Midjourney', not_sure: 'Not sure', 'openai-sora': 'OpenAI Sora', other_tool: 'My tool isn’t listed',
      pika: 'Pika', 'runway-gen3': 'Runway', 'stability-ai': 'Stability AI', suno: 'Suno', synthesia: 'Synthesia',
    }
    const R2_T1_HELP = 'Choose it from the list. If it is not listed, choose “My tool isn’t listed” and type its name. You can add up to 3 tools.'
    const r2 = { ...questions, T1: { ...questions.T1, q_version: 1, help: R2_T1_HELP, option_labels: R2_T1_LABELS } }
    expect(sha(packetJson({ item: 'R2 question wording, help and option labels', questions: r2 }))).toBe('25aa8fc0a21624dcaa00c32f3d8ccbbb896b7f5d61791a1563913fbc3c256fed')
  })
  test('R3 acknowledgements A1 and A2, with the Terms and Privacy agreement', () => {
    expect(sha(packetJson({ item: 'R3 acknowledgements A1 and A2', acknowledgements: Governed.CREATOR_RECORD_ACKNOWLEDGEMENTS }))).toBe('d978e6158fe62fd975de37fb6f93b8ea568d1c11d7cce81cd4abb2bfdb284362')
    expect(Governed.CREATOR_RECORD_ACKNOWLEDGEMENTS.A2).toMatch(/I agree to the Creator Record Terms of Service and acknowledge that I have read the Privacy Notice\.$/)
  })
  test('R4 dependency labels and R5 caveats', () => {
    expect(sha(packetJson({ item: 'R4 launch dependency labels', dependency_labels: Governed.CREATOR_RECORD_DEPENDENCY_LABELS }))).toBe('5ec6e19c9c756f421b10507138a8ff77de3c9d18f3bd91bf50e8ef4cfb808525')
    expect(sha(packetJson({ item: 'R5 caveats', caveats: Governed.CREATOR_RECORD_CAVEATS }))).toBe('fe4538761172a56293f02eaad552de63c60821626dc7dc01365f9e37a44ab7b9')
  })
  test('every launch question carries the founder approval', () => {
    for (const q of Governed.CREATOR_RECORD_REGISTRY_INPUT.questions) {
      // T1 v3 carries the provider-scope-2 decision (CR-V2-MVP-PROVIDER-SCOPE-2); every other question the launch approval.
      const expected = q.q_id === 'T1' ? { review_ref: Governed.CREATOR_RECORD_PROVIDER_SCOPE_2_APPROVAL_REF, decision_date: '2026-11-11' } : { review_ref: REF, decision_date: '2026-11-09' }
      expect(q.approval).toMatchObject({ status: 'approved', ...expected })
    }
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

// CR-V2-MVP-APPROVED-CONTENT-IMPLEMENTATION-1 — R7-R10 and R15 are exactly the frozen CR-V2-MVP-APPROVAL-PACKET-1 content
// (approval JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110; packet manifest 5027f3470a0a8b05fd85501feb1e8787450a04e032afb00c21853bdad6c351b9).
describe('the approved guidance ledger, PDF templates and issuance support', () => {
  const REF2 = 'JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110'
  // CR-V2-MVP-PROVIDER-SCOPE-1 (CR-V2-LAUNCH-LEDGER-3): the three packet entries are kept; the Pika one is superseded by a
  // version 2 withdrawal entry. Without the withdrawal and with Pika's `superseded_by` cleared, the ledger is the packet again.
  const PIKA_V1 = 'CR-V2-LAUNCH-LEDGER-CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1'
  const PIKA_V2 = `${PIKA_V1}-WITHDRAWN-2`
  const packetEntries = () => Governed.CREATOR_RECORD_PUBLICATION_LEDGER.filter((e) => e.entry_id !== PIKA_V2).map((e) => (e.entry_id === PIKA_V1 ? { ...e, superseded_by: null } : e))
  test('R7/R8: the three packet entries are unchanged (approver and decision date recorded at approval)', () => {
    const core = packetEntries().map(({ approver: _a, decision_date: _d, ...rest }) => rest)
    expect(sha(packetJson(core))).toBe('0093152825039253e85314e534bacb259fcf72903d062dd7128cec54873cd28c')
    for (const e of packetEntries()) {
      expect(e).toMatchObject({ approver: 'JD, for PMF Strategy Inc. d/b/a SuperImmersive 8', decision_date: '2026-11-10', refresh_by: '2027-02-10', applicability_policy: 'met_only', creator_record_eligible: 'Yes', superseded_by: null })
    }
  })
  test('the Pika baseline entry is withdrawn by a version 2 entry; Runway and Higgsfield stay current', () => {
    const ledger = Governed.CREATOR_RECORD_PUBLICATION_LEDGER
    expect(ledger).toHaveLength(4)
    expect(ledger.find((e) => e.entry_id === PIKA_V1)?.superseded_by).toBe(PIKA_V2)
    expect(ledger.find((e) => e.entry_id === PIKA_V2)).toEqual({
      entry_id: PIKA_V2, version: 2, claim_id: 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1', claim_last_verified: '2026-09-06', creator_record_eligible: 'No',
      explanation: null, applicability_policy: null, evidence_notes: {}, required_caveats: [], approver: 'JD, for PMF Strategy Inc. d/b/a SuperImmersive 8',
      decision_date: '2026-11-11', refresh_by: null, superseded_by: null,
    })
    const current = ledger.filter((e) => e.superseded_by === null && e.creator_record_eligible === 'Yes').map((e) => e.claim_id).sort()
    expect(current).toEqual(['CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1', 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1'])
  })
  test('the printed guidance set names the approved ledger, never the empty one', () => {
    expect(Governed.CREATOR_RECORD_VERSIONS).toEqual({ registry: 'CR-V2-LAUNCH-REGISTRY-3', ledger: 'CR-V2-LAUNCH-LEDGER-3' })
  })
  test('R9/R10: both template sets carry their approved fingerprints, schemas and references', () => {
    // CR-V2-MVP-APPROVAL-AND-RELEASE-1: v1 and v3 keep their approval record, now superseded; v4 / v5 are registered after them.
    expect(Governed.CREATOR_RECORD_PDF_TEMPLATE_APPROVAL).toMatchObject({ version: 1, fingerprint: 'c5fe2a21ec8a096c6abf7eccf0bd55f3103401e10a26512052e5d2ee15a11c6c', record_schema: { version: 7 }, review_ref: `${REF2} R9`, lifecycle: 'superseded' })
    // CR-V2-MVP-INTEGRATION-4: the schema 8 set is version 3 = the R10 set plus the founder-approved integrated-assessment block.
    const notBlank = expect.stringMatching(/\S/)
    expect(Governed.CREATOR_RECORD_PDF_TEMPLATE_SETS.map((s) => s.approval)).toEqual([
      expect.objectContaining({ version: 3, fingerprint: '287de01d8dc365e4e7c62ab0ea25fdce0b824b26e31367560b85b2f9e779c1b5', record_schema: { id: 'si8/creator-record-v2-record', version: 8 }, review_ref: 'JD-CR-V2-MVP-INTEGRATION-4-20261110', lifecycle: 'superseded' }),
      expect.objectContaining({ version: 4, fingerprint: 'd4ecf3f39487ed43ce6c5e621d988d6525b638c952a8c5ead01e0cc9b8504f7e', record_schema: { id: 'si8/creator-record-v2-record', version: 7 }, lifecycle: 'approved', authority: notBlank, review_ref: notBlank }),
      expect.objectContaining({ version: 5, fingerprint: 'a27e23cdbc1b12c16330b9518bba210b218bb0e8807e53ac164d6673ec873408', record_schema: { id: 'si8/creator-record-v2-record', version: 8 }, lifecycle: 'approved', authority: notBlank, review_ref: notBlank }),
    ])
    expect(sha(JSON.stringify(sortDeep(Governed.CREATOR_RECORD_PDF_TEMPLATES)))).toBe('c5fe2a21ec8a096c6abf7eccf0bd55f3103401e10a26512052e5d2ee15a11c6c')
    expect(sha(JSON.stringify(sortDeep(Governed.CREATOR_RECORD_PDF_TEMPLATE_SETS[0].templates)))).toBe('287de01d8dc365e4e7c62ab0ea25fdce0b824b26e31367560b85b2f9e779c1b5')
    // Removing the block and restoring the set's own version reproduces the R10 approval exactly: nothing else in the set changed.
    const { integrated_assessment: _block, ...r10 } = Governed.CREATOR_RECORD_PDF_TEMPLATE_SETS[0].templates as Record<string, unknown>
    expect(r10.version).toBe(3)
    expect(sha(JSON.stringify(sortDeep({ ...r10, version: 2 })))).toBe('a26f10643cfa838541fc4cf5ffd11e4d80cb90d2241610e8bbb7530c320a7346')
  })
})

function sortDeep(x: unknown): unknown {
  return Array.isArray(x) ? x.map(sortDeep) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, sortDeep((x as Record<string, unknown>)[k])])) : x
}
