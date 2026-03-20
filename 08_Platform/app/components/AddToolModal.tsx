'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'
import FileUpload from '@/components/FileUpload'

interface UploadedFile {
  name: string
  path: string
  url: string
  size: number
  type: string
  uploaded_at: string
}

export interface Tool {
  id: string // Unique ID for edit/remove
  toolName: string
  toolNameOther?: string // If "Other" is selected
  version: string
  planType: string
  startDate: string
  endDate: string
  receipt: UploadedFile | null
}

interface AddToolModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (tool: Tool) => void
  editTool?: Tool | null // If editing, this will be populated
  userId: string
}

export default function AddToolModal({
  isOpen,
  onClose,
  onSave,
  editTool,
  userId,
}: AddToolModalProps) {
  const [toolName, setToolName] = useState('')
  const [toolNameOther, setToolNameOther] = useState('')
  const [version, setVersion] = useState('')
  const [planType, setPlanType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [receipt, setReceipt] = useState<UploadedFile | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pre-fill form if editing
  useEffect(() => {
    if (editTool) {
      setToolName(editTool.toolName)
      setToolNameOther(editTool.toolNameOther || '')
      setVersion(editTool.version)
      setPlanType(editTool.planType)
      setStartDate(editTool.startDate)
      setEndDate(editTool.endDate)
      setReceipt(editTool.receipt)
    } else {
      // Reset form for new tool
      setToolName('')
      setToolNameOther('')
      setVersion('')
      setPlanType('')
      setStartDate('')
      setEndDate('')
      setReceipt(null)
    }
    setErrors({})
  }, [editTool, isOpen])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!toolName) {
      newErrors.toolName = 'Tool name is required'
    }

    if (toolName === 'Other' && !toolNameOther.trim()) {
      newErrors.toolNameOther = 'Please specify the tool name'
    }

    if (!version.trim()) {
      newErrors.version = 'Version/model is required'
    }

    if (!planType) {
      newErrors.planType = 'Plan type is required'
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'End date must be after start date'
    }

    if (!receipt) {
      newErrors.receipt = 'Receipt upload is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validate()) return

    const tool: Tool = {
      id: editTool?.id || Math.random().toString(36).substr(2, 9),
      toolName,
      toolNameOther: toolName === 'Other' ? toolNameOther : undefined,
      version,
      planType,
      startDate,
      endDate,
      receipt,
    }

    onSave(tool)
    onClose()
  }

  const handleFileChange = (files: UploadedFile[]) => {
    // Only take the first file (one receipt per tool)
    if (files.length > 0) {
      setReceipt(files[0])
    } else {
      setReceipt(null)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              {editTool ? 'Edit Tool' : 'Add Tool'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Tool Name */}
            <div>
              <Label htmlFor="toolName">Tool Name *</Label>
              <select
                id="toolName"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="">Select tool...</option>
                <option value="Runway Gen-3">Runway Gen-3</option>
                <option value="Sora">Sora (OpenAI)</option>
                <option value="Kling AI">Kling AI</option>
                <option value="Pika">Pika</option>
                <option value="Veo">Veo (Google)</option>
                <option value="Midjourney Video">Midjourney Video</option>
                <option value="ElevenLabs">ElevenLabs (Audio)</option>
                <option value="Synthesia">Synthesia</option>
                <option value="Other">Other (specify below)</option>
              </select>
              {errors.toolName && (
                <p className="text-sm text-red-500 mt-1">{errors.toolName}</p>
              )}
            </div>

            {/* Tool Name Other */}
            {toolName === 'Other' && (
              <div>
                <Label htmlFor="toolNameOther">Specify Tool Name *</Label>
                <Input
                  id="toolNameOther"
                  value={toolNameOther}
                  onChange={(e) => setToolNameOther(e.target.value)}
                  placeholder="e.g., Luma Dream Machine, Custom Tool"
                />
                {errors.toolNameOther && (
                  <p className="text-sm text-red-500 mt-1">{errors.toolNameOther}</p>
                )}
              </div>
            )}

            {/* Version/Model */}
            <div>
              <Label htmlFor="version">Version / Model *</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., Gen-3 Alpha, v1.5, GPT-4o"
              />
              <p className="text-xs text-gray-500 mt-1">
                Specify the model version used during production
              </p>
              {errors.version && (
                <p className="text-sm text-red-500 mt-1">{errors.version}</p>
              )}
            </div>

            {/* Plan Type */}
            <div>
              <Label htmlFor="planType">Plan Type *</Label>
              <select
                id="planType"
                value={planType}
                onChange={(e) => setPlanType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="">Select plan type...</option>
                <option value="Pro">Pro</option>
                <option value="Plus">Plus</option>
                <option value="Team">Team</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Free">Free (not recommended for commercial use)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Commercial plans required for Rights Verified approval
              </p>
              {errors.planType && (
                <p className="text-sm text-red-500 mt-1">{errors.planType}</p>
              )}
            </div>

            {/* Production Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Production Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>
                )}
              </div>
              <div>
                <Label htmlFor="endDate">Production End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Receipt Upload */}
            <div>
              <FileUpload
                label="Plan Receipt"
                description="Upload proof of paid commercial plan (PDF, JPG, or PNG)"
                accept="image/jpeg,image/png,application/pdf"
                maxSize={10 * 1024 * 1024}
                maxFiles={1}
                required={true}
                folder="receipts"
                userId={userId}
                onFilesChange={handleFileChange}
                initialFiles={receipt ? [receipt] : []}
              />
              {errors.receipt && (
                <p className="text-sm text-red-500 mt-1">{errors.receipt}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              {editTool ? 'Save Changes' : 'Add Tool'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
