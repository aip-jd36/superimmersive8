'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

type Props = {
  submissionId: string
  currentStatus: string
  hasOptIn: boolean
}

export function ApproveRejectButtons({ submissionId, currentStatus, hasOptIn }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [requestedInfo, setRequestedInfo] = useState('')

  const handleApprove = async () => {
    if (!confirm('Approve this submission? This will mark it as approved and notify the creator.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasOptIn }),
      })

      if (response.ok) {
        alert('Submission approved successfully!')
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to approve submission'}`)
      }
    } catch (error) {
      console.error('Error approving:', error)
      alert('An error occurred while approving the submission')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })

      if (response.ok) {
        alert('Submission rejected and creator notified')
        setShowRejectModal(false)
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to reject submission'}`)
      }
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('An error occurred while rejecting the submission')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestInfo = async () => {
    if (!requestedInfo.trim()) {
      alert('Please specify what information is needed')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}/request-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedInfo }),
      })

      if (response.ok) {
        alert('Info request sent to creator')
        setShowRequestInfoModal(false)
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to request info'}`)
      }
    } catch (error) {
      console.error('Error requesting info:', error)
      alert('An error occurred while requesting info')
    } finally {
      setLoading(false)
    }
  }

  const isApproved = currentStatus === 'approved'
  const isRejected = currentStatus === 'rejected'
  const isPending = currentStatus === 'pending' || currentStatus === 'under_review' || currentStatus === 'needs_info'

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Review Actions</CardTitle>
          <CardDescription>
            {isApproved && 'This submission has been approved'}
            {isRejected && 'This submission has been rejected'}
            {isPending && 'Take action on this submission'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPending && (
            <>
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve
              </Button>

              <Button
                onClick={() => setShowRequestInfoModal(true)}
                disabled={loading}
                variant="outline"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Request Info
              </Button>

              <Button
                onClick={() => setShowRejectModal(true)}
                disabled={loading}
                variant="outline"
                className="w-full border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}

          {isApproved && (
            <div className="text-sm text-green-600 flex items-center gap-2 justify-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Approved</span>
            </div>
          )}

          {isRejected && (
            <div className="text-sm text-red-600 flex items-center gap-2 justify-center p-4 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Rejected</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Reject Submission</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejection. This will be sent to the creator.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[120px] focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="E.g., Tool disclosure incomplete, prohibited content detected, etc."
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => setShowRejectModal(false)}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Info Modal */}
      {showRequestInfoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Additional Information</h3>
            <p className="text-sm text-gray-600 mb-4">
              Specify what information is needed. Creator will have 14 days to respond.
            </p>
            <textarea
              value={requestedInfo}
              onChange={(e) => setRequestedInfo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[120px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="E.g., Please provide commercial plan receipts for Runway Pro, expand human authorship statement, etc."
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => setShowRequestInfoModal(false)}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestInfo}
                disabled={loading || !requestedInfo.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4 mr-2" />
                )}
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
