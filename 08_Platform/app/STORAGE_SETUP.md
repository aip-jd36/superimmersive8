# Supabase Storage Setup for Rights Packages

**Required for:** Rights Package Chain of Title document storage

---

## Storage Bucket Setup

### 1. Create Storage Bucket

**In Supabase Dashboard:**

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets
2. Click "New bucket"
3. Configure:
   ```
   Name: documents
   Public bucket: YES (checked)
   File size limit: 10 MB
   Allowed MIME types: text/plain, application/pdf
   ```
4. Click "Create bucket"

### 2. Set Up Storage Policies

**Policies needed:**

#### Policy 1: Public Read Access
- **Policy name:** `Public read access for documents`
- **Allowed operation:** SELECT
- **Target roles:** `public`
- **Policy definition:**
  ```sql
  true
  ```

#### Policy 2: Admin Write Access
- **Policy name:** `Admin users can upload documents`
- **Allowed operation:** INSERT
- **Target roles:** `authenticated`
- **Policy definition:**
  ```sql
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
  ```

#### Policy 3: Admin Update Access
- **Policy name:** `Admin users can update documents`
- **Allowed operation:** UPDATE
- **Target roles:** `authenticated`
- **Policy definition:**
  ```sql
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
  ```

#### Policy 4: Admin Delete Access
- **Policy name:** `Admin users can delete documents`
- **Allowed operation:** DELETE
- **Target roles:** `authenticated`
- **Policy definition:**
  ```sql
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
  ```

---

## Quick SQL Script (Alternative)

Run this in Supabase SQL Editor to set up policies:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public read
CREATE POLICY "Public read access for documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy 2: Admin insert
CREATE POLICY "Admin users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Policy 3: Admin update
CREATE POLICY "Admin users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);

-- Policy 4: Admin delete
CREATE POLICY "Admin users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);
```

---

## File Structure

Files will be stored in this structure:

```
documents/
├── rights-packages/
│   ├── SI8-2026-0001_chain-of-title.txt
│   ├── SI8-2026-0002_chain-of-title.txt
│   └── SI8-2026-XXXX_chain-of-title.txt
```

**Naming convention:** `{CATALOG_ID}_chain-of-title.txt`

---

## Testing Storage

### Test Upload (from Admin Panel)

1. Log in as admin
2. Go to approved submission with catalog opt-in
3. Click "Generate Rights Package"
4. Fill out form and submit
5. Check: Download button should appear
6. Click download - Chain of Title document should download

### Test Public URL

Document URLs will be in format:
```
https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/documents/rights-packages/SI8-2026-0001_chain-of-title.txt
```

Test by visiting URL directly - should display or download the text file.

---

## Troubleshooting

### Error: "Bucket not found"
- Check bucket name is exactly `documents` (lowercase, no spaces)
- Verify bucket was created successfully in Supabase dashboard

### Error: "Permission denied"
- Check RLS policies are configured correctly
- Verify admin user has `is_admin = true` in database
- Check authenticated user ID matches policy check

### Error: "File upload failed"
- Check file size is under 10 MB limit
- Verify MIME type is allowed (text/plain or application/pdf)
- Check Supabase project has storage enabled

### Document URL returns 404
- Verify file was uploaded successfully
- Check bucket is public
- Verify public read policy exists
- Check file path format matches: `rights-packages/{catalogId}_chain-of-title.txt`

---

## Future Enhancements

**Current:** Plain text .txt file
**Phase 2:** Styled PDF with SI8 branding
**Phase 3:** Buyer-specific customized PDFs

---

## Environment Variables

No additional env vars needed - Storage uses same Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

**Setup Status:**
- [ ] Storage bucket `documents` created
- [ ] Bucket set to public
- [ ] All 4 RLS policies configured
- [ ] Test upload successful
- [ ] Test download successful
- [ ] Public URL accessible

**Last updated:** March 20, 2026
