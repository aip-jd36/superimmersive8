import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Vercel Pro max — downloading + uploading large MP4s needs headroom
export const maxDuration = 60

type RouteContext = { params: { id: string } }

// ─── Zone A Assertion Builder ─────────────────────────────────────────────────
// Maps workbook_data fields → C2PA custom assertion JSON per the Provenance
// Manifest Specification v0.1 (06_Operations/provenance/).

function buildZoneA(submission: any, reportHash: string): Record<string, unknown> {
  const s6 = submission.workbook_data?.section_6 ?? {}
  const s3 = submission.workbook_data?.section_3 ?? {}
  const assessId: string = submission.assess_id ?? 'ASSESS-UNKNOWN'

  const outcomeId: string = s6.outcome || 'INSUFFICIENT_EVIDENCE'

  const authorizationMap: Record<string, string> = {
    EVIDENCE_SUPPORTS:                  'AUTHORIZED',
    EVIDENCE_SUPPORTS_WITH_CONDITIONS:  'CONDITIONS_APPLY',
    MATERIAL_RISKS_IDENTIFIED:          'NOT_AUTHORIZED',
    INSUFFICIENT_EVIDENCE:              'NOT_AUTHORIZED',
    UNABLE_TO_ASSESS:                   'NOT_AUTHORIZED',
  }
  const commercialAuth = authorizationMap[outcomeId] ?? 'NOT_AUTHORIZED'

  // Confidence arrives as "High" / "Medium" / "Low" from the workbook form
  const confidenceLevel = (s6.commercial_confidence ?? '').toUpperCase() || 'LOW'

  // Likeness assessment derived from L-domain controls
  let likenessAssessment = 'UNABLE_TO_ASSESS'
  const l01 = s3.L01 ?? {}
  if (l01.judgment === 'Not Applicable' || l01.likeness_found === 'none') {
    likenessAssessment = 'NO_SYNTHETIC_PERFORMERS'
  } else if ((s3.L03 ?? {}).judgment === 'Verified') {
    likenessAssessment = 'SYNTHETIC_PERFORMERS_CONSENTED'
  }

  // Extract date component from ASSESS-NNN-YYYY-MM-DD format
  const assessDate = assessId.match(/(\d{4}-\d{2}-\d{2})$/)?.[1]
    ?? new Date().toISOString().split('T')[0]

  return {
    'si8:assessment_id':              assessId,
    'si8:assessment_date':            assessDate,
    'si8:reviewer_org':               'PMF Strategy Inc. d/b/a SuperImmersive 8',
    'si8:methodology_version':        'SI8 Reviewer Manual v0.1',
    'si8:verification_url':           `https://verify.superimmersive8.com/${assessId}`,
    'si8:outcome_id':                 outcomeId,
    'si8:confidence_level':           confidenceLevel,
    'si8:commercial_authorization':   commercialAuth,
    'si8:report_hash':                `sha256:${reportHash}`,
    'si8:report_version':             'v0.2',
    'si8:ai_generated_content':       true,
    'si8:commercial_licenses_confirmed': true,
    'si8:likeness_assessment':        likenessAssessment,
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    // Auth
    const supabase = createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: userData } = await supabaseAdmin
      .from('users').select('is_admin').eq('id', authUser.id).single()
    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Credential gate
    const NUMBERS_API_KEY = process.env.NUMBERS_API_KEY
    if (!NUMBERS_API_KEY) {
      return NextResponse.json(
        { error: 'Numbers API credentials not configured — add NUMBERS_API_KEY to Vercel env vars.' },
        { status: 503 }
      )
    }

    // Fetch submission
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('id, title, assess_id, workbook_data, source_video_url, report_pdf_url, provenance_status')
      .eq('id', params.id)
      .single()
    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Prerequisite checks
    const missing: string[] = []
    if (!submission.source_video_url) missing.push('source video')
    if (!submission.report_pdf_url)  missing.push('report PDF')
    const workbookSignedOff = !!(submission.workbook_data as any)?.section_6?.signed_off
    if (!workbookSignedOff) missing.push('workbook sign-off (Section 6)')
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Prerequisites not met: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    if (submission.provenance_status === 'signed') {
      return NextResponse.json({ error: 'Already signed' }, { status: 409 })
    }

    // Mark signing in progress
    await supabaseAdmin
      .from('submissions')
      .update({ provenance_status: 'signing' })
      .eq('id', params.id)

    // ── Step 1: Download PDF and compute SHA-256 ───────────────────────────
    const { data: pdfBlob, error: pdfError } = await supabaseAdmin.storage
      .from('report-pdfs')
      .download(submission.report_pdf_url as string)
    if (pdfError || !pdfBlob) {
      await resetStatus(params.id)
      return NextResponse.json({ error: 'Failed to download report PDF', detail: pdfError?.message }, { status: 500 })
    }
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
    const reportHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

    // ── Step 2: Build Zone A payload ───────────────────────────────────────
    const zoneAPayload = buildZoneA(submission, reportHash)

    // ── Step 3: Update report_hash in DB ──────────────────────────────────
    await supabaseAdmin
      .from('submissions')
      .update({ report_hash: reportHash, report_hash_algorithm: 'SHA256' })
      .eq('id', params.id)

    // ── Step 4: Download source video ─────────────────────────────────────
    const { data: videoBlob, error: videoError } = await supabaseAdmin.storage
      .from('source-videos')
      .download(submission.source_video_url as string)
    if (videoError || !videoBlob) {
      await resetStatus(params.id)
      return NextResponse.json({ error: 'Failed to download source video', detail: videoError?.message }, { status: 500 })
    }
    const videoBuffer = Buffer.from(await videoBlob.arrayBuffer())

    // ── Step 5: POST to Capture API ───────────────────────────────────────
    // Endpoint and field names confirmed from Numbers Protocol API docs v3.
    // ⚠ Verify these against the actual API response before Assessment One.
    // Sofia Yan (Numbers Protocol) correspondence: call-notes/CALL-2026-07-01-P001-Sofia-Yan-Numbers-Protocol.md
    const assessId: string = (submission.assess_id as string) ?? 'ASSESS-UNKNOWN'
    const videoExt = (submission.source_video_url as string).split('.').pop() ?? 'mp4'

    const formData = new FormData()
    formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }), `${assessId}.${videoExt}`)
    formData.append('caption', assessId)
    formData.append('tag', 'si8-certified')
    formData.append('headline', `SI8 Campaign Assurance Assessment — ${assessId}`)
    formData.append('custom_c2pa', JSON.stringify(zoneAPayload))

    const captureRes = await fetch('https://api.numbersprotocol.io/api/v3/assets/', {
      method: 'POST',
      headers: { Authorization: `token ${NUMBERS_API_KEY}` },
      body: formData,
    })
    if (!captureRes.ok) {
      const captureErr = await captureRes.text()
      await resetStatus(params.id)
      return NextResponse.json(
        { error: 'Capture API error', detail: captureErr, status: captureRes.status },
        { status: 502 }
      )
    }

    // ── Step 6: Parse Capture API response ────────────────────────────────
    const captureData = await captureRes.json()
    // Field names to confirm on next Sofia call. Current best-guess from Numbers docs:
    const numbersAssetId: string  = captureData.asset_cid ?? captureData.cid ?? captureData.id ?? ''
    const signedFileUrl: string   = captureData.signed_file_url ?? captureData.file ?? ''
    const verificationUrl: string = captureData.verification_url
      ?? (numbersAssetId ? `https://verify.numbersprotocol.io/asset-profile?nid=${numbersAssetId}` : '')

    // ── Step 7: Persist results ───────────────────────────────────────────
    await supabaseAdmin
      .from('submissions')
      .update({
        provenance_status:    'signed',
        numbers_asset_id:     numbersAssetId,
        numbers_verify_url:   verificationUrl,
        numbers_signed_at:    new Date().toISOString(),
        signed_video_url:     signedFileUrl,  // storing Numbers URL directly (Year 1)
      })
      .eq('id', params.id)

    return NextResponse.json({
      success:          true,
      reportHash,
      numbersAssetId,
      numbersVerifyUrl: verificationUrl,
      signedVideoUrl:   signedFileUrl,
      zoneA:            zoneAPayload,
    })
  } catch (err: any) {
    await resetStatus(params.id).catch(() => {})
    console.error('Error in sign route:', err)
    return NextResponse.json({ error: 'Internal server error', detail: err?.message }, { status: 500 })
  }
}

async function resetStatus(submissionId: string) {
  await supabaseAdmin
    .from('submissions')
    .update({ provenance_status: 'not_started' })
    .eq('id', submissionId)
}
