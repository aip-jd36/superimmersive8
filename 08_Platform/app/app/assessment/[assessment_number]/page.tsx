/**
 * Public Verification Page
 *
 * Route: /assessment/{assessment_number}
 *
 * Security: public, no auth required.
 * Must NEVER expose: customer identity, campaign identity, evidence, reviewer
 * notes, confidence, findings, or internal reasoning.
 *
 * The API route / repository query enforces the field allowlist.
 * This component renders only what findAssessmentForVerification returns.
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { findAssessmentForVerification } from '@/lib/assessments/repository'
import { OUTCOME_LABELS, ASSESSMENT_DOMAINS } from '@/types/assessment'
import type { InstitutionalStatus, VerificationPageData } from '@/types/assessment'

interface PageProps {
  params: { assessment_number: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Assessment ${params.assessment_number} — SuperImmersive 8`,
    description: 'SI8 commercial assurance assessment verification record.',
    robots: { index: false, follow: false },
  }
}

export default async function VerificationPage({ params }: PageProps) {
  const { assessment_number } = params

  const assessment = await findAssessmentForVerification(assessment_number)

  if (!assessment) {
    return <AssessmentNotFound assessmentNumber={assessment_number} />
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAF7',
        color: '#1a1918',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: '#fff',
          padding: '0 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
              color: '#1a1918',
            }}
          >
            SuperImmersive{' '}
            <span style={{ color: '#C8900A' }}>8</span>
          </span>
          <a
            href="https://www.superimmersive8.com"
            style={{
              fontSize: '0.8125rem',
              color: '#8C8A82',
              textDecoration: 'none',
            }}
          >
            superimmersive8.com
          </a>
        </div>
      </div>

      {/* Status banner for SUPERSEDED or WITHDRAWN */}
      <InstitutionalStatusBanner assessment={assessment} />

      {/* Main content */}
      <main
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          padding: '2.5rem 1.5rem 4rem',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#8C8A82',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}
          >
            Commercial Assurance Assessment
          </div>
          <h1
            style={{
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: 0,
              color: '#1a1918',
              fontVariantNumeric: 'tabular-nums',
              fontVariantLigatures: 'none',
            }}
          >
            <span style={{ fontFamily: 'ui-monospace, "Cascadia Code", monospace', fontWeight: 600 }}>
              {assessment_number}
            </span>
          </h1>
        </div>

        {/* Outcome block */}
        <OutcomeBlock outcome={assessment.outcome} />

        {/* Assessment details table */}
        <Section title="Assessment Details">
          <DetailRow label="Assessment Date" value={formatDate(assessment.assessment_date)} />
          <DetailRow label="Methodology" value={assessment.methodology_version} />
          <DetailRow label="Reviewer Organization" value={assessment.reviewer_organization} />
          <DetailRow
            label="Institutional Status"
            value={<InstitutionalStatusBadge status={assessment.institutional_status} />}
          />
        </Section>

        {/* Assessment scope */}
        <Section title="Assessment Scope">
          <p
            style={{
              fontSize: '0.875rem',
              color: '#52504A',
              marginBottom: '1rem',
              lineHeight: 1.6,
            }}
          >
            This assessment reviewed the following domains. Domain scope indicates areas
            covered — no domain scores, risk indicators, or individual findings are
            disclosed in this record.
          </p>
          <DomainList />
        </Section>

        {/* Numbers verification link */}
        <NumbersVerificationSection assessment={assessment} />

        {/* Legal footer */}
        <footer
          style={{
            marginTop: '3rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            fontSize: '0.8125rem',
            color: '#8C8A82',
            lineHeight: 1.7,
          }}
        >
          This assessment represents SI8&apos;s independent commercial assurance opinion
          based on the evidence submitted at the assessment date. It is not legal advice.
        </footer>
      </main>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AssessmentNotFound({ assessmentNumber }: { assessmentNumber: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAF7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'Space Grotesk, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1rem',
          color: '#C8900A',
          marginBottom: '1.5rem',
        }}
      >
        SuperImmersive 8
      </div>
      <h1
        style={{
          fontFamily: 'Space Grotesk, system-ui, sans-serif',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#1a1918',
          marginBottom: '0.75rem',
        }}
      >
        Assessment not found
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#52504A', maxWidth: '400px', lineHeight: 1.6 }}>
        No record matching{' '}
        <span
          style={{
            fontFamily: 'ui-monospace, "Cascadia Code", monospace',
            backgroundColor: 'rgba(0,0,0,0.05)',
            padding: '0.125rem 0.375rem',
            borderRadius: '3px',
          }}
        >
          {assessmentNumber}
        </span>{' '}
        was found in the SI8 Assessment Registry. Verify the assessment number and try again.
      </p>
    </div>
  )
}

function InstitutionalStatusBanner({
  assessment,
}: {
  assessment: VerificationPageData
}) {
  const { institutional_status, status_reason } = assessment

  if (institutional_status === 'ACTIVE') return null

  const isSuperseded = institutional_status === 'SUPERSEDED'

  // Try to extract a replacement assessment number from status_reason
  const replacementMatch = status_reason?.match(/ASSESS-\d{3}-\d{4}-\d{2}-\d{2}/)
  const replacementNumber = replacementMatch?.[0]

  return (
    <div
      role="alert"
      style={{
        backgroundColor: isSuperseded ? '#FEF3C7' : '#FEE2E2',
        borderBottom: `1px solid ${isSuperseded ? '#F59E0B' : '#EF4444'}`,
        padding: '0.875rem 1.5rem',
      }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <strong
          style={{
            fontSize: '0.875rem',
            color: isSuperseded ? '#92400E' : '#991B1B',
          }}
        >
          {isSuperseded ? 'This assessment has been superseded.' : 'This assessment has been withdrawn.'}
        </strong>
        {status_reason && (
          <p style={{ fontSize: '0.8125rem', color: isSuperseded ? '#92400E' : '#991B1B', margin: '0.25rem 0 0' }}>
            {status_reason}
            {isSuperseded && replacementNumber && (
              <>
                {' '}
                <a
                  href={`/assessment/${replacementNumber}`}
                  style={{ color: 'inherit', fontWeight: 600 }}
                >
                  View {replacementNumber} →
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

function OutcomeBlock({ outcome }: { outcome: string }) {
  const label = OUTCOME_LABELS[outcome as keyof typeof OUTCOME_LABELS] ?? outcome
  const isPositive =
    outcome === 'EVIDENCE_SUPPORTS' || outcome === 'EVIDENCE_SUPPORTS_WITH_CONDITIONS'
  const isRisk = outcome === 'MATERIAL_RISKS_IDENTIFIED'

  const bgColor = isPositive
    ? 'rgba(22,163,74,0.06)'
    : isRisk
    ? 'rgba(239,68,68,0.06)'
    : 'rgba(0,0,0,0.04)'

  const borderColor = isPositive
    ? 'rgba(22,163,74,0.2)'
    : isRisk
    ? 'rgba(239,68,68,0.2)'
    : 'rgba(0,0,0,0.12)'

  const indicatorColor = isPositive
    ? '#16a34a'
    : isRisk
    ? '#dc2626'
    : '#8C8A82'

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.875rem',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: indicatorColor,
          flexShrink: 0,
          marginTop: '4px',
        }}
      />
      <div>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: '#8C8A82',
            textTransform: 'uppercase',
            marginBottom: '0.25rem',
          }}
        >
          Outcome
        </div>
        <div
          style={{
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: '#1a1918',
            lineHeight: 1.4,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#8C8A82',
          margin: '0 0 0.875rem',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '8px',
          backgroundColor: '#fff',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: '1rem',
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        fontSize: '0.875rem',
      }}
    >
      <div style={{ color: '#8C8A82', fontWeight: 500 }}>{label}</div>
      <div style={{ color: '#1a1918' }}>{value}</div>
    </div>
  )
}

function InstitutionalStatusBadge({ status }: { status: InstitutionalStatus }) {
  const colors: Record<InstitutionalStatus, { bg: string; text: string }> = {
    ACTIVE:     { bg: 'rgba(22,163,74,0.1)',  text: '#15803d' },
    SUPERSEDED: { bg: 'rgba(245,158,11,0.1)', text: '#b45309' },
    WITHDRAWN:  { bg: 'rgba(239,68,68,0.1)',  text: '#b91c1c' },
  }
  const c = colors[status]
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.1875rem 0.5rem',
        borderRadius: '4px',
        backgroundColor: c.bg,
        color: c.text,
        letterSpacing: '0.04em',
      }}
    >
      {status}
    </span>
  )
}

function DomainList() {
  return (
    <div>
      {ASSESSMENT_DOMAINS.map(({ code, label }, idx) => (
        <div
          key={code}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 1.25rem',
            borderBottom:
              idx < ASSESSMENT_DOMAINS.length - 1
                ? '1px solid rgba(0,0,0,0.06)'
                : 'none',
            fontSize: '0.875rem',
          }}
        >
          <span
            style={{
              fontFamily: 'ui-monospace, "Cascadia Code", monospace',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#C8900A',
              width: '20px',
              flexShrink: 0,
            }}
          >
            {code}
          </span>
          <span style={{ color: '#1a1918' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function NumbersVerificationSection({ assessment }: { assessment: VerificationPageData }) {
  const { numbers_asset_id, processing_status } = assessment

  // If signing has not yet occurred, don't render this section at all
  if (processing_status === 'DRAFT' || processing_status === 'REPORT_GENERATED') {
    return null
  }

  // Numbers verification link unavailable (signing in progress or failed)
  if (!numbers_asset_id) {
    return (
      <Section title="Provenance Verification">
        <div
          style={{
            padding: '1rem 1.25rem',
            fontSize: '0.875rem',
            color: '#8C8A82',
            lineHeight: 1.6,
          }}
        >
          Provenance verification is temporarily unavailable.
        </div>
      </Section>
    )
  }

  // TODO (ADR-001): This URL is provider-specific. If SI8 migrates from Numbers Protocol
  // to a different provenance provider, this URL pattern will need updating.
  // See: lib/assessments/ADR-001-provenance-provider-persistence.md
  const verifyUrl = `https://verify.numbersprotocol.io/asset-profile?nid=${numbers_asset_id}`

  return (
    <Section title="Provenance Verification">
      <div
        style={{
          padding: '1rem 1.25rem',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          color: '#52504A',
        }}
      >
        <p style={{ margin: '0 0 0.875rem' }}>
          The source video associated with this assessment has been registered with the
          Numbers Protocol network. The registration embeds SI8&apos;s assessment metadata
          as C2PA credentials in the file.
        </p>
        <a
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#C8900A',
            textDecoration: 'none',
          }}
        >
          View on Numbers Protocol
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M2.5 2.5H9.5M9.5 2.5V9.5M9.5 2.5L2.5 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', color: '#8C8A82' }}>
          Asset ID:{' '}
          <span
            style={{
              fontFamily: 'ui-monospace, "Cascadia Code", monospace',
              fontSize: '0.8125rem',
            }}
          >
            {numbers_asset_id}
          </span>
        </p>
      </div>
    </Section>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate + 'T12:00:00Z').toLocaleDateString('en-US', {
      year:  'numeric',
      month: 'long',
      day:   'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return isoDate
  }
}
