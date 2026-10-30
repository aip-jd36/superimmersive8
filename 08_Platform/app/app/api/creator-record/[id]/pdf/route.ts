/**
 * GET /api/creator-record/[id]/pdf   (CR-ARTIFACT-1)
 *
 * Authenticated delivery of a submission's Creator Record PDF to its owner or
 * an admin. Contract and logging rules: lib/creator-record-artifacts/deliver.ts.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deliverCreatorRecordPdf, type LegacyReference } from '@/lib/creator-record-artifacts/deliver'
import { ArtifactStoreError, artifactTable, isObjectNotFound, privateObjectStore } from '@/lib/creator-record-artifacts/store'

/**
 * CR-LEGACY-DOCUMENT-SECURITY-1C — historical (pre-artifact) Creator Record PDFs stay exactly where the legacy
 * generator wrote them. This route reads them server-side (service role, so it works whether or not the bucket
 * is public) and only after deliverCreatorRecordPdf has authorized the caller and validated the reference.
 * Read-only: there is no write, signed URL or public URL here, and no artifact row is ever created.
 * Kept out of lib/creator-record-artifacts, whose modules never touch the public bucket.
 */
const LEGACY_DOCUMENTS_BUCKET = 'documents'

async function getLegacyObject(path: string): Promise<Uint8Array | null> {
  const { data, error } = await supabaseAdmin.storage.from(LEGACY_DOCUMENTS_BUCKET).download(path)
  if (error) {
    if (isObjectNotFound(error)) return null
    throw new ArtifactStoreError('legacy_download', undefined)
  }
  return new Uint8Array(await data.arrayBuffer())
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return deliverCreatorRecordPdf(params.id, {
    async currentUserId() {
      const { data, error } = await createClient().auth.getUser()
      return error || !data?.user ? null : data.user.id
    },
    async submissionOwner(submissionId) {
      const { data, error } = await supabaseAdmin.from('submissions').select('user_id, tier').eq('id', submissionId).maybeSingle()
      if (error) throw new Error('creator_record_pdf_owner_lookup_failed')
      return data && (data as { tier?: string }).tier === 'creator_record' ? ((data as { user_id: string }).user_id ?? null) : null
    },
    async isAdmin(userId) {
      const { data } = await supabaseAdmin.from('users').select('is_admin').eq('id', userId).maybeSingle()
      return !!(data as { is_admin?: boolean } | null)?.is_admin
    },
    // CR-ARTIFACT-1C: fail closed — any error (including a missing table) propagates → 500, never "no artifact".
    findArtifact: (submissionId) => artifactTable.find(submissionId),
    getObject: (path) => privateObjectStore.get(path),
    // CR-LEGACY-DOCUMENT-SECURITY-1C: every reference is returned (not maybeSingle) so ambiguity is detected;
    // a lookup error propagates → 500, never "no document". Read only after the owner/admin check above.
    async legacyReferences(submissionId) {
      const { data, error } = await supabaseAdmin
        .from('rights_packages').select('submission_id, document_path, document_url').eq('submission_id', submissionId)
      if (error) throw new Error('creator_record_legacy_reference_lookup_failed')
      return (data ?? []) as LegacyReference[]
    },
    getLegacyObject,
    log: (event) => console.info('creator_record_pdf_delivery', event),
  })
}
