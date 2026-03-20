import { createClient } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Generate a signed URL for downloading a private file from submission-files bucket
 * @param filePath - Full path to file (e.g., "user_id/receipts/receipt-runway.pdf")
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL string or null if error
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.storage
      .from('submission-files')
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      console.error('Error generating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error('Exception generating signed URL:', err)
    return null
  }
}

/**
 * Generate signed URLs for multiple files (admin use)
 * @param filePaths - Array of file paths
 * @param expiresIn - Expiration time in seconds
 * @returns Object mapping file paths to signed URLs
 */
export async function getSignedUrlsAdmin(
  filePaths: string[],
  expiresIn: number = 3600
): Promise<Record<string, string>> {
  try {
    const urlMap: Record<string, string> = {}

    const promises = filePaths.map(async (path) => {
      const { data, error } = await supabaseAdmin.storage
        .from('submission-files')
        .createSignedUrl(path, expiresIn)

      if (data && !error) {
        urlMap[path] = data.signedUrl
      } else {
        console.error(`Error generating signed URL for ${path}:`, error)
      }
    })

    await Promise.all(promises)
    return urlMap
  } catch (err) {
    console.error('Exception generating signed URLs:', err)
    return {}
  }
}

/**
 * Delete a file from submission-files bucket
 * @param filePath - Full path to file
 * @returns true if successful, false otherwise
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('submission-files')
      .remove([filePath])

    if (error) {
      console.error('Error deleting file:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Exception deleting file:', err)
    return false
  }
}

/**
 * Delete multiple files from submission-files bucket (admin use)
 * @param filePaths - Array of file paths
 * @returns Number of successfully deleted files
 */
export async function deleteFilesAdmin(filePaths: string[]): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('submission-files')
      .remove(filePaths)

    if (error) {
      console.error('Error deleting files:', error)
      return 0
    }

    return data?.length || 0
  } catch (err) {
    console.error('Exception deleting files:', err)
    return 0
  }
}

/**
 * Validate file type and size
 * @param file - File object
 * @param allowedTypes - Array of allowed MIME types (e.g., ['image/jpeg', 'application/pdf'])
 * @param maxSize - Maximum file size in bytes (default: 10MB)
 * @returns Error message if invalid, null if valid
 */
export function validateFile(
  file: File,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSize: number = 10 * 1024 * 1024
): string | null {
  // Check file size
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    return `File size exceeds ${maxMB}MB limit`
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`
  }

  // Check file name for security (no path traversal)
  if (file.name.includes('../') || file.name.includes('..\\')) {
    return 'Invalid file name'
  }

  return null
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Generate secure random file name
 * @param originalName - Original file name
 * @param prefix - Optional prefix (e.g., "receipt", "screenshot")
 * @returns Sanitized file name with random suffix
 */
export function generateSecureFileName(
  originalName: string,
  prefix?: string
): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const fileExt = originalName.split('.').pop()?.toLowerCase() || 'file'

  const sanitizedName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
    .replace(`.${fileExt}`, '')
    .substring(0, 30) // Limit length

  const parts = []
  if (prefix) parts.push(prefix)
  parts.push(timestamp, randomSuffix)

  return `${parts.join('-')}.${fileExt}`
}

/**
 * Upload file to submission-files bucket
 * @param file - File to upload
 * @param userId - User ID (for folder structure)
 * @param folder - Subfolder ('receipts', 'screenshots', 'audio-docs')
 * @returns Uploaded file metadata or null if error
 */
export async function uploadSubmissionFile(
  file: File,
  userId: string,
  folder: 'receipts' | 'screenshots' | 'audio-docs'
): Promise<{
  name: string
  path: string
  url: string
  size: number
  type: string
  uploaded_at: string
} | null> {
  try {
    const supabase = createClient()

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    // Generate secure file name
    const fileName = generateSecureFileName(file.name, folder)
    const filePath = `${userId}/${folder}/${fileName}`

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

    // Get public URL (actual access will require signed URL since bucket is private)
    const { data: urlData } = supabase.storage
      .from('submission-files')
      .getPublicUrl(filePath)

    return {
      name: file.name,
      path: filePath,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error('Error uploading file:', err)
    return null
  }
}
