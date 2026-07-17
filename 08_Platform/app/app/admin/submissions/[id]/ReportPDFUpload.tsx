'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'

interface ReportPDFUploadProps {
  submissionId: string
  initialReportUrl: string | null
}

const MAX_BYTES = 52428800 // 50 MB

export function ReportPDFUpload({ submissionId, initialReportUrl }: ReportPDFUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [hasReport, setHasReport] = useState(!!initialReportUrl)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.type !== 'application/pdf') {
      setErrorMessage('Only PDF files are accepted.')
      setStatus('error')
      return
    }
    if (file.size > MAX_BYTES) {
      setErrorMessage('File exceeds 50 MB limit.')
      setStatus('error')
      return
    }

    setStatus('uploading')
    setErrorMessage('')

    try {
      // Step 1: Get signed upload URL
      const urlRes = await fetch(`/api/admin/submissions/${submissionId}/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'report-pdfs' }),
      })
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to get upload URL')
      }
      const { signedUrl, path } = await urlRes.json()

      // Step 2: Upload to Supabase Storage
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: file,
      })
      if (!uploadRes.ok) throw new Error(`Storage upload failed (${uploadRes.status})`)

      // Step 3: Bind the uploaded file to its canonical assessment (hashes
      // it, records report_pdf_assessment_id, transitions the assessment to
      // REPORT_GENERATED). Requires Generate Report to have already been run
      // in the workbook — that's what creates the assessment this binds to.
      const dbRes = await fetch(`/api/admin/submissions/${submissionId}/record-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      if (!dbRes.ok) {
        const err = await dbRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to bind uploaded report to its assessment')
      }

      setHasReport(true)
      setStatus('success')
      router.refresh()
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed — please try again.')
      setStatus('error')
    }
  }

  const borderColor = hasReport ? 'rgba(22,163,74,0.25)' : 'rgba(0,0,0,0.08)'
  const bgColor = hasReport ? '#f0fdf4' : 'white'

  return (
    <Card className="border-2" style={{ borderColor, backgroundColor: bgColor }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#C8900A' }} />
          Assessment Report (PDF)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasReport ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium text-green-800">Report uploaded</span>
            </div>
            <p className="text-xs text-gray-500">
              Bound to its assessment and hashed. Sign &amp; Deliver validates this binding before
              Numbers Protocol signing — re-upload here if you regenerate the report.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={status === 'uploading'}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              Replace PDF
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Upload the final Assessment Report PDF exported from Typst. This must be locked before signing.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={status === 'uploading'}
            >
              <Upload className="w-4 h-4 mr-2" />
              {status === 'uploading' ? 'Uploading…' : 'Upload PDF'}
            </Button>
            <p className="text-xs text-gray-400">Max 50 MB · PDF only</p>
          </>
        )}

        {status === 'uploading' && (
          <p className="text-xs text-gray-500 animate-pulse">Uploading…</p>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}
