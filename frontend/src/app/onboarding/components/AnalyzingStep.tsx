'use client'

import { ProcessStatus } from '@/components/shared/ProcessStatus'
import type { ProgressTask } from '@/features/jobs/utils/jobProgressUtils'
import { OnboardingStepFrame } from './OnboardingStepFrame'

interface AnalyzingStepProps {
  statusText: string
  tasks?: ProgressTask[]
  errorMessage?: string | null
  children?: React.ReactNode
}

export function AnalyzingStep({
  statusText,
  tasks,
  errorMessage,
  children,
}: AnalyzingStepProps) {
  return (
    <OnboardingStepFrame narrow>
      <ProcessStatus
        statusText={statusText}
        tasks={tasks}
        errorMessage={errorMessage}
      />
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </OnboardingStepFrame>
  )
}
