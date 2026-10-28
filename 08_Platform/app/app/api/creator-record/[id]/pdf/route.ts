/**
 * GET /api/creator-record/[id]/pdf   (CR-ARTIFACT-1)
 *
 * Authenticated delivery of a submission's Creator Record PDF to its owner or
 * an admin. Contract and logging rules: lib/creator-record-artifacts/deliver.ts.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deliverCreatorRecordPdf } from '@/lib/creator-record-artifacts/deliver'
import { artifactTable, privateObjectStore } from '@/lib/creator-record-artifacts/store'

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
    async legacyUrl(submissionId) {
      const { data } = await supabaseAdmin.from('rights_packages').select('document_url').eq('submission_id', submissionId).maybeSingle()
      return ((data as { document_url?: string | null } | null)?.document_url ?? null) || null
    },
    log: (event) => console.info('creator_record_pdf_delivery', event),
  })
}
