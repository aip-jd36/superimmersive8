'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Field 2: Model Disclosure (TEXT)
    model_disclosure: '',

    // Field 3: Rights Verified Sign-off (reviewer, tier will be auto-filled)
    tier: 'Standard', // Standard or Certified

    // Field 6: Category Conflict Log (TEXT[], comma-separated)
    category_conflicts: '', // e.g., "alcohol, tobacco, firearms"

    // Field 7: Territory (defaults to Global)
    territory: 'Global',
  })

  // Can only generate if approved
  const canGenerate = currentStatus === 'approved' && catalogId && !existingRightsPackage

  const handleGenerate = async () => {
    if (!confirm('Generate Rights Package? This will create the Chain of Title documentation.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}/generate-rights-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId,
          modelDisclosure: formData.model_disclosure,
          tier: formData.tier,
          categoryConflicts: formData.category_conflicts.split(',').map(s => s.trim()).filter(Boolean),
          territory: formData.territory,
        }),
      })

      if (response.ok) {
        alert('Rights Package generated successfully!')
        setShowModal(false)
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
            Rights Package Generated
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
                Download Chain of Title PDF
              </a>
            </Button>
          ) : (
            <p className="text-sm text-gray-600">PDF generation in progress...</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={canGenerate ? 'border-blue-200 bg-blue-50' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Rights Package
          </CardTitle>
          <CardDescription>
            {!canGenerate && !catalogId && 'Approval required first'}
            {!canGenerate && catalogId && 'Rights Package not yet generated'}
            {canGenerate && 'Ready to generate Chain of Title'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canGenerate ? (
            <Button onClick={() => setShowModal(true)} className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Generate Rights Package
            </Button>
          ) : (
            <Button disabled className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              {!catalogId ? 'Approve First' : 'Already Generated'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Generate Rights Package</CardTitle>
              <CardDescription>
                Fill in the Chain of Title details. Most fields are auto-populated from submission data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Field 1: Tool Provenance Log - Auto-populated from submission */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">
                  1. Tool Provenance Log
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  ✓ Auto-populated from submission data
                </p>
              </div>

              {/* Field 2: Model Disclosure */}
              <div>
                <Label htmlFor="model_disclosure">
                  2. Model Disclosure
                </Label>
                <Input
                  id="model_disclosure"
                  placeholder="e.g., Runway Gen-3 Alpha, Midjourney v6"
                  value={formData.model_disclosure}
                  onChange={(e) => setFormData({ ...formData, model_disclosure: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Which AI models/versions were used
                </p>
              </div>

              {/* Field 3: Rights Verified Sign-off - Tier selection */}
              <div>
                <Label htmlFor="tier">
                  3. Rights Verified Tier
                </Label>
                <select
                  id="tier"
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Standard">Standard (Runway/Pika/Sora paid plans)</option>
                  <option value="Certified">Certified (Adobe Firefly only)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Reviewer and date will be auto-filled
                </p>
              </div>

              {/* Field 4: Commercial Use Authorization - Auto-populated */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">
                  4. Commercial Use Authorization
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  ✓ Auto-verified from tool disclosure and paid plan receipts
                </p>
              </div>

              {/* Field 5: Modification Rights Status - Auto-populated */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">
                  5. Modification Rights Status
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  ✓ Auto-populated from submission (Tier 2 authorization)
                </p>
              </div>

              {/* Field 6: Category Conflict Log */}
              <div>
                <Label htmlFor="category_conflicts">
                  6. Category Conflict Log
                </Label>
                <Input
                  id="category_conflicts"
                  placeholder="e.g., alcohol, tobacco, firearms (comma-separated)"
                  value={formData.category_conflicts}
                  onChange={(e) => setFormData({ ...formData, category_conflicts: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Brand categories this content is unsuitable for (leave blank if none)
                </p>
              </div>

              {/* Field 7: Territory */}
              <div>
                <Label htmlFor="territory">
                  7. Territory
                </Label>
                <Input
                  id="territory"
                  value={formData.territory}
                  onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Geographic licensing scope (defaults to Global)
                </p>
              </div>

              {/* Field 8: Regeneration Rights Status - Auto-populated */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">
                  8. Regeneration Rights Status
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  ✓ Auto-populated from modification rights scope
                </p>
              </div>

              {/* Field 9: Version History - Auto-populated */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">
                  9. Version History
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  ✓ Initial version v1.0, generated today
                </p>
              </div>

              {/* Catalog ID Display */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label className="text-sm font-medium text-blue-800">
                  Catalog ID
                </Label>
                <p className="text-lg font-mono text-blue-600 mt-1">
                  {catalogId}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Rights Package
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
