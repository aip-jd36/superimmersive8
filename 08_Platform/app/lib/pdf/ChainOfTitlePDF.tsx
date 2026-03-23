import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #818cf8',
    paddingBottom: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#818cf8',
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
  section: {
    marginBottom: 20,
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
    backgroundColor: '#f3f4f6',
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
  tableCol1: {
    width: '30%',
  },
  tableCol2: {
    width: '20%',
  },
  tableCol3: {
    width: '20%',
  },
  tableCol4: {
    width: '30%',
  },
  list: {
    marginTop: 4,
    marginBottom: 4,
  },
  listItem: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 3,
    paddingLeft: 10,
  },
  badge: {
    display: 'flex',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 4,
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
  watermark: {
    fontSize: 8,
    color: '#22c55e',
    fontWeight: 'bold',
    marginTop: 4,
  },
})

interface Tool {
  tool_name: string
  version: string
  plan_type: string
  start_date: string
  end_date: string
  receipt_url?: string
  receipt_path?: string
}

interface ChainOfTitleData {
  catalogId: string
  filmmakerName: string
  title: string
  reviewedBy: string
  reviewedAt: string
  tier: 'Certified' | 'Standard'
  tools: Tool[]
  modelDisclosure: string
  commercialUseAuthorization: string
  modificationRights: {
    authorized: boolean
    scope?: string
  }
  categoryConflicts: string[]
  territory: string
  regenerationRights: {
    authorized: boolean
    scenes?: string
  }
  versionHistory: string
}

export const ChainOfTitlePDF: React.FC<{ data: ChainOfTitleData }> = ({ data }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>SI8</Text>
          <Text style={styles.headerTitle}>Chain of Title Documentation</Text>
          <Text style={styles.headerSubtitle}>
            Rights Verified Content • Catalog ID: {data.catalogId}
          </Text>
          <Text style={styles.watermark}>Rights Verified</Text>
        </View>

        {/* Film Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Film Information</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title</Text>
            <Text style={styles.fieldValue}>{data.title}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Filmmaker</Text>
            <Text style={styles.fieldValue}>{data.filmmakerName}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Catalog ID</Text>
            <Text style={styles.fieldValue}>{data.catalogId}</Text>
          </View>
        </View>

        {/* 1. Tool Provenance Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Tool Provenance Log</Text>

          {/* Table Header */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol1}>Tool Name</Text>
              <Text style={styles.tableCol2}>Version</Text>
              <Text style={styles.tableCol3}>Plan Type</Text>
              <Text style={styles.tableCol4}>Production Period</Text>
            </View>

            {/* Table Rows */}
            {data.tools.map((tool, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCol1}>{tool.tool_name}</Text>
                <Text style={styles.tableCol2}>{tool.version}</Text>
                <Text style={styles.tableCol3}>{tool.plan_type}</Text>
                <Text style={styles.tableCol4}>
                  {formatDate(tool.start_date)} - {formatDate(tool.end_date)}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.fieldValue}>
            {data.tools.length} tool(s) documented with commercial plan receipts on file.
          </Text>
        </View>

        {/* 2. Model Disclosure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Model Disclosure</Text>
          <Text style={styles.fieldValue}>{data.modelDisclosure}</Text>
        </View>

        {/* 3. Rights Verified Sign-off */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Rights Verified Sign-off</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Reviewed By</Text>
            <Text style={styles.fieldValue}>{data.reviewedBy}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Review Date</Text>
            <Text style={styles.fieldValue}>{formatDate(data.reviewedAt)}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tier Assignment</Text>
            <Text style={styles.fieldValue}>{data.tier}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldValue}>
              This content has passed SI8's Rights Verified review process and has been cleared for commercial licensing.
            </Text>
          </View>
        </View>

        {/* 4. Commercial Use Authorization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Commercial Use Authorization</Text>
          <Text style={styles.fieldValue}>{data.commercialUseAuthorization}</Text>
        </View>

        {/* Page Break */}
      </Page>

      <Page size="A4" style={styles.page}>
        {/* Header on second page */}
        <View style={styles.header}>
          <Text style={styles.logo}>SI8</Text>
          <Text style={styles.headerSubtitle}>
            Chain of Title • {data.catalogId} • Page 2
          </Text>
        </View>

        {/* 5. Modification Rights Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Modification Rights Status</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Authorization Status</Text>
            <Text style={styles.fieldValue}>
              {data.modificationRights.authorized ? 'AUTHORIZED' : 'NOT AUTHORIZED'}
            </Text>
          </View>
          {data.modificationRights.scope && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Scope</Text>
              <Text style={styles.fieldValue}>{data.modificationRights.scope}</Text>
            </View>
          )}
          <View style={styles.field}>
            <Text style={styles.fieldValue}>
              {data.modificationRights.authorized
                ? 'Filmmaker has authorized SI8 to commission AI-regenerated brand-integrated versions for Custom AI Placement deals.'
                : 'Filmmaker has not authorized modifications. This content is available for catalog licensing only (Tier 1).'}
            </Text>
          </View>
        </View>

        {/* 6. Category Conflict Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Category Conflict Log</Text>
          {data.categoryConflicts.length > 0 ? (
            <View style={styles.list}>
              {data.categoryConflicts.map((conflict, index) => (
                <Text key={index} style={styles.listItem}>• {conflict}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.fieldValue}>No category conflicts identified. Content is suitable for all brand categories.</Text>
          )}
        </View>

        {/* 7. Territory Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Territory Log</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Licensed Territory</Text>
            <Text style={styles.fieldValue}>{data.territory}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldValue}>
              {data.territory === 'Global'
                ? 'No territorial restrictions. Content is cleared for worldwide commercial use.'
                : `Content is cleared for commercial use in specified territory: ${data.territory}.`}
            </Text>
          </View>
        </View>

        {/* 8. Regeneration Rights Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Regeneration Rights Status</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Regeneration Authorized</Text>
            <Text style={styles.fieldValue}>
              {data.regenerationRights.authorized ? 'YES' : 'NO'}
            </Text>
          </View>
          {data.regenerationRights.scenes && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Authorized Scenes</Text>
              <Text style={styles.fieldValue}>{data.regenerationRights.scenes}</Text>
            </View>
          )}
        </View>

        {/* 9. Version History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Version History</Text>
          <Text style={styles.fieldValue}>{data.versionHistory}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This Chain of Title documentation is provided by SuperImmersive 8 (SI8) as part of our Rights Verified service.
          </Text>
          <Text style={{ marginTop: 4 }}>
            Generated: {new Date().toLocaleDateString('en-US')} • www.superimmersive8.com
          </Text>
          <Text style={{ marginTop: 4, fontSize: 7 }}>
            This document confirms that the content has passed SI8's rights verification process. It does not constitute legal advice or a legal guarantee.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
