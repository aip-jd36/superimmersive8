/**
 * CR-V2-PROD-UAT-B — operator CLI for a controlled synthetic examination UAT (migration 20261105000000).
 * Route-free, replay-only, and unable to create, extend, widen or revoke a grant (the database grants the service
 * role nothing on grants; grants are created and revoked only with the reviewed SQL in
 * supabase/operator/creator-record-v2-uat/). It never deletes, removes or overwrites anything.
 *
 * Run from 08_Platform/app with the target's URL and service key in the SHELL environment only (never a file):
 *
 *   npx tsx scripts/creator-record-v2-uat/examination-uat.ts nonce
 *       → prints a single-use code and its SHA-256. Keep the code in the shell as SI8_UAT_NONCE; paste only the
 *         SHA-256 into create_grant.sql.
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SI8_UAT_NONCE=… \
 *   npx tsx scripts/creator-record-v2-uat/examination-uat.ts <status|seed|examine|history> \
 *       --target production|staging --expect-ref <20-char ref> [--fixture-file <path>]
 *
 * Every command except `nonce` first runs the layered target safeguards (configured URL vs the expected ref, vs the
 * live app's embedded URL, vs the key's own ref claim when it has one) and then resolves the grant by its code
 * through the status function, which only the database where the grant was created can answer. The Supabase
 * client is created only after those checks pass. Output is JSON; no key or code is printed (except by `nonce`).
 */

import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  examineGrantDocument,
  newBindingNonce,
  readGrantHistory,
  resolveGrant,
  seedSyntheticDocument,
  UAT_STATUS_FUNCTION,
  verifyTarget,
  type SeedPorts,
  type UatGrantStatus,
  type UatTarget,
} from '../../lib/creator-record-flow/examination-uat'

const COMMANDS = ['nonce', 'status', 'seed', 'examine', 'history'] as const
type Command = (typeof COMMANDS)[number]

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
function out(value: unknown, exitCode: number): never {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n')
  process.exit(exitCode)
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command
  if (!COMMANDS.includes(command)) out({ error: `usage: ${COMMANDS.join(' | ')}` }, 2)
  if (command === 'nonce') {
    const { nonce, sha256 } = newBindingNonce()
    out({ nonce, binding_nonce_sha256: sha256, keep: 'export SI8_UAT_NONCE=<nonce> in this shell only; paste only binding_nonce_sha256 into create_grant.sql' }, 0)
  }

  const target = arg('target') as UatTarget
  const expectRef = arg('expect-ref')
  const nonce = process.env.SI8_UAT_NONCE
  if ((target !== 'production' && target !== 'staging') || !expectRef || !nonce) out({ error: '--target production|staging, --expect-ref and SI8_UAT_NONCE are required' }, 2)

  const fetchText = async (url: string) => {
    const r = await fetch(url, { redirect: 'follow' })
    if (!r.ok) throw new Error(`fetch ${r.status}`)
    return r.text()
  }
  const verification = await verifyTarget({ target, expectRef, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY }, { fetchText })
  if (!verification.ok || !verification.ref) out({ refused: 'target_verification_failed', checks: verification.checks }, 1)

  // Only now is a client created.
  const { supabaseAdmin } = await import('../../lib/supabase/admin')
  const { EVIDENCE_BUCKET } = await import('../../lib/creator-record/evidence-intake/contract')
  const status = async (code: string): Promise<UatGrantStatus[]> => {
    const { data, error } = await supabaseAdmin.rpc(UAT_STATUS_FUNCTION, { p_nonce: code })
    if (error) throw new Error('status_unavailable')
    return (data ?? []) as UatGrantStatus[]
  }
  const resolved = await resolveGrant(status, nonce, verification.ref)
  if (!resolved.ok) out({ refused: resolved.reason, checks: verification.checks }, 1)
  const grant = resolved.grant

  if (command === 'status') out({ checks: verification.checks, grant }, 0)

  if (command === 'seed') {
    const file = arg('fixture-file')
    if (!file) out({ error: '--fixture-file is required' }, 2)
    const ports: SeedPorts = {
      async insertPending(row) {
        const { error } = await supabaseAdmin.from('creator_record_v2_documents').insert(row)
        if (!error) return { ok: true }
        if (error.code === 'P0001' || error.code === '23505' || error.code === '23514' || error.code === '23503') return { ok: false, refused: `${error.code}:${error.message}` }
        throw new Error('insert_outcome_unknown')
      },
      async putObject(path, bytes, mediaType) {
        const { error } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).upload(path, bytes, { contentType: mediaType, upsert: false })
        if (error) throw new Error('object_put_failed')
      },
      async getObject(path) {
        const { data, error } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).download(path)
        if (error) {
          const s = (error as { statusCode?: string | number; status?: number }).statusCode ?? (error as { status?: number }).status
          if (String(s) === '404' || /not.?found/i.test(error.message ?? '')) return null
          throw new Error('object_get_failed')
        }
        return new Uint8Array(await data.arrayBuffer())
      },
      async markStored(id, userId, at) {
        const { data, error } = await supabaseAdmin.from('creator_record_v2_documents').update({ state: 'stored', stored_at: at.toISOString() }).eq('id', id).eq('user_id', userId).eq('state', 'pending').select('id')
        if (error) throw new Error('mark_stored_failed')
        return (data ?? []).length === 1
      },
    }
    const outcome = await seedSyntheticDocument(ports, grant, new Uint8Array(readFileSync(file as string)), { newId: randomUUID, now: () => new Date() })
    out({ checks: verification.checks, outcome }, outcome.stage === 'stored' ? 0 : 1)
  }

  const { productionExaminationDeps, examinationStorage } = await import('../../lib/creator-record-flow/examination-production')
  if (command === 'examine') {
    const result = await examineGrantDocument(productionExaminationDeps(), grant)
    const summary = result.kind === 'recorded'
      ? { kind: result.kind, result: result.result, run_id: result.run_id, examination_key: result.envelope.examination_key, outcome: result.envelope.outcome }
      : result.kind === 'not_recorded' ? { kind: result.kind, reason: result.reason, examination_key: result.envelope.examination_key } : result
    out({ checks: verification.checks, result: summary }, result.kind === 'recorded' ? 0 : 1)
  }
  if (command === 'history') {
    const history = await readGrantHistory(examinationStorage, grant)
    out({ checks: verification.checks, history: history.kind === 'verified' ? { kind: 'verified', runs: history.runs.map((r) => ({ run_id: r.run_id, supersedes_id: r.supersedes_id, created_at: r.created_at, examination_key: r.envelope.examination_key, outcome: r.envelope.outcome })) } : history }, history.kind === 'verified' ? 0 : 1)
  }
}

main().catch(() => out({ error: 'unexpected_failure' }, 1))
