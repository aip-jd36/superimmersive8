-- Storage policies for Rights Package documents
-- Created: March 20, 2026
-- Bucket: documents (must be created first via Dashboard UI)

-- Policy 1: Public read access (anyone can download Chain of Title documents)
CREATE POLICY "Public read access for documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy 2: Admin users can upload documents
CREATE POLICY "Admin users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Policy 3: Admin users can update documents
CREATE POLICY "Admin users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Policy 4: Admin users can delete documents
CREATE POLICY "Admin users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);
