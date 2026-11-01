/**
 * CR-V2-CUTOVER-1 — /record is the retired Creator Record v1 intake form. While v1 sales are retired
 * every visit goes to the Creator Record v2 entry point (/creator-record), which applies its own stops.
 * The form itself is kept unchanged behind this layout only as the reviewed rollback lever; the
 * server-side create and checkout routes refuse v1 regardless of what any page renders.
 */
import { redirect } from 'next/navigation'
import { CREATOR_RECORD_V1_NEW_SALES } from '@/lib/submissions/build-intake-insert'

export const dynamic = 'force-dynamic'

export default function RecordLayout({ children }: { children: React.ReactNode }) {
  if (CREATOR_RECORD_V1_NEW_SALES !== 'open') redirect('/creator-record')
  return <>{children}</>
}
