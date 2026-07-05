'use client'

import { ProcessStatus } from '@/components/shared/ProcessStatus'
import type { getReportGenerationUi } from '@/features/reports/utils/reportGenerationProgress'

type ReportGenerationPanelProps = {
  reportUi: ReturnType<typeof getReportGenerationUi>
  errorMessage?: string | null
}

export function ReportGenerationPanel({ reportUi, errorMessage }: ReportGenerationPanelProps) {
  return (
    <ProcessStatus
      statusText={reportUi.description}
      tasks={reportUi.tasks}
      errorMessage={errorMessage}
    />
  )
}
