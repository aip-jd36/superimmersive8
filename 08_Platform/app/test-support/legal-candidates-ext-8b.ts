/**
 * CR-DOC-READER-EXT-8B/8C/8D — the approved Privacy Notice and Terms changes, as data. PUBLISHED (CR-DOC-READER-EXT-8D) as
 * `privacy-2026-11-19` / `terms-2026-11-19` in `lib/legal/policies.ts`, founder approval JD-CR-DOC-READER-EXT-8C-20261119 (internal
 * good-faith review, not a legal opinion). Test-support only: no application module imports this file.
 *
 * Tests use it to prove that the published text is exactly the previous approved text plus these changes (`revertExt8b` reproduces
 * the previous digests) and to simulate a later legal-version change (`withPolicyVersion`). Changing any entry needs a new approval.
 */
import type { ApprovedLegalDocument } from '@/lib/legal/policies'

/** sha256 of JSON.stringify({ privacy: paragraphs, terms: paragraphs }) of the approved, now published, documents. */
export const APPROVED_CANDIDATE_WORDING_SHA256 = '0a6fa5dd56da9e0611518727464ba7e1e98d66acd386e905c29c7e1e9f103e89'

/** Privacy Notice changes (EXT-8A proposal, §§1, 2, 5). */
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

/** New paragraphs (§4 and §5), each directly after the paragraph that starts with `after`. */
export const PRIVACY_INSERTIONS: readonly { after: string; text: string }[] = Object.freeze([
  {
    after: 'Adding documents is optional. Add only documents you are entitled to share.',
    text: 'A licence or permission may name another person or organisation, such as whoever gave a permission. Add one only if you are entitled to share it with SI8 for this purpose. You may cover details that are not needed to show the licence or permission. SI8 does not remove or redact anything from the file you add.',
  },
  {
    after: 'The reading is automated. It may be incomplete or wrong,',
    text: "For licences and permissions, the reading is instructed not to copy people's names, addresses, email addresses, phone numbers or signatures, and SI8 rejects any such reading that contains an email address or phone number. Your record does not reproduce text from these documents: it shows what kind of document was read, dates, and whether certain details were shown. This applies to what your record shows; the file you added is unchanged, and the reading SI8 keeps may include details the reading was instructed not to copy.",
  },
])

/** Terms §5: the provider-specific coverage sentence replaced by generic wording. */
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
  if (hits.length !== 1 || count !== 1) throw new Error(`target must occur exactly once: ${from.slice(0, 60)}`)
  paragraphs[hits[0]] = paragraphs[hits[0]].replace(from, to)
}

/** The published paragraphs with the EXT-8B changes undone (throws unless each change is present exactly once). */
export function revertExt8b(kind: 'privacy' | 'terms', published: readonly string[]): string[] {
  const paragraphs = [...published]
  if (kind === 'privacy') {
    for (const ins of PRIVACY_INSERTIONS) {
      const at = paragraphs.flatMap((p, i) => (p === ins.text ? [i] : []))
      if (at.length !== 1) throw new Error('inserted paragraph must occur exactly once')
      paragraphs.splice(at[0], 1)
    }
  }
  for (const r of kind === 'privacy' ? PRIVACY_REPLACEMENTS : TERMS_REPLACEMENTS) replaceOnce(paragraphs, r.to, r.from)
  return paragraphs
}

/** A published document with only its version changed: to simulate a later legal-version change. */
export const withPolicyVersion = (doc: ApprovedLegalDocument | null, version: string): ApprovedLegalDocument => {
  if (!doc) throw new Error('published document missing')
  return Object.freeze({ ...doc, version }) as ApprovedLegalDocument
}
