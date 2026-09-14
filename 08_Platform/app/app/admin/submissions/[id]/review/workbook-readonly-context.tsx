'use client'

/**
 * Workbook read-only lifecycle authority (CA-OPS-3).
 *
 * Carries ONE fact down to every Section component's input primitives:
 * whether the workbook is currently immutable per the authoritative backend
 * contract (`assessment.processing_status IN ('SIGNING','SIGNED','DELIVERED')`
 * -- see `patch_workbook_atomic`, migration 20260907000000). `WorkbookClient`
 * is the single place this is derived (from the `processingStatus` prop, and
 * from an authoritative-immutable 409 response if one arrives while editing);
 * every consumer below only ever reads the resulting boolean, never
 * re-derives it from `processing_status`, `signoff_status`, revision
 * equality, or any other field.
 *
 * This is a PROJECTION of server-side authority for presentation only -- it
 * disables inputs and suppresses client-side autosave scheduling, and
 * nothing more. It never grants, blocks, or otherwise participates in an
 * actual write; `patch_workbook_atomic` remains the sole enforcement point.
 * A stale or wrong value here can only ever be over-cautious (unnecessarily
 * read-only) or under-cautious (a write attempt the server independently
 * still rejects) -- never a path to an unauthorized write.
 *
 * The default (false) keeps every consumer fully editable when rendered with
 * no provider (e.g. in a test, or any component reused outside the workbook).
 */

import { createContext, useContext } from 'react'

const WorkbookReadOnlyContext = createContext<boolean>(false)

export const WorkbookReadOnlyProvider = WorkbookReadOnlyContext.Provider

export function useWorkbookReadOnly(): boolean {
  return useContext(WorkbookReadOnlyContext)
}
