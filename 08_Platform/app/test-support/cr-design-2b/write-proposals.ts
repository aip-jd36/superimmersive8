/**
 * CR-DESIGN-2B — writes the PROPOSED v6 / v7 template-set files (pending, registered nowhere). Deterministic.
 * Run: npx tsx test-support/cr-design-2b/write-proposals.ts
 */
import { writeFileSync } from 'node:fs'
import { proposalFile, proposalFileContent } from './proposed-sets'

for (const schema of [7, 8] as const) {
  const content = proposalFileContent(schema)
  writeFileSync(proposalFile(schema), `${JSON.stringify(content, null, 2)}\n`, 'utf8')
  console.log(proposalFile(schema), content.fingerprints.pdf)
}
