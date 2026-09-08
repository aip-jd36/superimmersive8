/**
 * Bounded report projection (CA-RLK-2b).
 *
 * SIGNED / AUTHORITATIVE ASSESSMENT FACTS  →  BOUNDED REPORT PROPOSITIONS  →  RENDERING
 *
 * This module is the single place that turns structured assessment state into
 * the propositions a report is allowed to make. It is pure: no I/O, no DB, no
 * Typst, no UI. Every output traces to a signed field, a reviewer-authored
 * field, or an actual submission artifact — never to a bare judgment value.
 *
 * It deliberately does NOT implement a generic
 * `reviewed / considered_not_applicable / not_provided` evidence ontology.
 * `Verified` alone does not mean "a document of category X was reviewed"
 * (per SI8 Reviewer Manual v0.2: a `Verified` Likeness/IP control commonly
 * means "the reviewer observed the content and nothing applicable was
 * present" — zero documents). So the projection renders only:
 *   - the reviewer's own `section_7.evidence_reviewed` list, verbatim;
 *   - the governed methodology domain scope (`scope_domain_codes`);
 *   - the governed "Supporting Evidence Record" (Appendix A, Report Template
 *     v0.2) — structured fields, each from an authoritative source or an
 *     explicit governed "N/A" / "Not provided" / "Unknown" / "Not stated".
 *
 * Fail-closed rule: when authority is insufficient for a proposition, OMIT it
 * or render the governed neutral value — never strengthen, never convert
 * absence of a positive fact into an unsupported negative fact.
 *
 * Aligns the code to the already-governed
 * `06_Operations/reviewer-workbook/SI8-Assessment-Report-Template-v0.2.md`
 * (Appendix A: Supporting Evidence Record; §1 evidence list). No governance
 * change — the doc was already correct; the code had drifted (Appendix A was
 * still the obsolete v0.1 "Chain of Title" framing).
 */

import { DOMAIN_CODE_LABELS } from './signoff'
import { ASSESSMENT_DOMAINS } from '@/types/assessment'

// ── Domain → control map (canonical; also used by Section7Brief) ─────────────

export const DOMAIN_CONTROLS: Record<string, string[]> = {
  A: ['A01'],
  R: ['R01', 'R02', 'R03', 'R04'],
  H: ['H01', 'H02'],
  I: ['I01', 'I02', 'I03'],
  L: ['L01', 'L02', 'L03'],
  T: ['T01'],
  D: ['D01', 'D02'],
}

const JUDGMENTS = ['Verified', 'Partially Verified', 'Not Provided', 'Not Applicable'] as const
type Judgment = (typeof JUDGMENTS)[number]

/**
 * The domain's overall judgment: the "worst" of its controls, with an explicit
 * all-N/A short-circuit. Not Provided > Partially Verified > (all) Not
 * Applicable > Verified. A domain with no accepted judgments at all reads as
 * Not Provided (fail closed).
 */
export function domainWorstJudgment(letter: string, section3: any): Judgment {
  const controls = DOMAIN_CONTROLS[letter] ?? []
  const judgments = controls
    .map((id) => (section3?.[id]?.judgment as string) ?? '')
    .filter(Boolean)
  if (judgments.length === 0) return 'Not Provided'
  if (judgments.includes('Not Provided')) return 'Not Provided'
  if (judgments.includes('Partially Verified')) return 'Partially Verified'
  if (judgments.every((j) => j === 'Not Applicable')) return 'Not Applicable'
  if (judgments.includes('Verified')) return 'Verified'
  return 'Not Provided'
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReportProjectionInput {
  section2: any
  section3: any
  section5: any
  section6: any
  section7: any
  submission: Record<string, any>
  /** From the signed assessment row; null → fall back to the full domain set. */
  scopeDomainCodes: readonly string[] | null
  assessmentNumber: string
  /** The report date string as rendered elsewhere in the report. */
  reportDate: string
  /** Already-resolved outcome label (e.g. "Insufficient Supporting Evidence"). */
  outcomeLabel: string
  /** Already-formatted intended-use string. */
  intendedUse: string
}

export interface EvidenceRecordField {
  label: string
  value: string
  /** Optional sub-fields rendered indented under `label`. */
  sub?: { label: string; value: string }[]
}

export interface ReportProjection {
  /** Reviewer-authored evidence-reviewed items, verbatim + trimmed. */
  evidenceReviewedLines: string[]
  /** False → the reviewer did not author an evidence list; render fail-closed. */
  evidenceReviewedAuthored: boolean
  /** Governed neutral text to render when `evidenceReviewedAuthored` is false. */
  evidenceReviewedFallback: string
  /** The methodology domains that were assessed (governed scope, not evidence). */
  domainsAssessed: { code: string; label: string }[]
  /** Signed §2 gate: the submitted video was independently observed in full. */
  videoIndependentlyObserved: boolean
  /** Appendix A "Supporting Evidence Record" — Report Template v0.2. */
  supportingEvidenceRecord: EvidenceRecordField[]
  /** Governed limitation language for Appendix A. */
  supportingEvidenceLimitation: string
  /** Per-domain "Evidence reviewed" narrative — bounded, fail-closed. */
  perDomainEvidence: Record<string, string>
}

// ── Small helpers ──────────────────────────────────────────────────────────

const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

function parseJson(v: unknown): any {
  if (v == null) return null
  if (typeof v === 'string') {
    try {
      return JSON.parse(v)
    } catch {
      return null
    }
  }
  return v
}

function toolName(t: any): string {
  return s(t?.tool_name) || s(t?.toolName) || s(t?.tool) || s(t?.name) || ''
}

function toolReceiptPath(t: any): string {
  return s(t?.receipt_path) || s(t?.receipt?.path) || ''
}

// ── Sub-projections ────────────────────────────────────────────────────────

function projectEvidenceReviewed(section7: any): {
  lines: string[]
  authored: boolean
} {
  const raw = Array.isArray(section7?.evidence_reviewed) ? section7.evidence_reviewed : []
  const lines = raw.map((e: unknown) => s(e)).filter(Boolean)
  return { lines, authored: lines.length > 0 }
}

function projectDomainsAssessed(
  scopeDomainCodes: readonly string[] | null,
): { code: string; label: string }[] {
  const codes =
    scopeDomainCodes && scopeDomainCodes.length > 0
      ? scopeDomainCodes
      : ASSESSMENT_DOMAINS.map((d) => d.code)
  return codes.map((code) => ({
    code,
    label: DOMAIN_CODE_LABELS[code] ?? code,
  }))
}

/**
 * Per-domain "Evidence reviewed" text for the domain block. Only reviewer-
 * authored content (finding `evidence_basis`, control `notes`) is projected as
 * substance. All-N/A → governed N/A wording. Not Provided → governed no-
 * evidence wording. Verified / Partially with nothing authored → an explicit
 * "no note recorded" statement — NEVER "CertForm submission and attached
 * documentation reviewed" (that manufactured a document review).
 */
function projectOneDomainEvidence(
  letter: string,
  section3: any,
  section5: any,
): string {
  const controls = DOMAIN_CONTROLS[letter] ?? []

  const findings = Array.isArray(section5?.findings) ? section5.findings : []
  const fromFindings = findings
    .filter((f: any) => f?.domain === letter)
    .map((f: any) => s(f?.evidence_basis))
    .filter(Boolean)
  if (fromFindings.length > 0) return fromFindings.join('. ')

  const fromControls = controls
    .map((id) => {
      const ctrl = section3?.[id]
      if (!ctrl || ctrl.judgment === 'Not Applicable') return ''
      return s(ctrl.notes)
    })
    .filter(Boolean)
  if (fromControls.length > 0) return fromControls.join('. ')

  const judgments = controls
    .map((id) => (section3?.[id]?.judgment as string) ?? '')
    .filter(Boolean)
  if (judgments.length > 0 && judgments.every((j) => j === 'Not Applicable')) {
    return 'Not applicable to this content.'
  }

  const status = domainWorstJudgment(letter, section3)
  if (status === 'Not Provided') {
    return 'No evidence was provided for this domain.'
  }
  // Verified / Partially Verified with no reviewer-authored narrative.
  return 'The reviewer recorded a domain judgment; no separate domain-level evidence note was entered.'
}

function projectPerDomainEvidence(
  section3: any,
  section5: any,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const letter of Object.keys(DOMAIN_CONTROLS)) {
    out[letter] = projectOneDomainEvidence(letter, section3, section5)
  }
  return out
}

function projectSupportingEvidenceRecord(
  input: ReportProjectionInput,
): EvidenceRecordField[] {
  const { section3, section5, submission, assessmentNumber, reportDate, outcomeLabel, intendedUse } = input

  const fields: EvidenceRecordField[] = []

  // ── Content identity ─────────────────────────────────────────────────────
  fields.push({ label: 'Content title', value: s(submission.title) || 'Not stated' })

  const mediaType =
    s(submission.asset_media_type) || s(submission.media_type) || 'Video'
  const runtimeSecRaw =
    typeof submission.runtime === 'number'
      ? submission.runtime
      : typeof submission.asset_runtime === 'number'
        ? submission.asset_runtime
        : typeof submission.runtime_seconds === 'number'
          ? submission.runtime_seconds
          : null
  const runtimeStr =
    runtimeSecRaw != null && runtimeSecRaw > 0
      ? `${Math.floor(runtimeSecRaw / 60)}:${String(runtimeSecRaw % 60).padStart(2, '0')}`
      : ''
  fields.push({
    label: 'Format',
    value: runtimeStr ? `${mediaType} · ${runtimeStr}` : mediaType,
  })

  fields.push({ label: 'Intended commercial use', value: intendedUse || 'Not stated' })
  fields.push({
    label: 'Intended territory',
    value: s(submission.territory) || s(submission.territory_preferences) || 'Not stated',
  })

  // ── AI tools declared + commercial license status ────────────────────────
  const tools = parseJson(submission.tools_used)
  const toolList: any[] = Array.isArray(tools) ? tools : []
  const rStatus = domainWorstJudgment('R', section3)

  if (toolList.length === 0) {
    fields.push({ label: 'AI tools declared', value: 'None declared' })
    fields.push({ label: 'Commercial license status', value: 'N/A — no AI tools declared' })
  } else {
    fields.push({
      label: 'AI tools declared',
      value: '',
      sub: toolList.map((t, i) => ({
        label: `Tool ${i + 1}`,
        value: toolName(t) || 'Name not stated',
      })),
    })
    fields.push({
      label: 'Commercial license status',
      value: '',
      sub: toolList.map((t, i) => {
        const hasReceipt = !!toolReceiptPath(t)
        let v: string
        if (hasReceipt && rStatus === 'Verified') v = 'Verified — receipt on file'
        else if (hasReceipt && rStatus === 'Partially Verified') v = 'Partially verified — receipt on file'
        else if (hasReceipt) v = 'Receipt on file'
        else if (rStatus === 'Not Applicable') v = 'N/A'
        else v = 'Not provided'
        return { label: toolName(t) || `Tool ${i + 1}`, value: v }
      }),
    })
  }

  // ── Human creative contribution ─────────────────────────────────────────
  const hStatus = domainWorstJudgment('H', section3)
  const workflowDocumented =
    hStatus === 'Verified'
      ? 'Yes — corroborated by an artifact on file'
      : hStatus === 'Partially Verified'
        ? "Partial — submitter's description only, no corroborating artifact"
        : hStatus === 'Not Applicable'
          ? 'N/A'
          : 'No'
  const workflowSummary =
    s(section3?.H01?.contribution_level) || s(section3?.H01?.notes) || ''
  const hSub: { label: string; value: string }[] = [
    { label: 'Workflow documented', value: workflowDocumented },
  ]
  if (workflowSummary) hSub.push({ label: 'Summary', value: workflowSummary })
  fields.push({ label: 'Human creative contribution', value: '', sub: hSub })

  // ── Audio ───────────────────────────────────────────────────────────────
  const audio = parseJson(submission.audio_disclosure) ?? {}
  const audioSourceRaw =
    s(audio.source_type) || s(audio.source) || s(submission.audio_source)
  const audioSourceMap: Record<string, string> = {
    ai_generated: 'AI-generated',
    ai: 'AI-generated',
    licensed: 'Licensed',
    original: 'Original recording',
    original_recording: 'Original recording',
    mixed: 'Mixed',
    none: 'None',
  }
  const audioSource = audioSourceRaw
    ? audioSourceMap[audioSourceRaw] ?? audioSourceRaw
    : 'Not stated'
  const audioLicensePath = s(audio.license_path)
  const audioLicense = audioLicensePath
    ? 'Yes'
    : audioSourceRaw === 'licensed'
      ? 'No'
      : 'N/A'
  fields.push({
    label: 'Audio',
    value: '',
    sub: [
      { label: 'Source', value: audioSource },
      { label: 'License on file', value: audioLicense },
    ],
  })

  // ── Third-party assets ─────────────────────────────────────────────────
  const iStatus = domainWorstJudgment('I', section3)
  const iFindings = (Array.isArray(section5?.findings) ? section5.findings : []).filter(
    (f: any) => f?.domain === 'I',
  )
  const iDeclared =
    iStatus === 'Not Applicable'
      ? 'N/A'
      : iFindings.length > 0
        ? 'Yes — see Domain I in Section 3'
        : iStatus === 'Verified'
          ? 'None identified in independent review'
          : 'See Domain I in Section 3'
  const ipLicensePath = s(submission.ip_license_path)
  const iLicense = ipLicensePath
    ? 'Yes'
    : iStatus === 'Not Applicable'
      ? 'N/A'
      : 'Not provided'
  fields.push({
    label: 'Third-party assets',
    value: '',
    sub: [
      { label: 'Declared', value: iDeclared },
      { label: 'License on file', value: iLicense },
    ],
  })

  // ── Likeness / performer ───────────────────────────────────────────────
  const lStatus = domainWorstJudgment('L', section3)
  const lFindings = (Array.isArray(section5?.findings) ? section5.findings : []).filter(
    (f: any) => f?.domain === 'L',
  )
  const realPerson =
    lStatus === 'Not Applicable'
      ? 'N/A'
      : lFindings.length > 0
        ? 'Yes — see Domain L in Section 3'
        : lStatus === 'Verified'
          ? 'No — none identified in independent review'
          : 'See Domain L in Section 3'
  const releasePath = s(submission.likeness_release_path)
  const release = releasePath
    ? 'Yes'
    : lStatus === 'Not Applicable'
      ? 'N/A'
      : 'Not provided'
  fields.push({
    label: 'Likeness / performer',
    value: '',
    sub: [
      { label: 'Real person present', value: realPerson },
      { label: 'Release on file', value: release },
    ],
  })

  // ── Provenance metadata ────────────────────────────────────────────────
  const tStatus = domainWorstJudgment('T', section3)
  const metadataNote = s(section3?.T01?.metadata_provided)
  const c2pa =
    metadataNote
      ? 'Present'
      : tStatus === 'Not Applicable'
        ? 'N/A'
        : 'Unknown'
  fields.push({
    label: 'Provenance metadata',
    value: '',
    sub: [
      { label: 'C2PA / Content Credentials', value: c2pa },
      { label: 'On-chain registration', value: 'Unknown' },
    ],
  })

  // ── Assessment cross-reference ─────────────────────────────────────────
  fields.push({
    label: 'Assessment cross-reference',
    value: '',
    sub: [
      { label: 'Assessment ID', value: assessmentNumber },
      { label: 'Report date', value: reportDate },
      { label: 'Overall outcome', value: outcomeLabel },
    ],
  })

  return fields
}

// ── Public entry point ─────────────────────────────────────────────────────

// Verbatim from SI8-Assessment-Report-Template-v0.2.md (the "evidence-based,
// not exhaustive" paragraph of the Standard Assurance Language, reused as the
// Appendix A limitation note).
const SUPPORTING_EVIDENCE_LIMITATION =
  'This assessment is evidence-based, not exhaustive. ' +
  "SI8's assessment reflects the evidence reviewed. " +
  'SI8 has not conducted independent title searches, chain of copyright ' +
  'investigations, or registrations with any government body. Findings are ' +
  "based on the evidence provided by the submitting party and SI8's direct " +
  'review of the submitted content.'

const EVIDENCE_REVIEWED_FALLBACK =
  'A consolidated evidence list was not recorded for this assessment. The ' +
  'evidence considered for each domain is itemized in Section 3.'

export function projectReport(input: ReportProjectionInput): ReportProjection {
  const ev = projectEvidenceReviewed(input.section7)
  return {
    evidenceReviewedLines: ev.lines,
    evidenceReviewedAuthored: ev.authored,
    evidenceReviewedFallback: EVIDENCE_REVIEWED_FALLBACK,
    domainsAssessed: projectDomainsAssessed(input.scopeDomainCodes),
    videoIndependentlyObserved:
      input.section2?.viewing_passes?.first_complete === true,
    supportingEvidenceRecord: projectSupportingEvidenceRecord(input),
    supportingEvidenceLimitation: SUPPORTING_EVIDENCE_LIMITATION,
    perDomainEvidence: projectPerDomainEvidence(input.section3, input.section5),
  }
}
