import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 24,
    borderBottom: '2 solid #d97706',
    paddingBottom: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d97706',
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#6b7280',
  },
  stampBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#d97706',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: '10 16',
    marginBottom: 20,
  },
  stampTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400e',
    textAlign: 'center',
    marginBottom: 4,
  },
  stampSubtitle: {
    fontSize: 9,
    color: '#92400e',
    textAlign: 'center',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1 solid #e5e7eb',
  },
  field: {
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    color: '#1f2937',
    lineHeight: 1.4,
  },
  table: {
    marginTop: 8,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 6,
    fontWeight: 'bold',
    fontSize: 9,
    borderBottom: '1 solid #d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1 solid #e5e7eb',
    fontSize: 9,
  },
  tableCol1: { width: '35%' },
  tableCol2: { width: '20%' },
  tableCol3: { width: '20%' },
  tableCol4: { width: '25%' },
  checkRow: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'flex-start',
  },
  checkMark: {
    fontSize: 10,
    color: '#059669',
    marginRight: 6,
    width: 12,
  },
  checkLabel: {
    fontSize: 9,
    color: '#374151',
    flex: 1,
    lineHeight: 1.4,
  },
  attestBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: '8 12',
    marginTop: 8,
  },
  attestText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
  noticeBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: '6 10',
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 8,
    color: '#92400e',
    lineHeight: 1.4,
  },
})

interface Tool {
  tool_name: string
  version: string
  plan_type: string
  start_date?: string
  end_date?: string
  receipt_url?: string
}

interface CreatorRecordData {
  creatorRecordId: string
  filmmakerName: string
  title: string
  issuedAt: string
  tools: Tool[]
  authorshipStatement?: string
  likenessConfirmation?: {
    no_real_faces?: boolean
    no_real_voices?: boolean
    no_lookalikes?: boolean
    no_synthetic_people?: boolean
  }
  ipConfirmation?: {
    no_copyrighted_characters?: boolean
    no_brand_imitation?: boolean
    no_trademarked_ip?: boolean
  }
  territory?: string
}

export const CreatorRecordPDF: React.FC<{ data: CreatorRecordData }> = ({ data }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const likenessHasLicense = (data.likenessConfirmation as any)?.has_licensed_content === true
  const likenessLicenseNotes = (data.likenessConfirmation as any)?.license_notes

  const likenessItems = likenessHasLicense
    ? [['Licensed content — creator holds rights documentation', true]] as [string, boolean][]
    : [
        ['No real faces or identifiable likenesses', data.likenessConfirmation?.no_real_faces],
        ['No real voices cloned or replicated', data.likenessConfirmation?.no_real_voices],
        ['No lookalikes of real persons', data.likenessConfirmation?.no_lookalikes],
        ['No synthetic people intended to deceive', data.likenessConfirmation?.no_synthetic_people],
      ] as [string, boolean | undefined][]

  const ipHasLicense = (data.ipConfirmation as any)?.has_licensed_content === true
  const ipLicenseNotes = (data.ipConfirmation as any)?.license_notes

  const ipItems = ipHasLicense
    ? [['Licensed content — creator holds rights documentation', true]] as [string, boolean][]
    : [
        ['No copyrighted characters or franchises', data.ipConfirmation?.no_copyrighted_characters],
        ['No brand imitation or unauthorized logos', data.ipConfirmation?.no_brand_imitation],
        ['No trademarked IP without authorization', data.ipConfirmation?.no_trademarked_ip],
      ] as [string, boolean | undefined][]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>SI8</Text>
          <Text style={styles.headerTitle}>Creator Record</Text>
          <Text style={styles.headerSubtitle}>
            Self-Attested Documentation • Record ID: {data.creatorRecordId}
          </Text>
        </View>

        {/* Stamp */}
        <View style={styles.stampBox}>
          <Text style={styles.stampTitle}>SELF-ATTESTED — NOT FOR COMMERCIAL USE</Text>
          <Text style={styles.stampSubtitle}>
            This document is self-attested by the creator. It has not been reviewed by SI8 staff.{'\n'}
            Upgrade to SI8 Certified ($499) for commercial clearance and human review.
          </Text>
        </View>

        {/* Film Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Film Information</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title</Text>
            <Text style={styles.fieldValue}>{data.title}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Creator</Text>
            <Text style={styles.fieldValue}>{data.filmmakerName}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Creator Record ID</Text>
            <Text style={styles.fieldValue}>{data.creatorRecordId}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Issued</Text>
            <Text style={styles.fieldValue}>{formatDate(data.issuedAt)}</Text>
          </View>
          {data.territory && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Territory (Self-Declared)</Text>
              <Text style={styles.fieldValue}>{data.territory}</Text>
            </View>
          )}
        </View>

        {/* Tool Disclosure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. AI Tool Disclosure (Self-Declared)</Text>
          {data.tools.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCol1}>Tool Name</Text>
                <Text style={styles.tableCol2}>Version</Text>
                <Text style={styles.tableCol3}>Plan Type</Text>
                <Text style={styles.tableCol4}>Period</Text>
              </View>
              {data.tools.map((tool, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCol1}>{tool.tool_name || '—'}</Text>
                  <Text style={styles.tableCol2}>{tool.version || '—'}</Text>
                  <Text style={styles.tableCol3}>{tool.plan_type || '—'}</Text>
                  <Text style={styles.tableCol4}>
                    {tool.start_date && tool.end_date
                      ? `${formatDate(tool.start_date)} – ${formatDate(tool.end_date)}`
                      : tool.start_date
                        ? formatDate(tool.start_date)
                        : '—'}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.fieldValue}>No AI tools declared.</Text>
          )}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Tool receipts are not verified by SI8 for Creator Record tier. Creator warrants they retain receipts and will produce them if legally challenged.
            </Text>
          </View>
        </View>

        {/* Human Authorship Declaration */}
        {data.authorshipStatement && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Human Authorship Declaration</Text>
            <View style={styles.attestBox}>
              <Text style={styles.attestText}>{data.authorshipStatement}</Text>
            </View>
          </View>
        )}
      </Page>

      <Page size="A4" style={styles.page}>
        {/* Page 2 header */}
        <View style={styles.header}>
          <Text style={styles.logo}>SI8</Text>
          <Text style={styles.headerSubtitle}>
            Creator Record • {data.creatorRecordId} • Page 2
          </Text>
        </View>

        {/* Likeness & Identity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Likeness & Identity — Self-Attestation</Text>
          {likenessItems.map(([label, val], idx) => (
            <View key={idx} style={styles.checkRow}>
              <Text style={styles.checkMark}>{val ? '[Y]' : '[ ]'}</Text>
              <Text style={styles.checkLabel}>{label}</Text>
            </View>
          ))}
          {likenessHasLicense && likenessLicenseNotes ? (
            <Text style={[styles.checkLabel, { marginTop: 4, color: '#6b7280' }]}>
              Notes: {likenessLicenseNotes}
            </Text>
          ) : null}
        </View>

        {/* IP & Brand */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. IP & Brand — Self-Attestation</Text>
          {ipItems.map(([label, val], idx) => (
            <View key={idx} style={styles.checkRow}>
              <Text style={styles.checkMark}>{val ? '[Y]' : '[ ]'}</Text>
              <Text style={styles.checkLabel}>{label}</Text>
            </View>
          ))}
          {ipHasLicense && ipLicenseNotes ? (
            <Text style={[styles.checkLabel, { marginTop: 4, color: '#6b7280' }]}>
              Notes: {ipLicenseNotes}
            </Text>
          ) : null}
        </View>

        {/* Evidence Custodian */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Evidence Custodian Declaration</Text>
          <View style={styles.attestBox}>
            <Text style={styles.attestText}>
              Creator warrants that they retain all AI-generated prompt logs, tool receipts, and production records internally and will produce them upon request if this content is ever subject to legal challenge.
            </Text>
          </View>
        </View>

        {/* Indemnification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Indemnification Warranty</Text>
          <View style={styles.attestBox}>
            <Text style={styles.attestText}>
              Creator warrants the accuracy of all disclosures in this record and agrees to indemnify and hold harmless SuperImmersive 8 (PMF Strategy Inc. d/b/a SuperImmersive 8) from any third-party claims arising from inaccurate or incomplete disclosures.
            </Text>
          </View>
        </View>

        {/* Upgrade Notice */}
        <View style={styles.noticeBox}>
          <Text style={[styles.noticeText, { fontWeight: 'bold', marginBottom: 3 }]}>
            Want to use this film commercially?
          </Text>
          <Text style={styles.noticeText}>
            Upgrade to SI8 Certified ($499) for a human-reviewed Chain of Title stamped "CLEARED FOR COMMERCIAL USE." Required for brand placements, agency deliverables, streaming submissions, and E&O insurance.{'\n'}
            Visit: www.superimmersive8.com/submit
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This Creator Record is a self-attested documentation issued by SuperImmersive 8 (PMF Strategy Inc. d/b/a SuperImmersive 8).
          </Text>
          <Text style={{ marginTop: 4 }}>
            Generated: {new Date().toLocaleDateString('en-US')} • www.superimmersive8.com
          </Text>
          <Text style={{ marginTop: 4, fontSize: 7 }}>
            This document has NOT been reviewed by SI8 staff. It does not constitute legal advice, a legal guarantee, or commercial clearance.
            NOT FOR COMMERCIAL USE without upgrading to SI8 Certified.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
