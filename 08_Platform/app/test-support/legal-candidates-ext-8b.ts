/**
 * CR-DOC-READER-EXT-8B — CANDIDATE Privacy Notice and Terms of Service revisions. STATUS: APPROVED IN PRINCIPLE BY THE FOUNDER (internal
 * good-faith review, not a legal opinion); NOT PUBLISHED. Kept in test-support (like the proposed PDF template sets): `lib/legal/policies.ts`
 * says draft wording never goes there, and no application module imports this file.
 *
 * Built from the live documents by exact replacements and insertions only (each target must occur exactly once), so a test can prove
 * nothing else changed. Publishing means copying the resulting paragraphs into `PRIVACY_NOTICE` / `TERMS_OF_SERVICE` with the final
 * version identifiers, effective dates and approval references, in one reviewed change, followed by the operator's authority-row
 * replacement (see `08_Platform/implementation/cr-doc-reader-ext-1/05-PRIVACY-TERMS-EXT-8B.md`).
 */
import { PRIVACY_NOTICE, TERMS_OF_SERVICE, type ApprovedLegalDocument } from '@/lib/legal/policies'

/** Placeholder identifiers; publication sets the real ones (format `LEGAL_VERSION_PATTERN`). */
export const CANDIDATE_PRIVACY_VERSION = 'privacy-2026-11-20'
export const CANDIDATE_TERMS_VERSION = 'terms-2026-11-20'
export const CANDIDATE_APPROVAL_REFERENCE = 'CR-DOC-READER-EXT-8B candidate (approved in principle; not published)'

/** Privacy Notice changes (EXT-8A proposal, §§1, 2, 4, 5). */
export const PRIVACY_REPLACEMENTS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'optionally add supporting documents such as receipts or invoices,', to: 'optionally add supporting documents such as receipts, invoices, licences or permissions,' },
  {
    from: 'Document readings: what an automated reading reports a document appears to show, such as who issued it, the plan or product named and dates.',
    to: 'Document readings: what an automated reading reports a document appears to show, such as who issued it, the plan, licence or product named, dates, and whether it appears to show details about a person.',
  },
  {
    from: "If you ask SI8 to read a document, you will first be asked for permission for that document. SI8 then sends the document and SI8's fixed reading instructions to Anthropic, the AI model provider SI8 uses. SI8 does not add your name, email address, account details or answers to that request, but the document itself may contain personal information. Anthropic processes these requests under its applicable service terms.",
    to: "If you ask SI8 to read a document, you will first be asked for permission for that document. SI8 then sends the whole document, as you added it, and SI8's fixed reading instructions to Anthropic, the AI model provider SI8 uses. SI8 does not add your name, email address, account details or answers to that request, but the document itself may contain personal information, including about other people. Anthropic processes these requests under its applicable service terms.",
  },
])

/** New paragraphs, each inserted directly after the paragraph that starts with `after`. */
export const PRIVACY_INSERTIONS: readonly { after: string; text: string }[] = Object.freeze([
  {
    after: 'Adding documents is optional. Add only documents you are entitled to share.',
    text: 'A licence or permission may name another person or organisation, such as whoever gave a permission. Add one only if you are entitled to share it with SI8 for this purpose. You may cover details that are not needed to show the licence or permission. SI8 does not remove or redact anything from the file you add.',
  },
  {
    after: 'The reading is automated. It may be incomplete or wrong,',
    text: 'For licences and permissions, the reading is instructed not to copy people's names, addresses, email addresses, phone numbers or signatures, and SI8 rejects any such reading that contains an email address or phone number. Your record does not reproduce text from these documents: it shows what kind of document was read, dates, and whether certain details were shown. This applies to what your record shows; the file you added is unchanged, and the reading SI8 keeps may include details the reading was instructed not to copy.',
  },
])

/** Terms §5: the outdated provider-specific coverage sentence, replaced by generic wording. */
export const TERMS_REPLACEMENTS: readonly { from: string; to: string }[] = Object.freeze([
  {
    from: 'Guidance is currently available for Runway and Higgsfield only, and the tools covered may change.',
    to: 'Guidance is available only for some AI tools and other services named in the questionnaire, and those covered may change.',
  },
  { from: 'and does not show which plan applied to you.', to: 'and does not show which plan or licence applied to you.' },
])

function replaceOnce(paragraphs: string[], from: string, to: string): void {
  const hits = paragraphs.flatMap((p, i) => (p.includes(from) ? [i] : []))
  const count = paragraphs.reduce((n, p) => n + p.split(from).length - 1, 0)
  if (hits.length !== 1 || count !== 1) throw new Error(`replacement target must occur exactly once: ${from.slice(0, 60)}`)
  paragraphs[hits[0]] = paragraphs[hits[0]].replace(from, to)
}

function build(base: ApprovedLegalDocument | null, version: string, replacements: readonly { from: string; to: string }[], insertions: readonly { after: string; text: string }[] = []): ApprovedLegalDocument {
  if (!base) throw new Error('live document missing')
  const paragraphs = [...base.paragraphs]
  for (const r of replacements) replaceOnce(paragraphs, r.from, r.to)
  for (const ins of insertions) {
    const at = paragraphs.flatMap((p, i) => (p.startsWith(ins.after) ? [i] : []))
    if (at.length !== 1) throw new Error(`insertion anchor must occur exactly once: ${ins.after.slice(0, 60)}`)
    paragraphs.splice(at[0] + 1, 0, ins.text)
  }
  return Object.freeze({ ...base, version, approval_reference: CANDIDATE_APPROVAL_REFERENCE, paragraphs: Object.freeze(paragraphs) }) as ApprovedLegalDocument
}

export const candidatePrivacyNotice = (): ApprovedLegalDocument => build(PRIVACY_NOTICE, CANDIDATE_PRIVACY_VERSION, PRIVACY_REPLACEMENTS, PRIVACY_INSERTIONS)
export const candidateTerms = (): ApprovedLegalDocument => build(TERMS_OF_SERVICE, CANDIDATE_TERMS_VERSION, TERMS_REPLACEMENTS)
