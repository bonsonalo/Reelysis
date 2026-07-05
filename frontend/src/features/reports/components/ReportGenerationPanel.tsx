'use client'

import { ProcessingStatusLine } from '@/components/shared/ProcessingStatusLine'
import type { getReportGenerationUi } from '@/features/reports/utils/reportGenerationProgress'

type ReportGenerationPanelProps = {
  reportUi: ReturnType<typeof getReportGenerationUi>
  errorMessage?: string | null
}

export function ReportGenerationPanel({ reportUi, errorMessage }: ReportGenerationPanelProps) {
  return (
    <ProcessingStatusLine
      statusText={reportUi.description}
      errorMessage={errorMessage}
    />
  )
}
