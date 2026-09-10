'use client'

/**
 * Workspace layout coordination — CAH-4F.2 (Contextual Inspector Coordination).
 *
 * A domain-neutral channel carrying ONE layout fact from the page-frame owner
 * (`ReviewerShell`) down to the opaque Workbook child, so that at adjacent
 * desktop widths only one contextual surface occupies the right rail at a time:
 *
 *   - Reviewer Resources CLOSED → the Workbook shows its own
 *                                 Guidance / Submission / Evidence context aside
 *   - Reviewer Resources OPEN   → that aside visually yields the rail while
 *                                 Reviewer Resources occupies it
 *
 * This is a UX / perceptual-clarity mechanism. It is NOT an authority boundary
 * and must never be described as one. Authority separation between the
 * Assessment Workbook, Reviewer Living Knowledge and Linked CRC Context is
 * enforced entirely and independently through data ownership, service
 * boundaries, audit paths, bounded interpretation and mutation boundaries —
 * none of which this channel touches. Contextual rail time-sharing improves
 * workspace clarity; the existing authority boundaries remain enforced
 * independently.
 *
 * THE CHANNEL CARRIES LAYOUT STATE ONLY. It must never carry Reviewer LK data,
 * CRC context, applicability, governed claims, Workbook data, evidence, audit
 * information, assessment conclusions, or any callback that mutates an
 * authority surface.
 *
 * It imports nothing from `@/lib/*`. It performs no fetch, no persistence and
 * no audit. The default value keeps `WorkbookClient` fully functional when
 * rendered with no provider (e.g. outside `ReviewerShell`, or in a test).
 */

import { createContext, useContext } from 'react'

export interface WorkspaceLayout {
  /**
   * True only while Reviewer Resources occupies the adjacent contextual rail
   * (`resourcesAvailable && inspectorOpen && adjacent`). While true, the
   * Workbook's own context aside is CSS-hidden — it stays mounted, keeps its
   * `rightTab`, and returns unchanged when this goes back to false.
   */
  workbookContextAsideHidden: boolean
}

const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayout = { workbookContextAsideHidden: false }

const WorkspaceLayoutContext = createContext<WorkspaceLayout>(DEFAULT_WORKSPACE_LAYOUT)

export const WorkspaceLayoutProvider = WorkspaceLayoutContext.Provider

export function useWorkspaceLayout(): WorkspaceLayout {
  return useContext(WorkspaceLayoutContext)
}
