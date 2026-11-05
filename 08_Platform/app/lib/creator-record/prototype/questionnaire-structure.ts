/**
 * CR-V2-DECL-1B-1 — the parts of the questionnaire held in code rather than in a bundle: section structure, and the few
 * questions and one option that generic code gives a meaning to. All are part of the questionnaire contract, so changing one
 * changes its digest. Kept apart from `./form`, whose validation holds no question id.
 */

/** Display order of the sections. A question in any other section is never rendered. */
export const QUESTIONNAIRE_SECTION_ORDER = ['project', 'locations', 'tools', 'people', 'materials', 'contribution'] as const

/** The customer page's section headings. */
export const CUSTOMER_SECTION_TITLES: Readonly<Record<string, string>> = {
  project: 'About the video',
  locations: 'Where',
  tools: 'AI tools',
  people: 'People',
  materials: 'Other material in the video',
  contribution: 'Your contribution',
}

/** Tool identity, its typed name, its plan, and the option meaning "not listed". The questionnaire and the record's comparisons read these. */
export const TOOL_QUESTION_ROLES = { identity: 'T1', other_name: 'T1X', plan: 'T3', other_tool_option: 'other_tool' } as const
