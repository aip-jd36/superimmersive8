import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, CheckCircle, ChevronRight } from 'lucide-react'

interface WorkbookEntryPointProps {
  submissionId: string
  workbookData: Record<string, any> | null
}

function computeProgress(data: Record<string, any> | null): { completed: number; total: number; isSignedOff: boolean } {
  const total = 7
  if (!data) return { completed: 0, total, isSignedOff: false }

  // Section 1: all intake scope checks ticked
  const s1 = !!(data.section_1?.scope_confirmed === true)
  // Section 2: visual observations recorded (any non-empty string)
  const s2 = !!(data.section_2?.visual_observations?.trim?.())
  // Section 3: all 16 controls have a judgment value
  const s3Controls = data.section_3 ? Object.values(data.section_3) : []
  const s3 = s3Controls.length >= 16 && s3Controls.every((c: any) => c?.judgment)
  // Section 4: gap log present (auto-seeded from s3; count as done when s3 is done)
  const s4 = s3
  // Section 5: at least one finding recorded
  const s5 = Array.isArray(data.section_5?.findings) && data.section_5.findings.length > 0
  // Section 6: overall assessment filled in
  const s6 = !!(data.section_6?.overall_outcome)
  // Section 7: report brief has executive summary
  const s7 = !!(data.section_7?.executive_summary?.trim?.())
  // Signed off = reviewer confirmed in Section 6
  const isSignedOff = !!(data.section_6?.signed_off === true)

  const completed = [s1, s2, s3, s4, s5, s6, s7].filter(Boolean).length
  return { completed, total, isSignedOff }
}

export function WorkbookEntryPoint({ submissionId, workbookData }: WorkbookEntryPointProps) {
  const { completed, total, isSignedOff } = computeProgress(workbookData)
  const hasStarted = !!workbookData

  const label = isSignedOff ? 'View Workbook' : hasStarted ? 'Continue Review' : 'Start Review'
  const borderColor = isSignedOff ? 'rgba(22,163,74,0.25)' : 'rgba(200,144,10,0.3)'
  const bgColor = isSignedOff ? '#f0fdf4' : '#fffbf0'

  return (
    <Card className="border-2" style={{ borderColor, backgroundColor: bgColor }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-4 h-4 flex-shrink-0" style={{ color: '#C8900A' }} />
          Assessment Workbook
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isSignedOff ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800">Review signed off</span>
          </div>
        ) : hasStarted ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold" style={{ color: '#C8900A' }}>
                {completed}/{total} sections
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${Math.round((completed / total) * 100)}%`, backgroundColor: '#C8900A' }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            7-section guided assessment — 16 controls, findings log, report brief, and provenance sign-off.
          </p>
        )}

        <Button
          asChild
          size="sm"
          className="w-full text-white"
          style={{ backgroundColor: '#C8900A' }}
        >
          <Link href={`/admin/submissions/${submissionId}/review`}>
            {label}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
