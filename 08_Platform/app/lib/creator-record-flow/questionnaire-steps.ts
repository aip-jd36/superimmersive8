/**
 * SI8-UX-2 — the questionnaire's steps. PURE: client-safe.
 *
 * Presentation only. The steps are the governed sections, in the governed order (`QUESTIONNAIRE_SECTION_ORDER`, part of the
 * questionnaire contract), followed by the acknowledgements. Nothing here changes which questions exist, which are shown, which
 * are required, or what an answer means: those stay with the contract (`visibleQuestions`, `validateForm`), and the server still
 * validates the whole submission. A step's own check is only the same `validateForm` result, filtered to that step, so the
 * creator sees problems before moving on.
 */
import { QUESTIONNAIRE_SECTION_ORDER } from '@/lib/creator-record/prototype/questionnaire-structure'
import type { FormIssue } from '@/lib/creator-record/prototype/form'

export const ACKNOWLEDGEMENTS_STEP = 'acknowledgements' as const

/** The steps for the sections that currently have something to show, in the governed order, then the acknowledgements. */
export function questionnaireSteps(sectionsWithContent: ReadonlySet<string>): string[] {
  return [...QUESTIONNAIRE_SECTION_ORDER.filter((s) => sectionsWithContent.has(s)), ACKNOWLEDGEMENTS_STEP]
}

/**
 * The step an issue belongs to: its question's section; the tools step for tool-count issues and per-tool questions; the
 * acknowledgements step for an acknowledgement. An issue the presentation does not know (e.g. `unknown_question`) goes to the
 * first step, so it is always shown somewhere.
 */
export function stepOfIssue(
  issue: FormIssue,
  presentation: Readonly<Record<string, { section: string }>>,
  acknowledgementIds: readonly string[],
  steps: readonly string[],
): string {
  if (issue.issue === 'no_tools' || issue.issue === 'too_many_tools') return steps.includes('tools') ? 'tools' : steps[0]
  if (issue.q_id !== null && acknowledgementIds.includes(issue.q_id)) return ACKNOWLEDGEMENTS_STEP
  const section = issue.q_id !== null ? presentation[issue.q_id]?.section : undefined
  return section && steps.includes(section) ? section : steps[0]
}

export function issuesForStep(
  issues: readonly FormIssue[],
  step: string,
  presentation: Readonly<Record<string, { section: string }>>,
  acknowledgementIds: readonly string[],
  steps: readonly string[],
): FormIssue[] {
  return issues.filter((i) => stepOfIssue(i, presentation, acknowledgementIds, steps) === step)
}

/** The earliest step with an issue, or null. */
export function firstStepWithIssues(
  issues: readonly FormIssue[],
  presentation: Readonly<Record<string, { section: string }>>,
  acknowledgementIds: readonly string[],
  steps: readonly string[],
): string | null {
  const withIssues = new Set(issues.map((i) => stepOfIssue(i, presentation, acknowledgementIds, steps)))
  return steps.find((s) => withIssues.has(s)) ?? null
}
