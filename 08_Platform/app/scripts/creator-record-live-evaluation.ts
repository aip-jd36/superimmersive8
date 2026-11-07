/**
 * CR-V2-DOC-LIVE-1C-B1 — operator CLI for one evaluation attempt on one document. Disabled: in this build it always refuses.
 *
 *   npx tsx scripts/creator-record-live-evaluation.ts <request.json>
 *
 * The only argument is the path of a request file holding exactly `evaluation_id`, `prepared_id`, `document_id` and `tool_index`. There
 * are no flags. Nothing given here can enable a model call or choose a port, adapter, model or profile: the runner's composition is fixed
 * (`lib/creator-record-flow/live-evaluation-runner.ts`). One document per run, serially. Prints the runner's metadata summary only.
 */

import { readFileSync } from 'node:fs'
import { runFixedEvaluation } from '@/lib/creator-record-flow/live-evaluation-runner'

export async function main(argv: readonly string[]): Promise<number> {
  if (argv.length !== 1 || argv[0].startsWith('-')) {
    process.stderr.write('usage: creator-record-live-evaluation <request.json>\n')
    return 2
  }
  let request: unknown
  try {
    request = JSON.parse(readFileSync(argv[0], 'utf8'))
  } catch {
    process.stderr.write('the request file could not be read as JSON\n')
    return 2
  }
  const summary = await runFixedEvaluation(request)
  process.stdout.write(`${JSON.stringify(summary)}\n`)
  return summary.kind === 'completed' && (summary.result === 'examined' || summary.result === 'failed') ? 0 : 1
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => process.exit(code), () => process.exit(1))
}
