import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { v2ListBadge } from '@/lib/creator-record-flow/dashboard'
import { consentControlState } from '@/lib/creator-record-flow/consent-dashboard'
import { ConsentWithdrawalControl } from '@/components/creator-record/ConsentWithdrawalControl'
import { CREATOR_RECORD_V1_NEW_SALES } from '@/lib/submissions/build-intake-insert'
import { V2_DASHBOARD } from '@/lib/creator-record-flow/wording'

// CR-V2-CUTOVER-1: new Creator Records start at the v2 entry point; /record (v1) only while v1 sales are open.
const CREATOR_RECORD_ENTRY = CREATOR_RECORD_V1_NEW_SALES === 'open' ? { href: '/record', label: 'Creator Record — $29' } : { href: '/creator-record', label: V2_DASHBOARD.entry_label }

type Submission = {
  id: string
  user_id: string
  title: string
  status: string
  payment_status: string
  /** CR-V2-MVP-M3: 'v2' for a Creator Record v2 submission. */
  creator_record_product?: string | null
  created_at: string
  [key: string]: any
}

async function getSubmissions(userId: string): Promise<Submission[]> {
  try {
    // Use supabaseAdmin directly (server-side, bypasses RLS)
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Dashboard: Error fetching submissions:', error)
      return []
    }

    return submissions || []
  } catch (error) {
    console.error('❌ Dashboard: Exception:', error)
    return []
  }
}

export default async function DashboardPage() {
  const supabase = createClient()

  // Use getUser() instead of getSession() as recommended by Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return null

  // Check if user is admin using service role (bypasses RLS)
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = userData?.is_admin || false


  // Get user's submissions using service_role (bypasses RLS)
  const submissions = await getSubmissions(user.id)

  /* CATALOG DISABLED: opt_ins fetch removed
  const { data: optIns } = await supabase
    .from('opt_ins')
    .select('*')
    .eq('user_id', user.id)
  */

  // SI8-APP-UX-REFRESH-1: the summary row (Total Submissions, Approved, and Total Earnings from the retired Showcase
  // licensing_deals) is removed by founder decision. Statuses below keep their existing meanings.
  // CR-V2-MVP-LAUNCH-FOUNDATION-1: Creator Record v2 creators only (anyone else sees no change).
  // CORRECTIONS-1: a v2 submission keeps the withdrawal available even when the consent state cannot be read.
  const consentControl = await consentControlState(user.id, { hasV2Submission: submissions.some((s) => s.creator_record_product === 'v2') })

  // Existing statuses and their text are unchanged; only the colours follow the website theme.
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'si8-badge-neutral',
      under_review: '',
      approved: 'si8-badge-ok',
      rejected: 'si8-badge-alert',
      needs_info: 'si8-badge-gold',
    }
    return (
      <span className={`si8-badge ${styles[status as keyof typeof styles] ?? styles.pending}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }
  // Creator Record v2 rows: the existing list badge (PAID / AWAITING PAYMENT / REFUNDED), unchanged; colour only.
  const v2Badge = (paymentStatus: string | null) => (
    <span className={`si8-badge ${paymentStatus === 'paid' ? '' : paymentStatus === 'refunded' ? 'si8-badge-neutral' : 'si8-badge-gold'}`}>
      {v2ListBadge(paymentStatus)}
    </span>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="si8-eyebrow mb-2">Your account</p>
          <h1 className="si8-display text-[34px] leading-tight">Dashboard</h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--si8-muted)' }}>Welcome back! Here&apos;s an overview of your submissions.</p>
        </div>
        <div className="flex items-center gap-4">
          {consentControl.show && (
            <a href="#account-controls" className="text-sm underline underline-offset-4" style={{ color: 'var(--si8-navy)' }}>Account controls</a>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">Admin Panel</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Records and submissions: the primary focus. Complete history, newest first. */}
      <section className="si8-panel" aria-labelledby="records-title">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-5 sm:px-6 py-5 border-b" style={{ borderColor: 'var(--si8-hair)' }}>
          <div>
            <h2 id="records-title" className="si8-display text-[22px]">Your Submissions</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--si8-muted)' }}>Track the status of your records and submissions</p>
          </div>
          {submissions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" className="h-auto min-h-9 py-2 whitespace-normal text-center" asChild>
                <Link href={CREATOR_RECORD_ENTRY.href}>{CREATOR_RECORD_ENTRY.label}</Link>
              </Button>
              {/* The product name must match the /certify purchase page (purchase-claims guard). */}
              <Button size="sm" className="h-auto min-h-9 py-2 whitespace-normal text-center" asChild>
                <Link href="/certify">SI8 Commercial Assurance Assessment — $499</Link>
              </Button>
            </div>
          )}
        </div>
        {submissions.length === 0 ? (
          <div className="text-center px-6 py-14">
            <p className="mb-6" style={{ color: 'var(--si8-muted)' }}>You haven&apos;t submitted any videos yet.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" size="sm" className="h-auto min-h-9 py-2 whitespace-normal text-center" asChild>
                <Link href={CREATOR_RECORD_ENTRY.href}>{CREATOR_RECORD_ENTRY.label}</Link>
              </Button>
              <Button size="sm" className="h-auto min-h-9 py-2 whitespace-normal text-center" asChild>
                <Link href="/certify">SI8 Commercial Assurance Assessment — $499</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_170px_140px_130px] gap-4 px-6 py-3 text-xs font-semibold uppercase" style={{ letterSpacing: '0.08em', color: 'var(--si8-faint)' }}>
              <span>Title</span><span>Status</span><span>Submitted</span><span className="sr-only">Actions</span>
            </div>
            <ul>
              {submissions.map((submission) => (
                <li key={submission.id} className="border-t px-5 sm:px-6 py-4 md:grid md:grid-cols-[minmax(0,1fr)_170px_140px_130px] md:gap-4 md:items-center" style={{ borderColor: 'var(--si8-hair)' }}>
                  <div className="font-medium break-words" style={{ color: 'var(--si8-deep)' }}>{submission.title}</div>
                  <div className="mt-2 md:mt-0">
                    {submission.creator_record_product === 'v2'
                      ? v2Badge(submission.payment_status)
                      : getStatusBadge(submission.status)}
                  </div>
                  <div className="mt-1 md:mt-0 text-sm" style={{ color: 'var(--si8-muted)' }}>
                    <span className="md:hidden">Submitted </span>{formatDate(submission.created_at)}
                  </div>
                  <div className="mt-3 md:mt-0 md:text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/submissions/${submission.id}`}>View Details</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Account controls: quieter, below the records, and linked from the page header. The control itself is unchanged. */}
      {consentControl.show && (
        <section id="account-controls" className="mt-10 scroll-mt-6" aria-label="Account controls">
          <p className="si8-eyebrow mb-3">Account controls</p>
          {/* The visibility condition is also kept verbatim on the control itself (launch-foundation guard). */}
          {consentControl.show && <ConsentWithdrawalControl initial={consentControl.initial} />}
        </section>
      )}
    </div>
  )
}
