'use client'

/**
 * SI8-UX-2 — the creator's stored documents and their examination requests, shared by every tool section on the page.
 *
 * Exactly the existing operations, unchanged: list (`GET {apiBase}/evidence`), add one document with the storage consent
 * identifier (`POST {apiBase}/evidence`, multipart `file` + `consent`), and request one examination
 * (`POST {apiBase}/evidence/{id}/examination`, with `{ ai_permission }` only when a live AI examination is offered). The server
 * decides every gate, limit, ownership and permission; this hook only sends the creator's choices and keeps the server's answers.
 * No reading content is held here: an examination's outcome is only its state (`examineStateFrom`).
 */
import { useCallback, useEffect, useState } from 'react'
import { examineStateFrom, type ExamineState } from '@/lib/creator-record-flow/examination-ui'
import { PANEL_TEXT } from '@/lib/creator-record-flow/wording'

/** Exactly the evidence list route's view (stored documents only). */
export interface StoredDocument { id: string; file_name: string; media_type: string; byte_size: number; sha256: string; created_at: string }

export type UploadResult = { ok: true; document: StoredDocument; deduplicated: boolean } | { ok: false; error: string }

export interface CreatorRecordDocuments {
  documents: StoredDocument[]
  loading: boolean
  listError: string | null
  reload(): Promise<void>
  upload(file: File): Promise<UploadResult>
  examination: Readonly<Record<string, ExamineState>>
  examine(documentId: string, category?: string): Promise<void>
}

const FAILED = PANEL_TEXT.failed

export function useCreatorRecordDocuments(o: { enabled: boolean; apiBase: string; consentVersion: string; aiPermissionVersion?: string }): CreatorRecordDocuments {
  const { enabled, apiBase, consentVersion, aiPermissionVersion } = o
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [loading, setLoading] = useState(enabled)
  const [listError, setListError] = useState<string | null>(null)
  const [examination, setExamination] = useState<Record<string, ExamineState>>({})

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setListError(null)
    try {
      const res = await fetch(`${apiBase}/evidence`)
      const json = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(json.documents)) setDocuments(json.documents as StoredDocument[])
      else setListError(typeof json.error === 'string' ? json.error : FAILED)
    } catch {
      setListError(FAILED)
    } finally {
      setLoading(false)
    }
  }, [enabled, apiBase])
  useEffect(() => { void reload() }, [reload])

  const upload = useCallback(async (file: File): Promise<UploadResult> => {
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('consent', consentVersion)
      const res = await fetch(`${apiBase}/evidence`, { method: 'POST', body: form })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.document || typeof json.document.id !== 'string') return { ok: false, error: typeof json.error === 'string' ? json.error : FAILED }
      await reload()
      return { ok: true, document: json.document as StoredDocument, deduplicated: json.deduplicated === true }
    } catch {
      return { ok: false, error: FAILED }
    }
  }, [apiBase, consentVersion, reload])

  // CR-DOC-READER-EXT-5A: the creator's chosen kind of document travels with the request; the server decides what it means (while
  // licence reading is off it is ignored and the receipt reader is used, as before).
  const examine = useCallback(async (id: string, category?: string) => {
    setExamination((s) => ({ ...s, [id]: { kind: 'working' } }))
    try {
      const payload = { ...(typeof aiPermissionVersion === 'string' ? { ai_permission: aiPermissionVersion } : {}), ...(typeof category === 'string' ? { category } : {}) }
      const init: RequestInit = Object.keys(payload).length > 0
        ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }
        : { method: 'POST' }
      const res = await fetch(`${apiBase}/evidence/${id}/examination`, init)
      const json = await res.json().catch(() => ({}))
      setExamination((s) => ({ ...s, [id]: examineStateFrom(res.status, json) }))
    } catch {
      setExamination((s) => ({ ...s, [id]: { kind: 'refused', message: FAILED, retry: true } }))
    }
  }, [apiBase, aiPermissionVersion])

  return { documents, loading, listError, reload, upload, examination, examine }
}
