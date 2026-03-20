/**
 * Generate Chain of Title Document
 *
 * Creates a text-based Chain of Title document from Rights Package data
 * MVP: Plain text format that can be saved as .txt
 * Future: Enhanced PDF with styling
 */

type RightsPackageData = {
  catalog_id: string
  tool_provenance_log: any
  model_disclosure: string
  rights_verified_signoff: any
  commercial_use_authorization: any
  modification_rights_status: any
  category_conflict_log: string[]
  territory_log: string
  regeneration_rights_status: any
  version_history: any
}

type SubmissionData = {
  title: string
  filmmaker_name: string
  runtime: number
  genre: string
  created_at: string
}

export function generateChainOfTitle(
  rightsPackage: RightsPackageData,
  submission: SubmissionData
): string {
  const doc = `
================================================================================
                    CHAIN OF TITLE DOCUMENTATION
                        SI8 RIGHTS VERIFIED
================================================================================

CATALOG ID: ${rightsPackage.catalog_id}
GENERATED: ${new Date().toISOString().split('T')[0]}

================================================================================
PRODUCTION INFORMATION
================================================================================

Film Title:        ${submission.title}
Filmmaker:         ${submission.filmmaker_name}
Runtime:           ${formatRuntime(submission.runtime)}
Genre:             ${submission.genre || 'Not specified'}
Submission Date:   ${new Date(submission.created_at).toLocaleDateString()}

================================================================================
FIELD 1: TOOL PROVENANCE LOG
================================================================================

${formatToolProvenance(rightsPackage.tool_provenance_log)}

================================================================================
FIELD 2: MODEL DISCLOSURE
================================================================================

${rightsPackage.model_disclosure || 'See Tool Provenance Log above'}

================================================================================
FIELD 3: RIGHTS VERIFIED SIGN-OFF
================================================================================

Status:            ${rightsPackage.rights_verified_signoff.status.toUpperCase()}
Tier:              ${rightsPackage.rights_verified_signoff.tier}
Reviewer:          ${rightsPackage.rights_verified_signoff.reviewer}
Review Date:       ${new Date(rightsPackage.rights_verified_signoff.date).toLocaleDateString()}

Certification:     This content has been reviewed and verified through SI8's
                   Rights Verified process. All AI tools used have confirmed
                   commercial licensing authorization.

================================================================================
FIELD 4: COMMERCIAL USE AUTHORIZATION
================================================================================

Authorized:        ${rightsPackage.commercial_use_authorization.authorized ? 'YES' : 'NO'}
Basis:             ${rightsPackage.commercial_use_authorization.basis}

Tools Verified:
${rightsPackage.commercial_use_authorization.tools_verified.map((t: string) => `  • ${t}`).join('\n')}

Verification Date: ${new Date(rightsPackage.commercial_use_authorization.verification_date).toLocaleDateString()}

================================================================================
FIELD 5: MODIFICATION RIGHTS STATUS
================================================================================

Authorized:        ${rightsPackage.modification_rights_status.authorized ? 'YES' : 'NO'}
Scope:             ${rightsPackage.modification_rights_status.scope}
Tier 2 Eligible:   ${rightsPackage.modification_rights_status.tier_2_eligible ? 'YES (Custom AI Placement available)' : 'NO'}

${rightsPackage.modification_rights_status.authorized ?
`This content is eligible for Tier 2 Custom AI Product Placement, where
brand elements can be AI-regenerated into approved scenes.` :
`This content is available for Tier 1 licensing only (as-is, no modifications).`}

================================================================================
FIELD 6: CATEGORY CONFLICT LOG
================================================================================

${rightsPackage.category_conflict_log.length > 0 ?
`The following brand categories are flagged as potentially unsuitable for
this content due to thematic or contextual considerations:

${rightsPackage.category_conflict_log.map((c: string) => `  • ${c}`).join('\n')}

Note: These restrictions are advisory. Final brand fit decisions should be
made in consultation with SI8's licensing team.` :
`No category conflicts identified. This content is suitable for general
commercial brand attachment across all categories.`}

================================================================================
FIELD 7: TERRITORY LOG
================================================================================

Geographic Scope:  ${rightsPackage.territory_log}

${rightsPackage.territory_log === 'Global' ?
`This content is cleared for global licensing with no territorial restrictions.` :
`Licensing is restricted to the following territories: ${rightsPackage.territory_log}`}

================================================================================
FIELD 8: REGENERATION RIGHTS STATUS
================================================================================

AI Regeneration:   ${rightsPackage.regeneration_rights_status.ai_regeneration_permitted ? 'PERMITTED' : 'NOT PERMITTED'}
Scope:             ${rightsPackage.regeneration_rights_status.scenes}

${rightsPackage.regeneration_rights_status.ai_regeneration_permitted ?
`The filmmaker has authorized AI regeneration of specific scenes for brand
integration purposes (Tier 2 Custom AI Product Placement).` :
`AI regeneration is not authorized. Content must be licensed as-is.`}

================================================================================
FIELD 9: VERSION HISTORY
================================================================================

Current Version:   ${rightsPackage.version_history.current_version}
Created:           ${new Date(rightsPackage.version_history.created_date).toLocaleDateString()}

${rightsPackage.version_history.changes.map((change: any) =>
`${change.version} - ${new Date(change.date).toLocaleDateString()}
  ${change.description}
  Reviewer: ${change.reviewer}`
).join('\n\n')}

================================================================================
LEGAL DISCLAIMER
================================================================================

This Chain of Title documentation represents SI8's good faith verification
of rights clearance based on information provided by the filmmaker and
verification of commercial tool usage.

This documentation does NOT constitute:
• Legal advice or opinion
• A warranty or guarantee against infringement claims
• Insurance or indemnification

Buyers are encouraged to conduct their own legal review as appropriate for
their specific use case and risk tolerance.

For questions about this Chain of Title or licensing inquiries:
Email: licensing@superimmersive8.com

================================================================================
                      © ${new Date().getFullYear()} SuperImmersive 8
                   Rights Verified Process - Chain of Title v1.0
================================================================================
`.trim()

  return doc
}

function formatRuntime(seconds: number): string {
  if (!seconds) return 'Not specified'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatToolProvenance(log: any): string {
  if (!log || !log.tools || log.tools.length === 0) {
    return 'No tools specified'
  }

  return log.tools.map((tool: any, idx: number) =>
`Tool ${idx + 1}: ${tool.name}
  Version:          ${tool.version}
  Plan Type:        ${tool.plan_type}
  Production Dates: ${tool.dates}
  Receipt Verified: ${tool.receipt_verified ? 'YES' : 'NO'}`
  ).join('\n\n') + `\n\nVerification Date: ${new Date(log.verification_date).toLocaleDateString()}`
}
