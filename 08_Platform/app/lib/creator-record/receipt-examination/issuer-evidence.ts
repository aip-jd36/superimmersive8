/**
 * CRV2-IA-4D2 — issuer evidence contract v3: who a document says issued it, kept apart from every other business it names.
 *
 * A business named on a document (a product, provider, brand or platform) is not evidence that the business issued the
 * document. Neither is a letterhead or sender alone. The reading reports each business-and-role statement the page prints;
 * this module derives the issuer from those statements by fixed rules. No keyword lists, no tool recognition, no provider
 * rule, and nothing here verifies anything: a derived issuer is what the document appears to state, never a verified identity.
 *
 * Roles (closed):
 *   issuer_attribution  the document states that this business issued, sold or billed it (seller, merchant of record,
 *                       "billed by", invoice from) — an explicit issuing or billing attribution;
 *   sender_only         the business is presented only as the document's sender or letterhead, without an issuing or
 *                       billing attribution. Never establishes issuance by itself;
 *   issuer_denied       the document states that this business did NOT issue it;
 *   mentioned_only      named as a product, service, provider, brand or platform, without any issuer role.
 *
 * Derived states (closed):
 *   identified    exactly one business carries an issuer_attribution and nothing denies that business;
 *   conflicting   two or more different businesses carry an issuer_attribution, or one business is both attributed and
 *                 denied (unresolved: never resolved by picking one);
 *   denied        no attribution, at least one denial;
 *   not_attributed  only sender_only and/or mentioned_only statements;
 *   missing       no statement at all;
 *   unclassified  a reading made before this contract (no issuer evidence recorded). Any NEW issuer-dependent
 *                 interpretation of it fails closed; the stored reading itself is never changed.
 *
 * Businesses are compared by normalised spelling only (Unicode NFKC, case, whitespace): two spellings that differ beyond
 * that are different businesses, so a sender A and a merchant B are simply A and B, not a conflict.
 */

import type { ExtractedField } from './schema'

export const RECEIPT_EXTRACTION_SCHEMA_VERSION_V3 = 'receipt-extraction-v3' as const

export const ISSUER_STATEMENT_ROLES = ['issuer_attribution', 'sender_only', 'issuer_denied', 'mentioned_only'] as const
export type IssuerStatementRole = (typeof ISSUER_STATEMENT_ROLES)[number]

export const ISSUER_EVIDENCE_STATES = ['identified', 'conflicting', 'denied', 'not_attributed', 'missing', 'unclassified'] as const
export type IssuerEvidenceState = (typeof ISSUER_EVIDENCE_STATES)[number]

/** Upper bound on statements accepted from the model. More fails validation. */
export const MAX_ISSUER_STATEMENTS = 6
const MAX_BUSINESS_CHARS = 120
const MAX_EVIDENCE_CHARS = 200

export interface IssuerStatement {
  /** The business name exactly as printed. */
  business: string
  role: IssuerStatementRole
  /** Short verbatim excerpt; must contain `business`. */
  evidence: string
}

/** What a v3 reading carries. Absent on every earlier reading. */
export interface IssuerEvidence {
  contract: typeof RECEIPT_EXTRACTION_SCHEMA_VERSION_V3
  statements: IssuerStatement[]
}

export interface IssuerEvidenceResult {
  state: IssuerEvidenceState
  /** The attributed business, as printed (first attribution of it), only when `identified`. */
  business: string | null
  /** The excerpt of that attribution, only when `identified`. */
  evidence: string | null
}

/** Spelling normalisation used to decide whether two statements name the same business. Never a semantic match. */
export function normalizeBusiness(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** The JSON schema of the `issuer_statements` output field (v3). */
export const ISSUER_STATEMENTS_JSON_SCHEMA = {
  type: 'array',
  maxItems: MAX_ISSUER_STATEMENTS,
  description:
    'Every business name printed on the document, one entry per printed statement, with the role the document gives it. Use an empty list if no business is named.',
  items: {
    type: 'object',
    properties: {
      business: { type: 'string', description: 'The business name only, exactly as printed.' },
      role: {
        type: 'string',
        enum: [...ISSUER_STATEMENT_ROLES],
        description:
          "issuer_attribution: the document states this business issued, sold or billed it. sender_only: shown only as the sender or letterhead, without an issuing or billing statement. issuer_denied: the document states this business did not issue it. mentioned_only: named as a product, service, provider, brand or platform, without any issuer role.",
      },
      evidence: { type: 'string', description: 'A short excerpt copied exactly from the document, containing the business name.' },
    },
    required: ['business', 'role', 'evidence'],
    additionalProperties: false,
  },
} as const

/** Strict, non-repairing validation of the model's `issuer_statements`. Null on any violation. */
export function validateIssuerStatements(raw: unknown): IssuerStatement[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_ISSUER_STATEMENTS) return null
  const out: IssuerStatement[] = []
  for (const s of raw) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return null
    const keys = Object.keys(s).sort().join(',')
    if (keys !== 'business,evidence,role') return null
    const { business, role, evidence } = s as Record<string, unknown>
    if (typeof business !== 'string' || typeof evidence !== 'string' || typeof role !== 'string') return null
    if (!(ISSUER_STATEMENT_ROLES as readonly string[]).includes(role)) return null
    const b = business.trim()
    if (b === '' || b.length > MAX_BUSINESS_CHARS || evidence.trim() === '' || evidence.length > MAX_EVIDENCE_CHARS) return null
    // The excerpt must actually contain the business it is about (spelling-normalised containment, as for plan names).
    if (!evidence.normalize('NFKC').toLowerCase().includes(b.normalize('NFKC').toLowerCase())) return null
    out.push({ business, role: role as IssuerStatementRole, evidence })
  }
  return out
}

/** The issuer, derived from statements by the fixed rules above. */
export function deriveIssuerEvidence(statements: readonly IssuerStatement[]): IssuerEvidenceResult {
  const none = (state: IssuerEvidenceState): IssuerEvidenceResult => ({ state, business: null, evidence: null })
  if (statements.length === 0) return none('missing')
  const attributed = new Map<string, IssuerStatement>()
  const denied = new Set<string>()
  for (const s of statements) {
    const key = normalizeBusiness(s.business)
    if (s.role === 'issuer_attribution' && !attributed.has(key)) attributed.set(key, s)
    if (s.role === 'issuer_denied') denied.add(key)
  }
  if (attributed.size > 1) return none('conflicting')
  if (attributed.size === 1) {
    const [key, s] = Array.from(attributed.entries())[0]
    if (denied.has(key)) return none('conflicting')
    return { state: 'identified', business: s.business, evidence: s.evidence }
  }
  if (denied.size > 0) return none('denied')
  return none('not_attributed')
}

/**
 * The `issuer_name` field a v3 reading carries, derived from its statements: present only when one issuer is identified,
 * ambiguous when the attributions conflict, not shown otherwise. Every existing reader of `issuer_name` therefore sees only an
 * identified issuer.
 */
export function issuerNameFromEvidence(result: IssuerEvidenceResult): ExtractedField {
  if (result.state === 'identified') return { status: 'present', value: result.business, evidence: result.evidence }
  if (result.state === 'conflicting') return { status: 'ambiguous', value: null, evidence: null }
  return { status: 'not_shown', value: null, evidence: null }
}

/**
 * THE shared rule for every issuer-dependent interpretation. A reading without issuer evidence (any reading made before v3)
 * is `unclassified`: no new interpretation may treat its `issuer_name` as an issuer.
 */
export function issuerEvidenceOf(reading: { issuer_evidence?: IssuerEvidence | null }): IssuerEvidenceResult {
  const ev = reading.issuer_evidence
  if (!ev || ev.contract !== RECEIPT_EXTRACTION_SCHEMA_VERSION_V3 || !Array.isArray(ev.statements)) return { state: 'unclassified', business: null, evidence: null }
  return deriveIssuerEvidence(ev.statements)
}
