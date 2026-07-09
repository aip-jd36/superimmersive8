'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Video, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'

interface SourceVideoUploadProps {
  submissionId: string
  initialVideoUrl: string | null
  initialVideoFilename: string | null
}

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
const MAX_BYTES = 524288000 // 500 MB

export function SourceVideoUpload({ submissionId, initialVideoUrl, initialVideoFilename }: SourceVideoUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [filename, setFilename] = useState<string | null>(initialVideoFilename)
  const [hasVideo, setHasVideo] = useState(!!initialVideoUrl)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be re-selected after an error
    e.target.value = ''

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMessage('Unsupported format. Upload MP4, MOV, AVI, or WebM.')
      setStatus('error')
      return
    }
    if (file.size > MAX_BYTES) {
      setErrorMessage('File exceeds 500 MB limit.')
      setStatus('error')
      return
    }

    setStatus('uploading')
    setErrorMessage('')

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'

      // Step 1: Get signed upload URL from server
      const urlRes = await fetch(`/api/admin/submissions/${submissionId}/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'source-videos', fileExt: ext }),
      })
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to get upload URL')
      }
      const { signedUrl, path } = await urlRes.json()

      // Step 2: PUT file directly to Supabase Storage via signed URL
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error(`Storage upload failed (${uploadRes.status})`)

      // Step 3: Record the path in the submissions row
      const dbRes = await fetch(`/api/admin/submissions/${submissionId}/delivery-files`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_video_url: path, source_video_filename: file.name }),
      })
      if (!dbRes.ok) throw new Error('Failed to save file reference')

      setFilename(file.name)
      setHasVideo(true)
      setStatus('success')
      router.refresh()
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed — please try again.')
      setStatus('error')
    }
  }

  const borderColor = hasVideo ? 'rgba(22,163,74,0.25)' : 'rgba(0,0,0,0.08)'
  const bgColor = hasVideo ? '#f0fdf4' : 'white'

  return (
    <Card className="border-2" style={{ borderColor, backgroundColor: bgColor }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Video className="w-4 h-4 flex-shrink-0" style={{ color: '#C8900A' }} />
          Source Video (Raw MP4)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasVideo ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium text-green-800">Video on file</span>
            </div>
            <div className="text-xs text-gray-600 font-mono bg-white border rounded px-2 py-1.5 break-all"
              style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              {filename}
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={status === 'uploading'}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              Replace file
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Upload the creator&apos;s raw MP4 before signing. Request it via email after payment clears.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={status === 'uploading'}
            >
              <Upload className="w-4 h-4 mr-2" />
              {status === 'uploading' ? 'Uploading…' : 'Upload MP4 / MOV'}
            </Button>
            <p className="text-xs text-gray-400">Max 500 MB · MP4, MOV, AVI, WebM</p>
          </>
        )}

        {status === 'uploading' && (
          <p className="text-xs text-gray-500 animate-pulse">Uploading — do not close this tab…</p>
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
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.webm"
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}
