'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Loader2, Download } from 'lucide-react'

type Props = {
  submissionId: string
  catalogId: string | null
  currentStatus: string
  existingRightsPackage?: {
    id: string
    pdf_url: string | null
    created_at: string
  } | null
}

export function GenerateRightsPackageButton({
  submissionId,
  catalogId,
  currentStatus,
  existingRightsPackage
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Can only generate if approved and has catalog ID
  const canGenerate = currentStatus === 'approved' && catalogId && !existingRightsPackage

  const handleGenerate = async () => {
    if (!confirm('Generate Chain of Title document? All fields will be auto-populated from submission data.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}/generate-rights-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogId }),
      })

      if (response.ok) {
        alert('Chain of Title generated successfully!')
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to generate Rights Package'}`)
      }
    } catch (error) {
      console.error('Error generating Rights Package:', error)
      alert('An error occurred while generating the Rights Package')
    } finally {
      setLoading(false)
    }
  }

  // If Rights Package already exists, show download button
  if (existingRightsPackage) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Chain of Title Generated
          </CardTitle>
          <CardDescription className="text-green-700">
            Created on {new Date(existingRightsPackage.created_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingRightsPackage.pdf_url ? (
            <Button asChild className="w-full">
              <a href={existingRightsPackage.pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-2" />
                Download Chain of Title
              </a>
            </Button>
          ) : (
            <p className="text-sm text-gray-600">Document generation in progress...</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={canGenerate ? 'border-blue-200 bg-blue-50' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Chain of Title
        </CardTitle>
        <CardDescription>
          {!canGenerate && !catalogId && 'Approval required first'}
          {!canGenerate && catalogId && 'Not yet generated'}
          {canGenerate && 'Ready to generate (auto-populated from submission)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canGenerate ? (
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Chain of Title
              </>
            )}
          </Button>
        ) : (
          <Button disabled className="w-full">
            <FileText className="w-4 h-4 mr-2" />
            {!catalogId ? 'Approve First' : 'Already Generated'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
