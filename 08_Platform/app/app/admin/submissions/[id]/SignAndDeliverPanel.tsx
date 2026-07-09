'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Shield, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp,
  Copy, ExternalLink, Package
} from 'lucide-react'

interface SignAndDeliverPanelProps {
  submissionId: string
  assessId: string | null
  workbookData: Record<string, any> | null
  hasSourceVideo: boolean
  hasReportPdf: boolean
  hasCredentials: boolean
  provenanceStatus: string   // not_started | signing | signed | delivered
  numbersVerifyUrl: string | null
  numbersAssetId: string | null
  numbersSignedAt: string | null
  reportHash: string | null
}

// Build Zone A preview from workbook data — same logic as the server route
// so the reviewer can inspect before committing.
function buildZoneAPreview(
  workbookData: Record<string, any> | null,
  assessId: string | null,
): Record<string, string | boolean> {
  const s6 = workbookData?.section_6 ?? {}
  const s3 = workbookData?.section_3 ?? {}

  const outcomeId = s6.outcome || 'INSUFFICIENT_EVIDENCE'
  const confidenceLevel = (s6.commercial_confidence ?? '').toUpperCase() || 'LOW'

  const authMap: Record<string, string> = {
    EVIDENCE_SUPPORTS: 'AUTHORIZED',
    EVIDENCE_SUPPORTS_WITH_CONDITIONS: 'CONDITIONS_APPLY',
    MATERIAL_RISKS_IDENTIFIED: 'NOT_AUTHORIZED',
    INSUFFICIENT_EVIDENCE: 'NOT_AUTHORIZED',
    UNABLE_TO_ASSESS: 'NOT_AUTHORIZED',
  }
  const commercialAuth = authMap[outcomeId] ?? 'NOT_AUTHORIZED'

  let likenessAssessment = 'UNABLE_TO_ASSESS'
  const l01 = s3.L01 ?? {}
  if (l01.judgment === 'Not Applicable' || l01.likeness_found === 'none') {
    likenessAssessment = 'NO_SYNTHETIC_PERFORMERS'
  } else if ((s3.L03 ?? {}).judgment === 'Verified') {
    likenessAssessment = 'SYNTHETIC_PERFORMERS_CONSENTED'
  }

  const id = assessId ?? 'ASSESS-UNKNOWN'
  const assessDate = id.match(/(\d{4}-\d{2}-\d{2})$/)?.[1]
    ?? new Date().toISOString().split('T')[0]

  return {
    'si8:assessment_id':                id,
    'si8:assessment_date':              assessDate,
    'si8:reviewer_org':                 'PMF Strategy Inc. d/b/a SuperImmersive 8',
    'si8:methodology_version':          'SI8 Reviewer Manual v0.1',
    'si8:verification_url':             `https://verify.superimmersive8.com/${id}`,
    'si8:outcome_id':                   outcomeId,
    'si8:confidence_level':             confidenceLevel,
    'si8:commercial_authorization':     commercialAuth,
    'si8:report_hash':                  '[computed on sign]',
    'si8:report_version':               'v0.2',
    'si8:ai_generated_content':         true,
    'si8:commercial_licenses_confirmed': true,
    'si8:likeness_assessment':          likenessAssessment,
  }
}

function formatSignedAt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function SignAndDeliverPanel({
  submissionId,
  assessId,
  workbookData,
  hasSourceVideo,
  hasReportPdf,
  hasCredentials,
  provenanceStatus,
  numbersVerifyUrl,
  numbersAssetId,
  numbersSignedAt,
  reportHash,
}: SignAndDeliverPanelProps) {
  const router = useRouter()
  const [signing, setSigning] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const workbookSignedOff = !!(workbookData?.section_6?.signed_off === true)
  const prereqsMet = hasSourceVideo && hasReportPdf && workbookSignedOff
  const isSigned = provenanceStatus === 'signed' || provenanceStatus === 'delivered'
  const isDelivered = provenanceStatus === 'delivered'
  const isSigningInProgress = provenanceStatus === 'signing' || signing

  const zoneAPreview = buildZoneAPreview(workbookData, assessId)

  const handleSign = async () => {
    setError(null)
    setSigning(true)
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}/sign`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Signing failed')
      } else {
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message ?? 'Network error')
    } finally {
      setSigning(false)
    }
  }

  const handleMarkDelivered = async () => {
    setDelivering(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}/mark-delivered`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to mark delivered')
      } else {
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message ?? 'Network error')
    } finally {
      setDelivering(false)
    }
  }

  const handleCopyVerifyUrl = async () => {
    if (!numbersVerifyUrl) return
    await navigator.clipboard.writeText(numbersVerifyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Signed / Delivered state ────────────────────────────────────────────
  if (isSigned) {
    return (
      <Card className="border-2" style={{ borderColor: 'rgba(22,163,74,0.3)', backgroundColor: '#f0fdf4' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: '#16a34a' }} />
            Sign &amp; Deliver
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-green-800">
              {isDelivered ? 'Delivered' : 'Signed with Numbers Protocol'}
            </span>
          </div>

          <div className="text-xs text-gray-500">
            Signed: {formatSignedAt(numbersSignedAt)}
          </div>

          {numbersVerifyUrl && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">Numbers verify URL</div>
              <div className="flex items-center gap-2">
                <a
                  href={numbersVerifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-1 min-w-0"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{numbersVerifyUrl}</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyVerifyUrl}
                  className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                  title="Copy URL"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {numbersAssetId && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">Asset CID</div>
              <div className="text-xs font-mono text-gray-600 break-all">{numbersAssetId}</div>
            </div>
          )}

          {reportHash && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">Report SHA-256</div>
              <div className="text-xs font-mono text-gray-500 break-all">{reportHash.slice(0, 16)}…</div>
            </div>
          )}

          {!isDelivered && (
            <Button
              size="sm"
              className="w-full"
              onClick={handleMarkDelivered}
              disabled={delivering}
              style={{ backgroundColor: '#1C3557', color: 'white' }}
            >
              <Package className="w-3.5 h-3.5 mr-2" />
              {delivering ? 'Updating…' : 'Mark as Delivered'}
            </Button>
          )}

          {isDelivered && (
            <div className="text-xs text-center text-green-700 font-medium py-1">
              ✓ Delivery recorded
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── Not yet signed ──────────────────────────────────────────────────────
  const borderColor = prereqsMet && hasCredentials ? 'rgba(200,144,10,0.35)' : 'rgba(0,0,0,0.08)'
  const bgColor = prereqsMet && hasCredentials ? '#fffbf0' : 'white'

  return (
    <Card className="border-2" style={{ borderColor, backgroundColor: bgColor }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 flex-shrink-0" style={{ color: '#C8900A' }} />
          Sign &amp; Deliver
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Prerequisites checklist */}
        <div className="space-y-1.5">
          {[
            { label: 'Source video uploaded', met: hasSourceVideo },
            { label: 'Report PDF uploaded',   met: hasReportPdf },
            { label: 'Workbook signed off',   met: workbookSignedOff },
          ].map(({ label, met }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              {met
                ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                : <AlertCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              }
              <span className={met ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
            </div>
          ))}
        </div>

        {/* Credentials status */}
        {!hasCredentials && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Add <code className="font-mono bg-amber-100 px-1 rounded">NUMBERS_API_KEY</code> to Vercel env vars to enable signing.</span>
          </div>
        )}

        {/* Zone A payload preview */}
        {prereqsMet && (
          <div>
            <button
              type="button"
              onClick={() => setPreviewOpen(o => !o)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {previewOpen
                ? <ChevronUp className="w-3 h-3" />
                : <ChevronDown className="w-3 h-3" />
              }
              {previewOpen ? 'Hide' : 'Preview'} Zone A manifest
            </button>
            {previewOpen && (
              <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono overflow-x-auto">
                {Object.entries(zoneAPreview).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-400 flex-shrink-0 w-48 truncate">{k}</span>
                    <span className="text-gray-700">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sign button */}
        <Button
          size="sm"
          className="w-full text-white"
          style={{ backgroundColor: prereqsMet && hasCredentials && !isSigningInProgress ? '#C8900A' : undefined }}
          onClick={handleSign}
          disabled={!prereqsMet || !hasCredentials || isSigningInProgress}
        >
          <Shield className="w-3.5 h-3.5 mr-2" />
          {isSigningInProgress ? 'Signing…' : 'Sign with Numbers Protocol'}
        </Button>

        {isSigningInProgress && !signing && (
          <p className="text-xs text-gray-500 text-center animate-pulse">
            Signing in progress — do not navigate away…
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Downloads PDF → computes SHA-256 → embeds C2PA credentials → signs MP4 via Numbers Protocol Capture API.
        </p>
      </CardContent>
    </Card>
  )
}
