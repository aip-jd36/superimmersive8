/**
 * SI8-UX-2 local browser harness entry. Renders the REAL Creator Record client (`CreatorRecordV2Client`) with the PRODUCTION
 * question registry, presentation and acknowledgements (exported at build time by `./export-props.ts` into
 * `window.__UX2_PROPS__`), against the fake in-page API (`./fake-api`). Synthetic data only; no network. Live-examination mode is
 * shown (storage consent + separate AI permission), with harness-only identifiers. Built by `./build-harness.mjs` into a scratch
 * directory; never served by the app.
 */
import { createRoot } from 'react-dom/client'
import { CreatorRecordV2Client } from '@/app/creator-record/CreatorRecordV2Client'
import { installFakeApi } from './fake-api'

const p = (window as any).__UX2_PROPS__
installFakeApi({ registryInput: p.registryInput, presentation: p.presentation, acknowledgements: p.acknowledgements, maxTools: p.maxTools, contractSha256: p.questionnaireContractSha256 })

createRoot(document.getElementById('root')!).render(
  <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
    <CreatorRecordV2Client
      registryInput={p.registryInput}
      presentation={p.presentation}
      acknowledgements={p.acknowledgements}
      maxTools={p.maxTools}
      questionnaireContractSha256={p.questionnaireContractSha256}
      paymentOpen
      examination={{ consentVersion: 'harness-consent-version', aiPermissionVersion: 'harness-ai-permission-version' }}
    />
  </main>,
)
