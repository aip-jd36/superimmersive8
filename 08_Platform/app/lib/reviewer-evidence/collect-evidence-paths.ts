/**
 * Submission → reviewer evidence-path inventory (CAH-4I.3).
 *
 * Turns the AUTHORITATIVE evidence-upload columns/JSONB already persisted on
 * a `submissions` row into the flat `{label, path}` list the reviewer
 * workbook's Evidence tab signs URLs for and renders.
 *
 * This is a reachability fix only: every path collected here was already
 * uploaded at submission time and already readable by an admin-authorized
 * caller (the row is fetched with `supabaseAdmin`, which bypasses RLS).
 * Before CAH-4I.3, only two of seven known evidence channels were collected
 * (tool receipts, audio license) — five channels existed on the row,
 * rendered on the creator's own dashboard, and were reachable from no
 * reviewer surface at all (CAH-4I.2 §17.3). This function does not add,
 * remove, or reinterpret any evidence channel; it surfaces the channels
 * that already exist.
 *
 * Pure. No fetch, no storage call, no signing — signing stays in the
 * caller, exactly as it already worked for the two pre-existing channels.
 * A path that does not exist is simply absent from the returned list
 * (fail-closed: presence in this list means "a file was uploaded," never
 * "the reviewer has judged it sufficient" — that judgment stays entirely
 * inside the reviewer's own control fields in `workbook_data`).
 */

export interface EvidencePathEntry {
  label: string
  path: string
}

/** The subset of the `submissions` row this module reads. */
export interface SubmissionEvidenceInput {
  tools_used: unknown
  audio_disclosure: unknown
  likeness_release_path: unknown
  ip_license_path: unknown
  fair_use_doc_path: unknown
  third_party_assets: unknown
  production_evidence_paths: unknown
}

function parseJsonMaybe(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

/**
 * Collect every reviewer-reachable evidence file path currently persisted on
 * a submission, across all known upload channels. Order matches the order
 * channels were historically added, so existing evidence-tab ordering for
 * the two pre-existing channels (tool receipts, audio license) is
 * unchanged.
 */
export function collectSubmissionEvidencePaths(input: SubmissionEvidenceInput): EvidencePathEntry[] {
  const paths: EvidencePathEntry[] = []

  // Tool receipts from tools_used JSONB.
  const toolsArr = parseJsonMaybe(input.tools_used)
  if (Array.isArray(toolsArr)) {
    for (const tool of toolsArr) {
      const path = tool?.receipt_path || tool?.receipt?.path
      if (asString(path)) {
        const toolLabel = tool?.tool_name || tool?.toolName || tool?.tool || 'Tool'
        paths.push({ label: `${toolLabel} receipt`, path })
      }
    }
  }

  // Audio license from audio_disclosure JSONB.
  const audioObj = parseJsonMaybe(input.audio_disclosure) as { license_path?: unknown } | null
  const audioPath = asString(audioObj?.license_path)
  if (audioPath) {
    paths.push({ label: 'Audio license', path: audioPath })
  }

  // Talent/likeness release (direct column).
  const likenessPath = asString(input.likeness_release_path)
  if (likenessPath) {
    paths.push({ label: 'Talent release', path: likenessPath })
  }

  // IP license / authorization document (direct column).
  const ipPath = asString(input.ip_license_path)
  if (ipPath) {
    paths.push({ label: 'IP license / authorization', path: ipPath })
  }

  // Fair-use supporting document (direct column).
  const fairUsePath = asString(input.fair_use_doc_path)
  if (fairUsePath) {
    paths.push({ label: 'Fair-use documentation', path: fairUsePath })
  }

  // Third-party asset license documents from third_party_assets JSONB.
  const thirdPartyObj = parseJsonMaybe(input.third_party_assets) as { items?: unknown } | null
  const thirdPartyItems = Array.isArray(thirdPartyObj?.items) ? (thirdPartyObj!.items as any[]) : []
  thirdPartyItems.forEach((item, i) => {
    const path = asString(item?.file_path)
    if (path) {
      const itemLabel = item?.type || item?.description || `item ${i + 1}`
      paths.push({ label: `Third-party asset license #${i + 1}: ${itemLabel}`, path })
    }
  })

  // Production evidence documents from production_evidence_paths JSONB.
  const productionEvidenceObj = parseJsonMaybe(input.production_evidence_paths) as { items?: unknown } | null
  const productionEvidenceItems = Array.isArray(productionEvidenceObj?.items)
    ? (productionEvidenceObj!.items as any[])
    : []
  productionEvidenceItems.forEach((item, i) => {
    const path = asString(item?.path)
    if (path) {
      const itemLabel = item?.title || item?.type || `item ${i + 1}`
      paths.push({ label: `Production evidence #${i + 1}: ${itemLabel}`, path })
    }
  })

  return paths
}
