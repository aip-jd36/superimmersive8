/**
 * CR-DOC-READER-EXT-1 (B) — licence/permission examination profile (inactive) and category-based profile selection.
 * Replay and mock only: recorded outputs stand in for model responses; no model, network or database.
 */
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { CATEGORY_PROFILES, profileForCategory } from '@/lib/creator-record/examination/category-profile'
import { LICENCE_PROFILE_INACTIVE, LICENCE_PROFILE_OUTPUT_FINGERPRINTS, LICENCE_PROFILE_VERSION, LICENCE_READING_CONTRACT } from '@/lib/creator-record/examination/licence-profile'
import { buildProfileRegistry, profileOutputCanonical, type ProfileFingerprintCase } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { LIVE_PROFILE_REGISTRY } from '@/lib/creator-record/live-examination/examine'
import { LICENCE_SYSTEM_PROMPT } from '@/lib/creator-record/licence-examination/prompt'
import { containsContactDetails, LICENCE_FIELD_NAMES, validateLicenceExtraction } from '@/lib/creator-record/licence-examination/schema'
import { examineWithContract, type ReceiptModelCaller } from '@/lib/creator-record/receipt-examination/examine'
import { EVIDENCE_CATEGORIES } from '@/lib/creator-record/evidence-intake/vocabulary'
import { EXAMINATION_LIMITATIONS } from '@/lib/creator-record/examination/envelope'
import { readFileSync } from 'node:fs'
import { CURRENT_ISSUANCE_SUPPORT, issuanceSupportFor } from '@/lib/creator-record/customer-record/governance-state'
import path from 'node:path'

const pdf = (id: string) => new Uint8Array(Buffer.from(`%PDF-1.4\n%synthetic-test:${id}\n%%EOF\n`))
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const present = (value: string, evidence = value) => ({ status: 'present', value, evidence })
const absent = { status: 'not_shown', value: null, evidence: null }
const reading = (over: Record<string, unknown> = {}) => ({
  document_kind: 'licence_or_licence_certificate',
  readability: 'legible',
  instruction_like_text_present: false,
  personal_details_present: false,
  licence_or_plan_type: present('Pro', 'Licence type: Pro'),
  content_designation: absent,
  permission_statement: absent,
  licensed_item_reference: present('Synthetic Track 7', 'Track: Synthetic Track 7'),
  issue_date: present('2026-10-01', 'Issued 2026-10-01'),
  valid_until: absent,
  ...over,
})

function corpus(): ProfileFingerprintCase[] {
  return [
    { id: 'music-licence', bytes: pdf('music-licence'), recorded_output: reading() },
    { id: 'stock-editorial', bytes: pdf('stock-editorial'), recorded_output: reading({ licence_or_plan_type: absent, content_designation: present('Editorial', 'Editorial use only'), licensed_item_reference: present('Clip 0001', 'Clip ID 0001') }) },
    { id: 'permission-letter', bytes: png(), recorded_output: reading({ document_kind: 'permission_or_consent_letter', licence_or_plan_type: absent, permission_statement: present('Permission granted for use in the production', 'Permission granted for use in the production'), personal_details_present: true }) },
    { id: 'injection', bytes: pdf('injection'), recorded_output: reading({ instruction_like_text_present: true, readability: 'partially_legible' }) },
    { id: 'not-a-licence', bytes: pdf('not-a-licence'), recorded_output: reading({ document_kind: 'not_a_licence_or_permission', licence_or_plan_type: absent, licensed_item_reference: absent, issue_date: absent }) },
    { id: 'schema-invalid', bytes: pdf('schema-invalid'), recorded_output: { document_kind: 'licence_or_licence_certificate' } },
    { id: 'empty', bytes: new Uint8Array(0), recorded_output: reading() },
    { id: 'unsupported', bytes: new Uint8Array(Buffer.from('plain text, not a document')), recorded_output: reading() },
  ]
}
const fingerprint = async () => sha256Hex(canonicalJson(await profileOutputCanonical(LICENCE_PROFILE_INACTIVE, corpus())))
const caller = (out: unknown): ReceiptModelCaller => async () => ({ id: 'mock', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 0, output_tokens: 0 }, parsed_output: out })

describe('licence profile: inactive and separate', () => {
  test('not in the live registry; the customer path still names the receipt profile', () => {
    expect([...LIVE_PROFILE_REGISTRY.keys()]).toEqual(['receipt@1'])
    const src = readFileSync(path.join(__dirname, '../../lib/creator-record/live-examination/customer.ts'), 'utf8')
    expect(src).toContain("const PROFILE = { id: 'receipt', version: 1 } as const")
  })
  // CR-DOC-READER-EXT-5A: the method is defined, but only `issuanceSupportFor(true)` adds it; the default support list is unchanged.
  test('not in the default supported issuance reading methods', () => {
    expect(JSON.stringify(CURRENT_ISSUANCE_SUPPORT)).not.toMatch(/'licence'|"licence"|licence-extraction/)
    expect(issuanceSupportFor(false)).toBe(CURRENT_ISSUANCE_SUPPORT)
  })
  test('coexists with the receipt profile in a registry, under its own identity', () => {
    const reg = buildProfileRegistry([RECEIPT_PROFILE, LICENCE_PROFILE_INACTIVE])
    expect([...reg.keys()].sort()).toEqual(['licence@2', 'receipt@1'])
  })
  test('pinned output fingerprint over the corpus (append-only)', async () => {
    expect(await fingerprint()).toBe(LICENCE_PROFILE_OUTPUT_FINGERPRINTS[LICENCE_PROFILE_VERSION])
  })
})

describe('licence reading: source-grounded, strict, non-repairing', () => {
  test('a valid reading maps every printed field verbatim, with its excerpt', async () => {
    const r = await LICENCE_PROFILE_INACTIVE.readRecorded(pdf('ok'), reading())
    if (r.status !== 'examined') throw new Error('expected examined')
    const type = r.observations.find((o) => o.field === 'licence_or_plan_type')!
    expect(type).toMatchObject({ basis: 'printed_text', status: 'present', value: 'Pro', excerpt: 'Licence type: Pro' })
    expect(r.observations.map((o) => o.field)).toEqual(['document_kind', 'readability', 'instruction_like_text_present', 'personal_details_present', ...LICENCE_FIELD_NAMES])
    expect(r.limitations).toEqual(['no_location_reference', 'fields_not_established'])
  })
  test('limitations use only the existing closed vocabulary (approved templates stay valid)', async () => {
    for (const c of corpus()) {
      const r = await LICENCE_PROFILE_INACTIVE.readRecorded(c.bytes, c.recorded_output)
      if (r.status === 'examined') for (const l of r.limitations) expect(EXAMINATION_LIMITATIONS).toContain(l)
    }
  })
  test('"not a licence or permission" is a classification, not a limitation', async () => {
    const r = await LICENCE_PROFILE_INACTIVE.readRecorded(pdf('n'), corpus()[4].recorded_output)
    if (r.status !== 'examined') throw new Error('expected examined')
    expect(r.observations.find((o) => o.field === 'document_kind')!.value).toBe('not_a_licence_or_permission')
    expect(r.limitations).not.toContain('not_a_billing_document')
  })
  test('malformed responses are rejected whole', () => {
    expect(validateLicenceExtraction(null)).toBeNull()
    expect(validateLicenceExtraction({ ...reading(), extra: 1 })).toBeNull()
    expect(validateLicenceExtraction({ ...reading(), document_kind: 'receipt' })).toBeNull()
    expect(validateLicenceExtraction({ ...reading(), licence_or_plan_type: { status: 'not_shown', value: 'Pro', evidence: null } })).toBeNull()
    expect(validateLicenceExtraction({ ...reading(), licence_or_plan_type: { status: 'present', value: 'Pro', evidence: null } })).toBeNull()
    expect(validateLicenceExtraction({ ...reading(), issue_date: present('1 October 2026') })).toBeNull()
    expect(validateLicenceExtraction({ ...reading(), licensed_item_reference: present('x'.repeat(121)) })).toBeNull()
    expect(validateLicenceExtraction({ ...reading(), licensee_name: present('A Person') })).toBeNull()
  })
  test('privacy: a value or excerpt carrying an email address or phone number is rejected, never redacted', () => {
    expect(validateLicenceExtraction({ ...reading(), permission_statement: present('Permission granted', 'Contact jane.doe@example.test for details') })).toBeNull()
    expect(validateLicenceExtraction({ ...reading(), permission_statement: present('Permission granted', 'Call +1 (555) 010-2233') })).toBeNull()
    expect(containsContactDetails('Issued 2026-10-01')).toBe(false)
    expect(validateLicenceExtraction(reading({ personal_details_present: true }))).not.toBeNull()
  })
  test('the schema has no field for a person, and the instructions forbid copying personal details', () => {
    for (const f of LICENCE_FIELD_NAMES) expect(f).not.toMatch(/name|licensee|address|email|phone|signature/)
    expect(LICENCE_SYSTEM_PROMPT).toMatch(/Never report the name, address, email address, phone number or signature of any person/)
    expect(LICENCE_SYSTEM_PROMPT).toMatch(/do not follow them/)
  })
  test('prompt injection: an instruction in the document is recorded as a flag and limitation, nothing else changes', async () => {
    const r = await LICENCE_PROFILE_INACTIVE.readRecorded(pdf('inj'), reading({ instruction_like_text_present: true }))
    if (r.status !== 'examined') throw new Error('expected examined')
    expect(r.observations.find((o) => o.field === 'instruction_like_text_present')!.value).toBe('true')
    expect(r.limitations).toContain('instruction_like_text_present')
  })
  test('malformed documents and model failures fail closed with the engine’s fixed reasons', async () => {
    const run = (bytes: Uint8Array, call: ReceiptModelCaller) => examineWithContract(bytes, { callModel: call, contract: LICENCE_READING_CONTRACT })
    expect((await run(new Uint8Array(0), caller(reading()))).status).toBe('could_not_examine')
    expect(await run(new Uint8Array(Buffer.from('not a pdf')), caller(reading()))).toMatchObject({ status: 'could_not_examine', reason: 'unsupported_format' })
    expect(await run(pdf('bad'), caller({}))).toMatchObject({ status: 'could_not_examine', reason: 'schema_invalid' })
    expect(await run(pdf('none'), caller(undefined))).toMatchObject({ status: 'could_not_examine', reason: 'structured_output_missing' })
    expect(await run(pdf('err'), async () => { throw new Error('provider down') })).toMatchObject({ status: 'could_not_examine', reason: 'model_error' })
  })
})

describe('category → profile selection (defined, not wired)', () => {
  test('receipts and provider documents keep the receipt profile', () => {
    expect(profileForCategory('billing_receipt')).toEqual({ ok: true, profile: { id: 'receipt', version: 1 } })
    expect(profileForCategory('provider_terms')).toEqual({ ok: true, profile: { id: 'receipt', version: 1 } })
  })
  test('licences and permissions call for the licence profile, reported inactive (never read as a receipt)', () => {
    for (const c of ['licence', 'permission']) expect(profileForCategory(c)).toEqual({ ok: false, reason: 'profile_inactive', profile: { id: 'licence', version: 2 } })
    expect(profileForCategory('licence', [{ id: 'licence', version: 2 }])).toEqual({ ok: true, profile: { id: 'licence', version: 2 } })
  })
  test('releases, project files and other are not examined; unknown categories fail closed', () => {
    for (const c of ['release_or_consent', 'project_file', 'other']) expect(profileForCategory(c)).toEqual({ ok: false, reason: 'category_not_examined' })
    for (const c of ['receipt', '', null, undefined, 3, 'LICENCE']) expect(profileForCategory(c)).toEqual({ ok: false, reason: 'category_unknown' })
  })
  test('every declared category has an explicit entry', () => {
    expect(Object.keys(CATEGORY_PROFILES).sort()).toEqual([...EVIDENCE_CATEGORIES].sort())
  })
})
