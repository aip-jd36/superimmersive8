/**
 * SI8-SIGNUP-COPY-1 (founder-approved, 2026-11-20): the product context shown above the sign-up form.
 *
 * The copy below is founder-approved wording. Change it only under a new approval: the six bullets and the two
 * disclaimers are asserted verbatim by __tests__/auth/signup-product-copy.test.tsx, which also guards against the
 * retired claims (Chain of Title, brand legal / E&O acceptance, campaign budgets, the SI8 Certified label and stamp).
 * Prices are display copy only; the charged amount comes from the server price function.
 */

export const SIGNUP_COPY = {
  heading: 'What can you do with SI8?',
  creatorRecord: {
    name: 'Creator Record',
    price: '$29',
    label: 'Automated',
    bullets: [
      'Document your AI video production',
      'Add supporting evidence',
      'Receive your PDF automatically',
    ],
    disclaimer: 'Not human-reviewed or commercial clearance.',
  },
  assessment: {
    name: 'Commercial Assurance Assessment',
    price: '$499',
    label: 'Human-reviewed',
    bullets: [
      'SI8 reviews your production and evidence',
      'Receive findings and evidence gaps',
      'Identify commercial-use risks and unresolved issues',
    ],
    disclaimer: 'Not legal advice or guaranteed clearance.',
  },
  subtitle: {
    generic: 'Create your SI8 account to get started.',
    certify: "You'll be taken to the Commercial Assurance Assessment form after signing up.",
  },
} as const

type ProductCopy = typeof SIGNUP_COPY.creatorRecord | typeof SIGNUP_COPY.assessment

function ProductLabel({ text, dark }: { text: string; dark: boolean }) {
  return (
    <span style={{
      background: dark ? '#C8900A' : '#1a1918',
      color: dark ? '#fff' : '#aaa',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '1px',
      padding: '3px 8px',
      borderRadius: '3px',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

function ProductColumn({ product, humanReviewed }: { product: ProductCopy; humanReviewed: boolean }) {
  return (
    <>
      <div style={{ marginBottom: '6px' }}>
        <ProductLabel text={product.label} dark={humanReviewed} />
      </div>
      <div style={{ color: '#C8900A', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
        {product.name} — {product.price}
      </div>
      <ul style={{ color: '#6b6458', fontSize: '12px', lineHeight: 1.6, listStyle: 'none', padding: 0, margin: 0 }}>
        {product.bullets.map((bullet) => (
          <li key={bullet}>✓ {bullet}</li>
        ))}
      </ul>
      <p style={{ color: '#999', fontSize: '11px', margin: '8px 0 0', fontStyle: 'italic' }}>{product.disclaimer}</p>
    </>
  )
}

/** The sign-up page's product context: the Assessment alone for `/certify`, otherwise the two-product comparison. */
export function SignupProductContext({ nextPath }: { nextPath: string }) {
  if (nextPath === '/certify') {
    return (
      <div style={{
        background: '#FFFBF5',
        border: '1px solid #C8900A',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '24px',
      }}>
        <ProductColumn product={SIGNUP_COPY.assessment} humanReviewed />
      </div>
    )
  }

  return (
    <div style={{
      background: '#FFFBF5',
      border: '1px solid #e8d5a3',
      borderRadius: '8px',
      padding: '16px 18px',
      marginBottom: '24px',
    }}>
      <p style={{ color: '#8C7A4A', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        {SIGNUP_COPY.heading}
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1, borderRight: '1px solid #e8d5a3', paddingRight: '12px' }}>
          <ProductColumn product={SIGNUP_COPY.creatorRecord} humanReviewed={false} />
        </div>
        <div style={{ flex: 1 }}>
          <ProductColumn product={SIGNUP_COPY.assessment} humanReviewed />
        </div>
      </div>
    </div>
  )
}
