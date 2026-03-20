'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X, Upload, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'

interface UploadedFile {
  name: string
  path: string
  url: string
  size: number
  type: string
  uploaded_at: string
}

interface FileUploadProps {
  label: string
  description?: string
  accept?: string // e.g., "image/*,.pdf"
  maxSize?: number // in bytes, default 10MB
  maxFiles?: number // default unlimited
  required?: boolean
  folder: 'receipts' | 'screenshots' | 'audio-docs' // subfolder in submission-files bucket
  userId: string
  onFilesChange: (files: UploadedFile[]) => void
  initialFiles?: UploadedFile[]
}

export default function FileUpload({
  label,
  description,
  accept = 'image/jpeg,image/png,application/pdf',
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles,
  required = false,
  folder,
  userId,
  onFilesChange,
  initialFiles = [],
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Generate random suffix for file names
  const generateRandomSuffix = () => {
    return Math.random().toString(36).substring(2, 8)
  }

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File "${file.name}" exceeds ${formatFileSize(maxSize)} limit`
    }

    // Check file type
    const acceptedTypes = accept.split(',').map(t => t.trim())
    const fileType = file.type
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExt === type
      }
      if (type.endsWith('/*')) {
        const category = type.split('/')[0]
        return fileType.startsWith(category + '/')
      }
      return fileType === type
    })

    if (!isAccepted) {
      return `File type "${file.type}" not allowed. Accepted: ${accept}`
    }

    return null
  }

  // Upload file to Supabase Storage
  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    try {
      // Get user ID from session at upload time (avoids timing issues with prop)
      const { data: { user } } = await supabase.auth.getUser()
      const uploadUserId = user?.id || userId
      if (!uploadUserId) {
        throw new Error('Not authenticated')
      }

      // Generate secure file name
      const timestamp = new Date().toISOString().split('T')[0]
      const randomSuffix = generateRandomSuffix()
      const fileExt = file.name.split('.').pop()
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase()

      const fileName = `${folder}-${timestamp}-${randomSuffix}.${fileExt}`
      const filePath = `${uploadUserId}/${folder}/${fileName}`

      console.log('📤 Uploading file:', filePath)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('submission-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      console.log('✅ Upload successful:', data)

      // Get public URL (will require signed URL for actual access since bucket is private)
      const { data: urlData } = supabase.storage
        .from('submission-files')
        .getPublicUrl(filePath)

      const uploadedFile: UploadedFile = {
        name: file.name,
        path: filePath,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type,
        uploaded_at: new Date().toISOString(),
      }

      return uploadedFile
    } catch (err: any) {
      console.error('Error uploading file:', err)
      throw new Error(`Upload failed: ${err.message}`)
    }
  }

  // Handle file selection
  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    setError(null)
    setUploading(true)

    try {
      // Check max files limit
      if (maxFiles && files.length + selectedFiles.length > maxFiles) {
        throw new Error(`Maximum ${maxFiles} files allowed`)
      }

      const filesToUpload = Array.from(selectedFiles)

      // Validate all files first
      for (const file of filesToUpload) {
        const validationError = validateFile(file)
        if (validationError) {
          throw new Error(validationError)
        }
      }

      // Upload all files
      const uploadPromises = filesToUpload.map(file => uploadFile(file))
      const uploadedFiles = await Promise.all(uploadPromises)

      // Filter out any null results (failed uploads)
      const successfulUploads = uploadedFiles.filter(
        (f): f is UploadedFile => f !== null
      )

      // Update state
      const newFiles = [...files, ...successfulUploads]
      setFiles(newFiles)
      onFilesChange(newFiles)

      console.log('✅ All files uploaded successfully:', successfulUploads)
    } catch (err: any) {
      setError(err.message)
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle file remove
  const handleRemove = async (fileToRemove: UploadedFile) => {
    try {
      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from('submission-files')
        .remove([fileToRemove.path])

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      // Update state
      const newFiles = files.filter(f => f.path !== fileToRemove.path)
      setFiles(newFiles)
      onFilesChange(newFiles)
    } catch (err: any) {
      setError(`Failed to delete file: ${err.message}`)
    }
  }

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [files, maxFiles])

  // Get file icon based on type
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {maxFiles && (
          <span className="text-xs text-gray-500">
            {files.length} / {maxFiles} files
          </span>
        )}
      </div>

      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors
          ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={!maxFiles || maxFiles > 1}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              <span className="text-primary font-medium">Click to upload</span> or
              drag and drop
            </p>
            <p className="text-xs text-gray-500">
              {accept.split(',').join(', ')} (max {formatFileSize(maxSize)})
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-sm font-medium">Uploaded Files:</p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={file.path}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 text-gray-500">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(file)}
                  className="flex-shrink-0 ml-2 text-gray-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
