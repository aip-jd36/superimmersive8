/**
 * The customer wording lock (PRD v0.3 §5.4), shared by the PDF template check (`../customer-pdf/templates.ts`) and, since
 * CR-V2-SCHEMA8-PATH-1 (E5), by the approved-source check (`../customer-record/sources.ts`), which applies it to every governed
 * string a customer reads: question wording, help and option labels, acknowledgements, caveats, dependency labels, and each
 * eligible ledger entry's explanation and evidence notes.
 *
 * A SAFETY NET, NOT AN APPROVAL. Passing it means only that none of the listed words or phrases appears. It cannot tell whether a
 * sentence is accurate, fair or suitable: every string still needs its own human content approval, and is still refused without it.
 *
 * Negated "clearance" ("not a clearance") and "approved for Creator Records" are the only exceptions. Dependency labels may
 * additionally not use met / satisfied / confirmed / resolved (a label names something open, never something established).
 *
 * Pure, no imports.
 */

const BANNED = /\b(cleared|clearance|compliant|certified|certification|verified|verification|approved)\b|licensed to|permitted to|safe to|applies to you|governed by|does not apply/i
const ALLOWED = [/\bnot (a |an )?(legal )?clearance\b/gi, /\bnot cleared\b/gi, /\bapproved for Creator Records\b/gi]
const DEPENDENCY_BANNED = /\b(met|satisfied|confirmed|resolved)\b/i

/** True when the text uses a banned word or phrase (after removing the allowed negations). */
export function violatesCustomerWordingLock(text: string): boolean {
  let t = text
  for (const a of ALLOWED) t = t.replace(a, '')
  return BANNED.test(t)
}

/** True when a dependency label claims that something is established. */
export function violatesDependencyLabelLock(text: string): boolean {
  return DEPENDENCY_BANNED.test(text)
}
