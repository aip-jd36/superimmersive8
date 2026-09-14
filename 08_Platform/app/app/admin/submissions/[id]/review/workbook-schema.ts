// Canonical empty workbook state — version 0.2
// Matches the JSONB schema in PRD_REVIEWER_WORKBOOK_UI.md and workbook_data column.
// Updated here when the schema changes; bump workbook_version.

export const EMPTY_WORKBOOK = {
  workbook_version: '0.4',
  section_1: {
    campaign_description: '',
    assessment_start: '',
    scope_checks: {
      no_list_reviewed: false,
      custodian_declaration: false,
      indemnification_confirmed: false,
      video_accessible: false,
      certified_tier: false,
    },
    scope_limitations: '',
    // Assessment jurisdiction (G2, CA-METH-3B) -- the narrower jurisdictional
    // context the REVIEWER has established as relevant to this Commercial
    // Assurance assessment. Structurally distinct from `submission.
    // territory_preferences` (G1, distribution/exhibition footprint): G1 is
    // broad and creator-supplied; G2 is reviewer-established and may be
    // narrower, or explicitly absent, or explicitly unresolved. `status` is
    // mandatory-to-CONSIDER, not mandatory-to-RESOLVE -- see signoff.ts.
    jurisdiction_context: {
      status: '' as '' | 'no_narrower_jurisdiction_implicated' | 'narrower_jurisdiction_noted' | 'unresolved_requires_followup',
      details: '',
    },
  },
  section_2: {
    video_url_confirmed: '',
    viewing_passes: {
      first_complete: false,
      second_viewing: false,
      frame_by_frame: false,
    },
    runtime_observed: null as number | null,
    aspect_ratio: '',
    scene_count: null as number | null,
    color_treatment: '',
    pacing: '',
    synthetic_humans: '',
    real_likeness_suspected: '',
    real_likeness_description: '',
    animals_present: false,
    children_present: false,
    has_audio: false,
    music_heard: '',
    speech_heard: false,
    sound_effects: false,
    audio_quality_issues: '',
    logos_observed: '',
    logos_description: '',
    trademarks_observed: '',
    trademarks_description: '',
    text_visible: false,
    text_description: '',
    landmarks_observed: '',
    landmarks_description: '',
    copyrighted_artwork: '',
    copyrighted_artwork_description: '',
    ai_artifacts: '',
    temporal_consistency: '',
    visual_quality: '',
    unexpected_content: false,
    unexpected_description: '',
    freeform_observations: '',
    overall_first_impression: '',
  },
  section_3: {
    A01: { evidence: '', judgment: '', notes: '' },
    R01: { evidence: '', judgment: '', notes: '' },
    R02: { evidence: '', judgment: '', notes: '', tools_reviewed: '', license_status: '', receipts: '' },
    R03: { judgment: '', notes: '', custom_model: false, training_data: '', licensing_documented: '' },
    R04: { evidence: '', judgment: '', notes: '', tos_summary: '', work_for_hire: '' },
    R05: { judgment: '', notes: '', intended_exploitation: '', expectation_details: '', reviewer_risk_recognition: '' },
    H01: { evidence: '', judgment: '', notes: '', contribution_level: '' },
    H02: { judgment: '', notes: '', copyright_claim: '', claim_basis: '', assessment: '' },
    I01: { evidence: '', judgment: '', notes: '', content_viewed: false, elements_identified: '' },
    I02: { judgment: '', notes: '', audio_source: '', license_provided: '', audio_reviewed: false },
    I03: { judgment: '', notes: '', trademark_elements: '' },
    L01: { judgment: '', notes: '', content_viewed: false, likeness_found: '' },
    L02: { judgment: '', notes: '', performers_present: false, distinctness: '' },
    L03: { judgment: '', notes: '', real_person_confirmed: false, documentation_type: '', documentation_provided: '' },
    T01: { evidence: '', judgment: '', notes: '', workflow_provided: '', prompt_logs: '', metadata_provided: '', workflow_coherence: '' },
    D01: { judgment: '', notes: '', date_consistency: '', version_consistency: '', receipt_date_consistency: '' },
    D02: { judgment: '', notes: '', retroactive_indicators: '', retroactive_basis: '' },
  },
  section_4: {
    gaps: [] as Array<{
      id: string
      control: string
      what_missing: string
      addressable: string
      commercial_impact: string
      impact_description: string
    }>,
  },
  section_5: {
    findings: [] as Array<{
      id: string
      domain: string
      finding: string
      evidence_basis: string
      commercial_impact: string
      addressable: string
    }>,
  },
  section_6: {
    outcome: '',
    basis: '',
    conditions: [] as string[],
    commercial_confidence: '',
    commercial_confidence_basis: '',
    reviewer_confidence: '',
    reviewer_confidence_notes: '',
    assessment_end: '',
    signed_off: false,
  },
  section_7: {
    executive_summary: '',
    evidence_reviewed: [] as string[],
    key_findings: [] as string[],
    overall_statement: '',
    residual_risks: [] as string[],
    next_steps: [] as string[],
    post_assessment_notes: '',
  },
}

export type WorkbookData = typeof EMPTY_WORKBOOK

/**
 * Reconcile a persisted (possibly legacy) workbook_data object onto the
 * CURRENT EMPTY_WORKBOOK shape (CA-METH-4A production hotfix).
 *
 * A key entirely ABSENT from the persisted object falls through to the
 * current default -- the schema's own "never considered / unaddressed"
 * empty value. It is never fabricated, never inferred from another field
 * (e.g. never derived from a sibling field), and never marked complete. A
 * key that IS present in the persisted object -- even '', even false, even
 * an empty array -- always wins; this function never overwrites real
 * reviewer-entered data.
 *
 * Necessary because a workbook saved before a schema addition (e.g.
 * CA-METH-3B's `section_1.jurisdiction_context`, or any future field)
 * predates that field entirely in the database: the raw JSONB has no such
 * key at all, not merely an empty one. Rendering that raw object directly
 * crashed `Section1Intake.tsx`'s unguarded `data.jurisdiction_context.status`
 * read -- the CA-METH-4A production regression this function fixes.
 *
 * This is the ONE generic reconciliation layer, applied once at load time
 * (`app/admin/submissions/[id]/review/page.tsx`) -- component render code
 * should not need ad hoc `?? {}` patches to cope with legacy shape.
 * (`Section3Evidence.tsx`'s own pre-existing per-control `(data as any)[id]
 * ?? {}` guard already gave Section 3 controls, including R05, this same
 * protection defensively; this function makes it universal and generic
 * across the whole schema, current and future, rather than something each
 * new field's author must remember to reinvent at the render site.)
 *
 * Arrays are never deep-merged -- a present persisted array (even `[]`)
 * always wins outright over the default array, preserving real reviewer
 * data (Gap Log / Findings entries) exactly as recorded.
 */
function mergeWorkbookDefaults(defaultValue: unknown, persistedValue: unknown): unknown {
  if (persistedValue === undefined) return defaultValue
  if (Array.isArray(defaultValue)) {
    return Array.isArray(persistedValue) ? persistedValue : defaultValue
  }
  if (defaultValue !== null && typeof defaultValue === 'object') {
    if (persistedValue === null || typeof persistedValue !== 'object' || Array.isArray(persistedValue)) {
      return defaultValue
    }
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(defaultValue as Record<string, unknown>)) {
      out[key] = mergeWorkbookDefaults(
        (defaultValue as Record<string, unknown>)[key],
        (persistedValue as Record<string, unknown>)[key],
      )
    }
    return out
  }
  return persistedValue
}

export function normalizeWorkbook(raw: unknown): WorkbookData {
  return mergeWorkbookDefaults(EMPTY_WORKBOOK, raw) as WorkbookData
}

export const JUDGMENT_OPTIONS = [
  'Verified',
  'Partially Verified',
  'Not Provided',
  'Not Applicable',
] as const

export const OUTCOME_OPTIONS = [
  { value: 'EVIDENCE_SUPPORTS', label: 'Evidence Supports Intended Commercial Use' },
  { value: 'EVIDENCE_SUPPORTS_WITH_CONDITIONS', label: 'Evidence Supports Intended Commercial Use with Conditions' },
  { value: 'MATERIAL_RISKS_IDENTIFIED', label: 'Evidence Indicates Material Commercial Risks' },
  { value: 'INSUFFICIENT_EVIDENCE', label: 'Insufficient Supporting Evidence' },
  { value: 'UNABLE_TO_ASSESS', label: 'Unable to Reach Assessment' },
] as const

export const CONFIDENCE_OPTIONS = ['High', 'Moderate', 'Low'] as const

export const DOMAIN_LABELS: Record<string, string> = {
  A: 'Identity & Accountability',
  R: 'Commercial Rights & Licensing',
  H: 'Human Creative Contribution',
  I: 'Third-Party IP',
  L: 'Likeness & Performer Rights',
  T: 'Technical Provenance',
  D: 'Documentation Integrity',
}

export const ALL_CONTROLS = ['A01','R01','R02','R03','R04','R05','H01','H02','I01','I02','I03','L01','L02','L03','T01','D01','D02'] as const

// Compute section completion states from workbook data
export function computeGates(workbook: WorkbookData) {
  const s1 = workbook.section_1
  const s3 = workbook.section_3
  const s5 = workbook.section_5
  const s6 = workbook.section_6

  const section1Complete = Object.values(s1.scope_checks).every(Boolean)
  const section2Complete =
    (workbook.section_2.viewing_passes?.first_complete ?? false) &&
    workbook.section_2.freeform_observations.trim().length >= 20
  const section3Complete = ALL_CONTROLS.every(id => !!(s3 as any)[id]?.judgment)
  const section5Complete = s5.findings.length > 0
  const section6Complete = !!(s6.outcome && s6.commercial_confidence && s6.signed_off)

  return {
    section1Complete,
    section2Complete,
    section3Complete,
    section5Complete,
    section6Complete,
    canEnterSection2: section1Complete,
    canEnterSection3: section2Complete,
    canEnterSection4: section3Complete,
    canEnterSection5: section3Complete,
    canEnterSection6: section5Complete,
    canEnterSection7: section6Complete,
  }
}
