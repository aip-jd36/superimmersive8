/**
 * NumbersProvenanceProvider
 *
 * Real adapter for the Numbers Protocol Capture API.
 *
 * Principle 3: Numbers provides provenance. SI8 provides commercial assessment.
 * These must not be conflated.
 *
 * STATUS: API credentials not yet received. Every unconfirmed API contract
 * is marked with a TODO. Do not remove TODOs until validated on a real API call.
 *
 * Reference: 06_Operations/call-notes/CALL-2026-07-01-P001-Sofia-Yan-Numbers-Protocol.md
 */

import type {
  AssessmentMetadata,
  ProvenanceMetadata,
  ProvenanceProvider,
  SignedAssetResult,
} from '@/types/assessment'
import { buildC2PAManifest } from '../service'

// ── Configuration ─────────────────────────────────────────────────────────────

// TODO (Numbers API): Confirm the exact base URL and version. Sofia Yan call noted
// "api.numbersprotocol.io" — verify at first real API call.
const NUMBERS_API_BASE_URL = 'https://api.numbersprotocol.io'

// TODO (Numbers API): Confirm the endpoint path.
// Current best-guess from Numbers docs v3: POST /api/v3/assets/
// Existing sign route used /api/v3/assets/ — confirm this is correct.
const CAPTURE_ENDPOINT = `${NUMBERS_API_BASE_URL}/api/v3/assets/`

// TODO (Numbers API): Confirm auth header name and token prefix.
// Existing sign route used: Authorization: token ${NUMBERS_API_KEY}
// If Numbers uses Bearer instead: Authorization: Bearer ${key}
const AUTH_HEADER_PREFIX = 'token'

// TODO (Numbers API): Confirm request timeout. Numbers upload may take 30–120s
// for large MP4 files. Vercel Pro allows maxDuration = 60 on the route.
// If Numbers is async (job-based), we need a polling or webhook strategy.
const REQUEST_TIMEOUT_MS = 55_000

// ── Response shape ────────────────────────────────────────────────────────────

// TODO (Numbers API): Confirm all response field names.
// Current best-guess from existing sign route and Sofia Yan call notes.
// Sofia confirmed C2PA Trust List status is UNCONFIRMED for uploaded MP4 via Capture API.
interface NumbersCaptureResponse {
  // TODO (Numbers API): confirm the CID field name.
  // Candidates seen: asset_cid, cid, id
  asset_cid?: string
  cid?: string
  id?: string

  // TODO (Numbers API): confirm how to retrieve the signed/C2PA-embedded file.
  // Sofia call: "Capture API returns a verify URL" — does it also return a download URL?
  // If no download URL is returned, we need a separate GET /api/v3/assets/{cid}/ call.
  signed_file_url?: string
  file?: string

  // TODO (Numbers API): confirm verification URL field name.
  verification_url?: string
}

// ── Implementation ────────────────────────────────────────────────────────────

export class NumbersProvenanceProvider implements ProvenanceProvider {
  private readonly apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('NumbersProvenanceProvider: apiKey is required')
    this.apiKey = apiKey
  }

  async sign(
    asset: Buffer,
    assessment: AssessmentMetadata,
    provenance: ProvenanceMetadata,
  ): Promise<SignedAssetResult> {
    // Build the SI8 custom C2PA assertion payload
    // (only approved fields — no confidence, no customer data)
    const c2paAssertion = buildC2PAManifest({
      assessment_number:    assessment.assessmentNumber,
      assessment_date:      assessment.assessmentDate,
      reviewer_organization: assessment.reviewerOrganization,
      methodology_version:  assessment.methodologyVersion,
      outcome:              assessment.outcomeCode,
      verification_url:     assessment.verificationUrl,
    })

    // Build multipart form data
    // TODO (Numbers API): Confirm all field names in the multipart form.
    // Existing sign route used: file, caption, tag, headline, custom_c2pa
    const formData = new FormData()

    // TODO (Numbers API): Confirm file field name ('file') and MIME type handling.
    formData.append(
      'file',
      new Blob([asset], { type: 'video/mp4' }),
      `${assessment.assessmentNumber}.mp4`,
    )

    // TODO (Numbers API): Confirm 'caption' field is accepted and its max length.
    formData.append('caption', assessment.assessmentNumber)

    // TODO (Numbers API): Confirm 'tag' field is accepted.
    formData.append('tag', 'si8-certified')

    // TODO (Numbers API): Confirm 'headline' field is accepted.
    formData.append(
      'headline',
      `SI8 Commercial Assurance Assessment — ${assessment.assessmentNumber}`,
    )

    // TODO (Numbers API): Confirm 'custom_c2pa' is the correct field name
    // for injecting custom C2PA assertions.
    // Also confirm whether digitalSourceType is embedded here or separately.
    const manifestPayload = {
      ...c2paAssertion,
      // Standard C2PA field for digital source type — full IPTC URI required.
      // TODO (Numbers API): Confirm that Capture API accepts this field in custom_c2pa
      // and passes it through to the c2pa.actions assertion correctly.
      digitalSourceType: provenance.digitalSourceType,
    }
    formData.append('custom_c2pa', JSON.stringify(manifestPayload))

    // POST to Capture API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(CAPTURE_ENDPOINT, {
        method:  'POST',
        headers: { Authorization: `${AUTH_HEADER_PREFIX} ${this.apiKey}` },
        body:    formData,
        signal:  controller.signal,
      })
    } catch (err: any) {
      const msg = err?.name === 'AbortError'
        ? `Numbers Capture API timed out after ${REQUEST_TIMEOUT_MS}ms`
        : `Numbers Capture API network error: ${err?.message ?? String(err)}`
      throw new Error(msg)
    } finally {
      clearTimeout(timeoutId)
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)')
      throw new Error(
        `Numbers Capture API returned HTTP ${res.status}: ${body}`,
      )
    }

    const data: NumbersCaptureResponse = await res.json()

    // Extract asset CID
    // TODO (Numbers API): Confirm which field contains the CID.
    const provenanceAssetId = data.asset_cid ?? data.cid ?? data.id ?? ''
    if (!provenanceAssetId) {
      throw new Error(
        'Numbers Capture API response did not contain an asset identifier. ' +
        `Response: ${JSON.stringify(data)}`,
      )
    }

    // Extract signed file URL
    // TODO (Numbers API): Confirm whether a download URL for the signed MP4 is
    // returned in the creation response, or whether a separate GET is required.
    // If a GET is required: GET ${NUMBERS_API_BASE_URL}/api/v3/assets/${provenanceAssetId}/
    // and extract the file field from that response.
    const signedAssetUrl = data.signed_file_url ?? data.file ?? ''
    if (!signedAssetUrl) {
      // TODO (Numbers API): If no download URL in create response, implement
      // a GET call here to retrieve it.
      throw new Error(
        'Numbers Capture API response did not contain a signed file URL. ' +
        `Response: ${JSON.stringify(data)}. ` +
        'TODO: implement a GET /api/v3/assets/{cid}/ call if URL is in a separate endpoint.',
      )
    }

    // Extract verification URL
    // TODO (Numbers API): Confirm verification URL format.
    const verificationUrl =
      data.verification_url ??
      `https://verify.numbersprotocol.io/asset-profile?nid=${provenanceAssetId}`

    return {
      signedAssetUrl,
      provenanceAssetId,
      verificationUrl,
    }
  }
}
