import { renderToStream } from '@react-pdf/renderer'
import { ChainOfTitlePDF } from './ChainOfTitlePDF'
import { CreatorRecordPDF } from './CreatorRecordPDF'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface Tool {
  tool_name: string
  version: string
  plan_type: string
  start_date: string
  end_date: string
  receipt_url?: string
  receipt_path?: string
}

interface GenerateChainOfTitleParams {
  catalogId: string
  submissionId: string
  filmmakerName: string
  title: string
  tools: Tool[]
  modificationRights: {
    authorized: boolean
    scope?: string
  }
  territory: string
  reviewedBy?: string
  riskRating?: 'low' | 'standard' | 'elevated' | 'high'
  riskNotes?: string
}

/**
 * Generate Chain of Title PDF and upload to Supabase Storage
 * @returns URL of uploaded PDF or null if error
 */
export async function generateChainOfTitlePDF(
  params: GenerateChainOfTitleParams
): Promise<string | null> {
  try {
    console.log('📄 Generating Chain of Title PDF for', params.catalogId)

    // Prepare data for PDF
    const pdfData = {
      catalogId: params.catalogId,
      filmmakerName: params.filmmakerName,
      title: params.title,
      reviewedBy: params.reviewedBy || 'SI8 Admin',
      reviewedAt: new Date().toISOString(),
      tier: determineTier(params.tools),
      tools: params.tools,
      modelDisclosure: generateModelDisclosure(params.tools),
      commercialUseAuthorization: generateCommercialUseAuth(params.tools),
      modificationRights: params.modificationRights,
      categoryConflicts: [], // To be determined during review
      territory: params.territory,
      regenerationRights: {
        authorized: params.modificationRights.authorized,
        scenes: params.modificationRights.scope,
      },
      versionHistory: `Original version approved ${new Date().toLocaleDateString('en-US')}`,
      riskRating: params.riskRating,
      riskNotes: params.riskNotes,
    }

    // Generate PDF stream
    const pdfStream = await renderToStream(<ChainOfTitlePDF data={pdfData} />)

    // Convert stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    // Upload to Supabase Storage
    const fileName = `${params.catalogId}_chain-of-title.pdf`
    const filePath = `rights-packages/${fileName}`

    console.log('📤 Uploading PDF to Supabase Storage:', filePath)

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      throw uploadError
    }

    console.log('✅ PDF uploaded successfully:', uploadData)

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(filePath)

    const pdfUrl = urlData.publicUrl

    // Update rights_packages table
    const { error: dbError } = await supabaseAdmin
      .from('rights_packages')
      .upsert({
        submission_id: params.submissionId,
        catalog_id: params.catalogId,
        document_url: pdfUrl,
        document_path: filePath,
        generated_at: new Date().toISOString(),
        format: 'pdf',
        risk_rating: params.riskRating || null,
        risk_notes: params.riskNotes || null,
      })

    if (dbError) {
      console.error('❌ Database update error:', dbError)
      // Don't throw - PDF is uploaded, DB update is secondary
    }

    console.log('✅ Chain of Title PDF generated:', pdfUrl)
    return pdfUrl
  } catch (error) {
    console.error('❌ Error generating Chain of Title PDF:', error)
    return null
  }
}

/**
 * Determine tier based on tools used
 */
function determineTier(tools: Tool[]): 'Certified' | 'Standard' {
  // Certified tier: Only Adobe Firefly
  const hasOnlyFirefly = tools.every(
    (tool) => tool.tool_name.toLowerCase().includes('firefly')
  )

  if (hasOnlyFirefly && tools.length > 0) {
    return 'Certified'
  }

  return 'Standard'
}

/**
 * Generate model disclosure text
 */
function generateModelDisclosure(tools: Tool[]): string {
  const models = tools
    .map((tool) => `${tool.tool_name} (${tool.version})`)
    .join(', ')

  return `This content was generated using the following AI models: ${models}. All models were used during the documented production period with active commercial licenses.`
}

/**
 * Generate commercial use authorization text
 */
function generateCommercialUseAuth(tools: Tool[]): string {
  const allCommercialPlans = tools.every((tool) =>
    ['Pro', 'Plus', 'Team', 'Enterprise'].includes(tool.plan_type)
  )

  if (allCommercialPlans) {
    return `All AI tools used in production were licensed under commercial plans that explicitly permit commercial use and distribution. Plan receipts have been verified and are on file with SI8. This content is cleared for commercial licensing.`
  }

  return `Tool plans have been reviewed. Some tools used free or non-commercial plans. Additional verification required before commercial licensing.`
}

// ─── Creator Record PDF ───────────────────────────────────────────────────────

interface GenerateCreatorRecordParams {
  submissionId: string
  filmmakerName: string
  title: string
  tools: Tool[]
  authorshipStatement?: string
  likenessConfirmation?: Record<string, boolean>
  ipConfirmation?: Record<string, boolean>
  territory?: string
}

/**
 * Auto-generate a Creator Record PDF (self-attested) and upload to Supabase Storage.
 * Triggers automatically from the Stripe webhook on Creator Record payment.
 * Does NOT require admin auth or a catalog ID.
 */
export async function generateCreatorRecordPDF(
  params: GenerateCreatorRecordParams
): Promise<string | null> {
  try {
    // Auto-assign a Creator Record ID: CR-YYYY-{first8ofUUID}
    const year = new Date().getFullYear()
    const shortId = params.submissionId.replace(/-/g, '').slice(0, 8).toUpperCase()
    const creatorRecordId = `CR-${year}-${shortId}`

    console.log('📄 Generating Creator Record PDF:', creatorRecordId)

    const pdfData = {
      creatorRecordId,
      filmmakerName: params.filmmakerName,
      title: params.title,
      issuedAt: new Date().toISOString(),
      tools: params.tools,
      authorshipStatement: params.authorshipStatement,
      likenessConfirmation: params.likenessConfirmation,
      ipConfirmation: params.ipConfirmation,
      territory: params.territory || 'Global',
    }

    // Generate PDF stream
    const pdfStream = await renderToStream(<CreatorRecordPDF data={pdfData} />)

    // Convert stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    // Upload to Supabase Storage
    const fileName = `${creatorRecordId}_creator-record.pdf`
    const filePath = `rights-packages/${fileName}`

    console.log('📤 Uploading Creator Record PDF:', filePath)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('❌ Creator Record upload error:', uploadError)
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(filePath)

    const pdfUrl = urlData.publicUrl

    // Insert into rights_packages table
    // Provide placeholder values for NOT NULL columns — Creator Records are self-attested
    const { error: dbError } = await supabaseAdmin
      .from('rights_packages')
      .upsert({
        submission_id: params.submissionId,
        catalog_id: creatorRecordId,
        document_url: pdfUrl,
        document_path: filePath,
        generated_at: new Date().toISOString(),
        format: 'pdf',
        // Required NOT NULL columns — self-attested values for Creator Record tier
        tool_provenance_log: {
          tools: params.tools.map(t => ({
            name: t.tool_name || 'Unknown',
            version: t.version || 'Not specified',
            plan_type: t.plan_type || 'Not specified',
            self_attested: true,
          })),
          verification_date: new Date().toISOString(),
          tier: 'creator_record',
        },
        model_disclosure: params.tools.length > 0
          ? `Self-declared tools: ${params.tools.map(t => t.tool_name).join(', ')}`
          : 'No AI tools declared',
        rights_verified_signoff: {
          reviewer: 'Self-attested',
          date: new Date().toISOString(),
          tier: 'creator_record',
          status: 'self_attested',
        },
        commercial_use_authorization: {
          authorized: false,
          basis: 'Self-attested Creator Record — NOT FOR COMMERCIAL USE',
          upgrade_required: true,
        },
        modification_rights_status: {
          authorized: false,
          scope: 'Creator Record — not applicable',
        },
        category_conflict_log: [],
        territory_log: params.territory || 'Global',
        regeneration_rights_status: {
          authorized: false,
          scope: 'Creator Record — not applicable',
        },
        version_history: {
          current_version: 'v1.0',
          created_date: new Date().toISOString(),
          changes: [{ version: 'v1.0', date: new Date().toISOString(), description: 'Creator Record auto-generated on payment' }],
        },
      })

    if (dbError) {
      console.error('❌ Creator Record DB error:', dbError)
      // Don't throw — PDF is uploaded, DB update is secondary
    }

    console.log('✅ Creator Record PDF generated:', pdfUrl)
    return pdfUrl
  } catch (error) {
    console.error('❌ Error generating Creator Record PDF:', error)
    return null
  }
}
