# Supabase Storage Setup for Submission Files

**Required for:** Creator submission form file uploads (receipts, screenshots, audio documentation)

---

## Overview

Three types of files need to be uploaded during submission:
1. **Tool Plan Receipts** (REQUIRED) - Proof of paid commercial plans
2. **Process Screenshots** (OPTIONAL) - Documentation of creative process
3. **Audio Documentation** (CONDITIONAL) - If audio source is "Licensed"

**Storage Strategy:** Create a private `submission-files` bucket that only creators (for their own submissions) and admins can access.

---

## Storage Bucket Setup

### Step 1: Create `submission-files` Bucket

**In Supabase Dashboard:**

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets
2. Click "New bucket"
3. Configure:
   ```
   Name: submission-files
   Public bucket: NO (unchecked) - files should be private
   File size limit: 10 MB per file
   Allowed MIME types: image/jpeg, image/png, application/pdf
   ```
4. Click "Create bucket"

---

## RLS Policies for `submission-files` Bucket

**Security Model:**
- Creators can upload files for their own submissions
- Creators can read/download their own files
- Admins can read all files
- Admins can delete files (cleanup after rejection)

### Policy 1: Creator Upload Access
```sql
CREATE POLICY "Creators can upload submission files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Explanation:** Allows authenticated users to upload files, but only to folders matching their user ID (e.g., `{user_id}/receipts/...`)

### Policy 2: Creator Read Own Files
```sql
CREATE POLICY "Creators can read their own submission files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3: Admin Read All Files
```sql
CREATE POLICY "Admins can read all submission files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);
```

### Policy 4: Admin Delete Files
```sql
CREATE POLICY "Admins can delete submission files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);
```

### Policy 5: Creator Update Own Files (for replacements)
```sql
CREATE POLICY "Creators can update their own submission files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## File Structure

Files will be organized by user ID and file type:

```
submission-files/
├── {user_id}/
│   ├── receipts/
│   │   ├── receipt-runway-2026-02-18-abc123.pdf
│   │   ├── receipt-sora-2026-02-18-def456.jpg
│   │   └── receipt-kling-2026-02-18-ghi789.png
│   ├── screenshots/
│   │   ├── process-screenshot-1-jkl012.jpg
│   │   ├── process-screenshot-2-mno345.png
│   │   └── process-screenshot-3-pqr678.jpg
│   └── audio-docs/
│       └── audio-license-stu901.pdf
```

**Naming Convention:**
- Receipts: `receipt-{tool-name}-{timestamp}-{random}.{ext}`
- Screenshots: `process-screenshot-{index}-{random}.{ext}`
- Audio docs: `audio-license-{random}.{ext}`

**User ID Prefix:** All files must be prefixed with the creator's user ID to enforce RLS policies.

---

## Complete SQL Setup Script

Run this in Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Creator upload access
CREATE POLICY "Creators can upload submission files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Creator read own files
CREATE POLICY "Creators can read their own submission files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Admin read all files
CREATE POLICY "Admins can read all submission files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Policy 4: Admin delete files
CREATE POLICY "Admins can delete submission files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Policy 5: Creator update own files
CREATE POLICY "Creators can update their own submission files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## File Upload Implementation

### Submission Form Integration

**When creator submits:**
1. Files are uploaded to Supabase Storage during form submission
2. File paths/URLs are stored in `submissions.supporting_materials` JSONB field
3. Format:
   ```json
   {
     "receipts": [
       {
         "name": "receipt-runway-2026-02-18-abc123.pdf",
         "path": "user_id/receipts/receipt-runway-2026-02-18-abc123.pdf",
         "url": "https://...supabase.co/storage/v1/object/authenticated/submission-files/...",
         "size": 245678,
         "uploaded_at": "2026-02-18T10:30:00Z"
       }
     ],
     "screenshots": [...],
     "audio_docs": [...]
   }
   ```

### File Validation

**Client-side validation:**
- File type: PDF, JPG, PNG only
- File size: Max 10 MB per file
- Total files: Max 20 files per submission

**Server-side validation:**
- Re-validate file types and sizes
- Scan file names for security (no path traversal)
- Generate secure random file names

---

## Testing Checklist

### Test 1: Creator Upload
- [ ] Log in as creator (non-admin)
- [ ] Navigate to submission form
- [ ] Upload receipt (PDF) → Should succeed
- [ ] Upload screenshot (JPG) → Should succeed
- [ ] Try to upload 15MB file → Should fail with error message
- [ ] Try to upload .exe file → Should fail with error message

### Test 2: Creator Access Control
- [ ] Creator A uploads files
- [ ] Log in as Creator B
- [ ] Try to access Creator A's files via direct URL → Should fail (403 Forbidden)

### Test 3: Admin Access
- [ ] Log in as admin
- [ ] Navigate to submission detail page
- [ ] View uploaded receipts → Should succeed
- [ ] Download receipt → Should succeed
- [ ] View screenshots → Should succeed

### Test 4: File Download (Authenticated URLs)
- [ ] Creator downloads their own uploaded receipt → Should succeed
- [ ] Admin downloads any creator's receipt → Should succeed
- [ ] Unauthenticated user tries to access file URL → Should fail

---

## Security Considerations

**Private Bucket Benefits:**
- Receipts contain payment info (sensitive)
- Screenshots may show creative process (intellectual property)
- Only authenticated creators and admins should access

**RLS Policy Enforcement:**
- User ID folder structure enforces access control
- storage.foldername() extracts folder path for policy checks
- Admins bypass folder restrictions via is_admin check

**File Name Randomization:**
- Add random suffix to prevent enumeration attacks
- Prevents guessing file names to access unauthorized files

---

## Troubleshooting

### Error: "Permission denied" on upload
**Cause:** File path doesn't start with user's ID
**Fix:** Ensure upload path is `{userId}/receipts/...`

### Error: "Bucket not found"
**Cause:** Bucket name mismatch
**Fix:** Verify bucket name is exactly `submission-files` (lowercase, hyphen)

### Error: "File type not allowed"
**Cause:** MIME type validation
**Fix:** Check allowed types in bucket settings: `image/jpeg, image/png, application/pdf`

### Error: "File size exceeds limit"
**Cause:** File > 10 MB
**Fix:** Compress image or reduce PDF size before upload

### Downloaded file URL returns 403
**Cause:** Bucket is private, need authenticated URL
**Fix:** Use `supabase.storage.from('submission-files').createSignedUrl()` for temporary download links

---

## Signed URL Generation (for Downloads)

Since the bucket is private, download URLs must be signed:

```typescript
// Generate signed URL (valid for 1 hour)
const { data, error } = await supabase.storage
  .from('submission-files')
  .createSignedUrl('user_id/receipts/receipt-runway.pdf', 3600)

if (data) {
  console.log('Download URL:', data.signedUrl)
}
```

**Expiration:** Signed URLs expire after specified time (3600 seconds = 1 hour)

---

## Environment Variables

Uses existing Supabase configuration:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

No additional environment variables needed.

---

## Future Enhancements

**Phase 2:**
- Virus scanning for uploaded files
- Image compression/optimization on upload
- OCR for receipt text extraction (auto-fill tool names)
- Bulk file upload (drag multiple files at once)

**Phase 3:**
- Video file uploads (for full film submission)
- Cloud storage migration (S3/Cloudflare R2) if cost becomes issue
- CDN integration for faster downloads

---

**Setup Status:**
- [ ] `submission-files` bucket created
- [ ] Bucket set to private (not public)
- [ ] All 5 RLS policies configured
- [ ] File upload component implemented
- [ ] Test upload successful (creator)
- [ ] Test access control (creator can't see other creators' files)
- [ ] Test admin access (admin can see all files)
- [ ] Signed URL download working

**Last updated:** March 20, 2026
