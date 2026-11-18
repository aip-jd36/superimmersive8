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
// SI8-APP-UX-FLOW-2 (founder decision): the dashboard's Commercial Assurance product card. It names the /certify purchase
// page's product ('SI8 Commercial Assurance Assessment — $499') and links only to /certify (purchase-claims guard).
const COMMERCIAL_ASSURANCE_CARD = { name: 'Commercial Assurance Assessment', price: '$499', href: '/certify', cta: 'Explore assessment' } as const

/** Product grouping by the stored tier (authoritative classification); anything else is never relabelled. */
type ProductGroup = 'creator_record' | 'commercial_assurance' | 'other'
function productGroup(s: { tier?: string | null }): ProductGroup {
  if (s.tier === 'creator_record') return 'creator_record'
  if (s.tier === 'si8_certified') return 'commercial_assurance'
  return 'other'
}

/**
 * SI8-APP-UX-FLOW-2: the declared video title of each Creator Record v2 submission, read server-side from its own prepared
 * record (question P1, the title the PDF shows verbatim). Only that one field is selected, only for this user's rows and only
 * for submissions already loaded for this user. Missing or unreadable titles fall back to the stored submission title.
 */
async function getCreatorRecordTitles(userId: string, submissionIds: string[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>()
  if (submissionIds.length === 0) return titles
  try {
    const { data, error } = await supabaseAdmin
      .from('creator_record_v2_prepared')
      .select('submission_id, p1:form_state->answers->P1')
      .eq('user_id', userId)
      .in('submission_id', submissionIds)
    if (error) {
      console.error('Dashboard: Creator Record titles unavailable:', error.code)
      return titles
    }
    for (const row of (data ?? []) as unknown as { submission_id: string | null; p1: unknown }[]) {
      const first = Array.isArray(row.p1) ? row.p1[0] : null
      const title = typeof first === 'string' ? first.trim() : ''
      if (row.submission_id && title) titles.set(row.submission_id, title)
    }
  } catch (error) {
    console.error('Dashboard: Creator Record titles unavailable')
  }
  return titles
}

type Submission = {
  id: string
  user_id: string
  title: string
  status: string
  payment_status: string
  /** CR-V2-MVP-M3: 'v2' for a Creator Record v2 submission. */
  creator_record_product?: string | null
  /** Stored product classification: 'creator_record', 'si8_certified' or the legacy default 'certified'. */
  tier?: string | null
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
  const creatorRecordTitles = await getCreatorRecordTitles(user.id, submissions.filter((s) => s.creator_record_product === 'v2').map((s) => s.id))
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

  const recordName = (s: Submission) => (s.creator_record_product === 'v2' ? creatorRecordTitles.get(s.id) ?? s.title : s.title)
  const groups: { key: ProductGroup; heading: string; empty: string | null }[] = [
    { key: 'creator_record', heading: 'Creator Record', empty: 'No Creator Records yet.' },
    { key: 'commercial_assurance', heading: 'Commercial Assurance Assessment', empty: 'No assessments yet.' },
    { key: 'other', heading: 'Other submissions', empty: null },
  ]
  const ROW_GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_170px_140px_130px] md:gap-4 md:items-center'

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

      {/* A. Start something new: the two products, presented alike. */}
      <section aria-labelledby="start-title">
        <h2 id="start-title" className="si8-display text-[22px] mb-4">Start something new</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="si8-panel p-6 flex flex-col">
            <h3 className="si8-display text-[20px]">{CREATOR_RECORD_ENTRY.label}</h3>
            <p className="si8-display text-[28px] mt-2">$29</p>
            <p className="text-[15px] mt-2 flex-1" style={{ color: 'var(--si8-muted)' }}>Document your AI-video production.</p>
            <Button asChild className="mt-5 w-full sm:w-auto sm:self-start">
              <Link href={CREATOR_RECORD_ENTRY.href}>Create a record</Link>
            </Button>
          </div>
          <div className="si8-panel p-6 flex flex-col">
            <h3 className="si8-display text-[20px]">{COMMERCIAL_ASSURANCE_CARD.name}</h3>
            <p className="si8-display text-[28px] mt-2">{COMMERCIAL_ASSURANCE_CARD.price}</p>
            <p className="text-[15px] mt-2 flex-1" style={{ color: 'var(--si8-muted)' }}>Human-reviewed assessment of project evidence.</p>
            <Button asChild className="mt-5 w-full sm:w-auto sm:self-start">
              <Link href={COMMERCIAL_ASSURANCE_CARD.href}>{COMMERCIAL_ASSURANCE_CARD.cta}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* B. Your records: complete history, newest first, grouped by stored product tier. */}
      <section className="mt-10" aria-labelledby="records-title">
        <h2 id="records-title" className="si8-display text-[22px]">Your records</h2>
        <p className="text-sm mt-1 mb-4" style={{ color: 'var(--si8-muted)' }}>Track the status of your records and submissions</p>
        <div className="space-y-6">
          {groups.map((g) => {
            const rows = submissions.filter((s) => productGroup(s) === g.key)
            if (rows.length === 0 && g.empty === null) return null
            return (
              <div key={g.key} className="si8-panel" aria-labelledby={`group-${g.key}`}>
                <h3 id={`group-${g.key}`} className="px-5 sm:px-6 pt-5 pb-3 si8-eyebrow">{g.heading}</h3>
                {rows.length === 0 ? (
                  <p className="border-t px-5 sm:px-6 py-4 text-sm" style={{ borderColor: 'var(--si8-hair)', color: 'var(--si8-muted)' }}>{g.empty}</p>
                ) : (
                  <>
                    <div className={`hidden ${ROW_GRID} border-t px-6 py-2 text-xs font-semibold uppercase`} style={{ letterSpacing: '0.08em', color: 'var(--si8-faint)', borderColor: 'var(--si8-hair)' }}>
                      <span>Title</span><span>Status</span><span>Submitted</span><span className="sr-only">Actions</span>
                    </div>
                    <ul>
                      {rows.map((submission) => (
                        <li key={submission.id} className={`border-t px-5 sm:px-6 py-4 ${ROW_GRID}`} style={{ borderColor: 'var(--si8-hair)' }}>
                          <div className="font-medium break-words" style={{ color: 'var(--si8-deep)' }}>{recordName(submission)}</div>
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
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* C. Account controls: quieter, below the records, and linked from the page header. The control itself is unchanged. */}
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
