// Canonical empty workbook state — version 0.2
// Matches the JSONB schema in PRD_REVIEWER_WORKBOOK_UI.md and workbook_data column.
// Updated here when the schema changes; bump workbook_version.

export const EMPTY_WORKBOOK = {
  workbook_version: '0.2',
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

export const ALL_CONTROLS = ['A01','R01','R02','R03','R04','H01','H02','I01','I02','I03','L01','L02','L03','T01','D01','D02'] as const

// Compute section completion states from workbook data
export function computeGates(workbook: WorkbookData) {
  const s1 = workbook.section_1
  const s3 = workbook.section_3
  const s5 = workbook.section_5
  const s6 = workbook.section_6

  const section1Complete = Object.values(s1.scope_checks).every(Boolean)
  const section2Complete =
    workbook.section_2.viewing_passes.first_complete &&
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
