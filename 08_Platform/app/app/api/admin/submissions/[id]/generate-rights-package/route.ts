import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateChainOfTitlePDF } from '@/lib/pdf/generateChainOfTitle'

type RouteContext = {
  params: {
    id: string
  }
}

// Auto-determine tier based on tools used
function determineTier(toolsUsed: any[]): string {
  // If all tools are Adobe Firefly, tier is Certified
  // Otherwise, tier is Standard
  const allFirefly = toolsUsed.every((tool: any) => {
    const toolName = (tool.tool || '').toLowerCase()
    return toolName.includes('firefly') || toolName.includes('adobe')
  })

  return allFirefly ? 'Certified' : 'Standard'
}

// Auto-determine category conflicts based on content analysis
// For MVP, this returns empty array (can be enhanced later with AI analysis)
function determineCategoryConflicts(submission: any): string[] {
  // Future: Analyze logline, genre, etc. for category conflicts
  // For now: Return empty array, admin can manually flag later if needed
  return []
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    // Verify admin auth
    const supabase = createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_admin, name, email')
      .eq('id', authUser.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { catalogId } = await request.json()

    if (!catalogId) {
      return NextResponse.json({ error: 'Catalog ID required' }, { status: 400 })
    }

    // Fetch submission with all data
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check if Rights Package already exists
    const { data: existing } = await supabaseAdmin
      .from('rights_packages')
      .select('id')
      .eq('submission_id', params.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Rights Package already exists' }, { status: 400 })
    }

    // Parse submission JSONB fields
    const toolsUsed = submission.tools_used ? JSON.parse(submission.tools_used) : []

    // AUTO-DETERMINE all fields from submission data
    const tier = determineTier(toolsUsed)
    const categoryConflicts = determineCategoryConflicts(submission)
    const modelDisclosure = toolsUsed.map((t: any) => t.tool || 'Unknown').join(', ')

    // Build 9-field Rights Package data (all auto-populated)
    const rightsPackageData = {
      submission_id: params.id,
      catalog_id: catalogId,

      // Field 1: Tool Provenance Log (JSONB) - Auto-populated from submission
      tool_provenance_log: {
        tools: toolsUsed.map((tool: any) => ({
          name: tool.tool || 'Unknown',
          version: tool.version || 'Not specified',
          plan_type: tool.plan_type || 'commercial',
          dates: tool.dates || 'Not specified',
          receipt_verified: true,
        })),
        verification_date: new Date().toISOString(),
      },

      // Field 2: Model Disclosure (TEXT) - Auto-extracted from tools
      model_disclosure: modelDisclosure || 'See tool provenance log',

      // Field 3: Rights Verified Sign-off (JSONB) - Auto-populated with reviewer + tier
      rights_verified_signoff: {
        reviewer: userData.name || userData.email,
        reviewer_email: userData.email,
        date: new Date().toISOString(),
        tier: tier, // Auto-determined: Firefly only = Certified, else = Standard
        status: 'verified',
      },

      // Field 4: Commercial Use Authorization (JSONB) - Auto-populated
      commercial_use_authorization: {
        authorized: true,
        basis: 'Paid commercial plan receipts verified',
        tools_verified: toolsUsed.map((t: any) => t.tool || 'Unknown'),
        verification_date: new Date().toISOString(),
      },

      // Field 5: Modification Rights Status (JSONB) - Auto-populated from submission
      modification_rights_status: {
        authorized: submission.modification_authorized || false,
        scope: submission.modification_scope || 'Not authorized',
        tier_2_eligible: submission.modification_authorized,
      },

      // Field 6: Category Conflict Log (TEXT[]) - Auto-determined (empty for now)
      category_conflict_log: categoryConflicts,

      // Field 7: Territory Log (TEXT) - Auto-populated from submission
      territory_log: submission.territory_preferences || 'Global',

      // Field 8: Regeneration Rights Status (JSONB) - Auto-populated from modification rights
      regeneration_rights_status: {
        authorized: submission.modification_authorized || false,
        scenes: submission.modification_scope || 'N/A',
        ai_regeneration_permitted: submission.modification_authorized,
      },

      // Field 9: Version History (JSONB) - Auto-generated
      version_history: {
        current_version: 'v1.0',
        created_date: new Date().toISOString(),
        changes: [
          {
            version: 'v1.0',
            date: new Date().toISOString(),
            description: 'Initial Chain of Title generation',
            reviewer: userData.name || userData.email,
          },
        ],
      },

      // Document will be generated next
      document_url: null,
      document_path: null,
    }

    // Insert Rights Package record
    const { data: rightsPackage, error: insertError } = await supabaseAdmin
      .from('rights_packages')
      .insert(rightsPackageData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating Rights Package:', insertError)
      return NextResponse.json({ error: 'Failed to create Rights Package' }, { status: 500 })
    }

    console.log(`Rights Package created for submission ${params.id}, catalog ID: ${catalogId}, tier: ${tier}`)

    // Parse tools for PDF generator
    const tools = toolsUsed.map((t: any) => ({
      tool_name: t.tool || 'Unknown',
      version: t.version || 'Not specified',
      plan_type: t.plan_type || 'Pro',
      start_date: t.start_date || '',
      end_date: t.end_date || '',
      receipt_url: t.receipt_url,
    }))

    // Generate Chain of Title PDF (react-pdf version)
    console.log('📄 Calling generateChainOfTitlePDF for', catalogId)
    const pdfUrl = await generateChainOfTitlePDF({
      catalogId,
      submissionId: params.id,
      filmmakerName: submission.filmmaker_name,
      title: submission.title,
      tools,
      modificationRights: {
        authorized: submission.modification_authorized || false,
        scope: submission.modification_scope || undefined,
      },
      territory: submission.territory_preferences || 'Global',
      reviewedBy: userData.name || userData.email,
    })

    console.log('📄 generateChainOfTitlePDF result:', pdfUrl ? '✅ URL returned' : '❌ null returned')

    if (!pdfUrl) {
      // PDF generation failed — return error so admin knows immediately
      return NextResponse.json({
        error: 'PDF generation failed. Check Vercel logs for details.',
        rightsPackageId: rightsPackage.id,
      }, { status: 500 })
    }

    if (pdfUrl) {
      await supabaseAdmin
        .from('rights_packages')
        .update({ document_url: pdfUrl, generated_at: new Date().toISOString() })
        .eq('id', rightsPackage.id)
    }

    return NextResponse.json({
      success: true,
      rightsPackageId: rightsPackage.id,
      catalogId,
      tier,
      documentUrl: pdfUrl,
      message: 'Chain of Title PDF generated successfully',
    })
  } catch (error) {
    console.error('Error in generate-rights-package route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
