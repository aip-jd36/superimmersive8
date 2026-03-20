-- Migration: Setup submission-files storage bucket and RLS policies
-- Created: 2026-03-20
-- Description: Creates private storage bucket for creator file uploads (receipts, screenshots, audio docs)

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

-- Insert bucket into storage.buckets table
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-files',
  'submission-files',
  false, -- Private bucket
  10485760, -- 10 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. ENABLE RLS ON STORAGE.OBJECTS
-- =====================================================

-- Enable Row Level Security on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE RLS POLICIES FOR submission-files BUCKET
-- =====================================================

-- Policy 1: Creators can upload files to their own folder
CREATE POLICY "Creators can upload submission files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Creators can read their own files
CREATE POLICY "Creators can read their own submission files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Admins can read all files
CREATE POLICY "Admins can read all submission files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files'
  AND (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Policy 4: Admins can delete files
CREATE POLICY "Admins can delete submission files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-files'
  AND (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Policy 5: Creators can update their own files
CREATE POLICY "Creators can update their own submission files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'submission-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- 4. UPDATE rights_packages TABLE (Add PDF columns)
-- =====================================================

-- Add columns for PDF storage (if they don't exist)
ALTER TABLE rights_packages
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS document_path text,
ADD COLUMN IF NOT EXISTS generated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS format varchar(10) DEFAULT 'pdf';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rights_packages_submission_id
ON rights_packages(submission_id);

CREATE INDEX IF NOT EXISTS idx_rights_packages_catalog_id
ON rights_packages(catalog_id);

-- =====================================================
-- VERIFICATION QUERIES (commented out - for reference)
-- =====================================================

-- Verify bucket created:
-- SELECT * FROM storage.buckets WHERE id = 'submission-files';

-- Verify policies created:
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- AND policyname LIKE '%submission files%';

-- Verify rights_packages columns:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'rights_packages';
