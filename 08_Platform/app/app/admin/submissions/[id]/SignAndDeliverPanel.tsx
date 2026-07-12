'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Shield, CheckCircle, AlertCircle, Clock,
  Copy, ExternalLink, Package, RefreshCw,
} from 'lucide-react'

interface SignAndDeliverPanelProps {
  submissionId: string
  workbookData: Record<string, any> | null
  hasSourceVideo: boolean
  hasReportPdf: boolean
  /** Informational only — signing works without it (mock provider is used). */
  hasNumbersKey: boolean
  /** Processing status from assessments table. null = no assessment yet. */
  processingStatus: string | null
  assessmentNumber: string | null
  verificationUrl: string | null
  numbersAssetId: string | null
  /** updated_at from assessments row, set when status is SIGNED or DELIVERED. */
  signedAt: string | null
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
  workbookData,
  hasSourceVideo,
  hasReportPdf,
  hasNumbersKey,
  processingStatus,
  assessmentNumber,
  verificationUrl,
  numbersAssetId,
  signedAt,
}: SignAndDeliverPanelProps) {
  const router = useRouter()
  const [signing, setSigning] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const workbookSignedOff = !!(workbookData?.section_6?.signed_off === true)
  const prereqsMet = hasSourceVideo && hasReportPdf && workbookSignedOff

  const isSigned    = processingStatus === 'SIGNED' || processingStatus === 'DELIVERED'
  const isDelivered = processingStatus === 'DELIVERED'
  const isFailed    = processingStatus === 'FAILED'
  const isSigningInProgress = processingStatus === 'SIGNING' || signing

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
    if (!verificationUrl) return
    await navigator.clipboard.writeText(verificationUrl)
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
              {isDelivered ? 'Delivered' : 'Assessment issued'}
            </span>
          </div>

          <div className="text-xs text-gray-500">
            Signed: {formatSignedAt(signedAt)}
          </div>

          {assessmentNumber && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">Assessment number</div>
              <div className="text-xs font-mono text-gray-700">{assessmentNumber}</div>
            </div>
          )}

          {verificationUrl && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">Verification Page</div>
              <div className="flex items-center gap-2">
                <a
                  href={verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-1 min-w-0"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{verificationUrl}</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyVerifyUrl}
                  className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                  title="Copy URL"
                >
                  {copied
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    : <Copy className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>
          )}

          {numbersAssetId && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">
                {hasNumbersKey ? 'Numbers Protocol CID' : 'Provenance ID (mock)'}
              </div>
              <div className="text-xs font-mono text-gray-500 break-all">{numbersAssetId}</div>
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

          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── Failed state — show retry ────────────────────────────────────────────
  if (isFailed && !signing) {
    return (
      <Card className="border-2" style={{ borderColor: 'rgba(239,68,68,0.25)', backgroundColor: '#fff5f5' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 flex-shrink-0" style={{ color: '#dc2626' }} />
            Sign &amp; Deliver
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-red-700">Signing failed</span>
          </div>
          <p className="text-xs text-gray-500">
            The previous signing attempt failed. The assessment record is preserved — retry to resume from where it stopped.
          </p>
          <Button
            size="sm"
            className="w-full text-white"
            style={{ backgroundColor: '#C8900A' }}
            onClick={handleSign}
            disabled={signing}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            {signing ? 'Retrying…' : 'Retry Signing'}
          </Button>
          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── Not yet signed ──────────────────────────────────────────────────────
  const borderColor = prereqsMet ? 'rgba(200,144,10,0.35)' : 'rgba(0,0,0,0.08)'
  const bgColor = prereqsMet ? '#fffbf0' : 'white'

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

        {/* Provider status — informational, not a blocker */}
        <div className="flex items-start gap-2 p-2 rounded text-xs"
          style={{
            backgroundColor: hasNumbersKey ? 'rgba(22,163,74,0.06)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${hasNumbersKey ? 'rgba(22,163,74,0.2)' : 'rgba(245,158,11,0.25)'}`,
          }}
        >
          <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: hasNumbersKey ? '#16a34a' : '#b45309' }} />
          <span style={{ color: hasNumbersKey ? '#15803d' : '#92400E' }}>
            {hasNumbersKey
              ? 'Numbers Protocol key configured — will sign with live provider.'
              : <>Mock mode — add <code className="font-mono bg-amber-50 px-0.5 rounded">NUMBERS_API_KEY</code> to Vercel env vars for live signing.</>
            }
          </span>
        </div>

        {/* Sign button */}
        <Button
          size="sm"
          className="w-full text-white"
          style={{ backgroundColor: prereqsMet && !isSigningInProgress ? '#C8900A' : undefined }}
          onClick={handleSign}
          disabled={!prereqsMet || isSigningInProgress}
        >
          <Shield className="w-3.5 h-3.5 mr-2" />
          {isSigningInProgress ? 'Signing…' : 'Issue Assessment'}
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
          Creates assessment record → computes PDF SHA-256 → embeds C2PA credentials in source MP4 → stores signed asset.
        </p>
      </CardContent>
    </Card>
  )
}
