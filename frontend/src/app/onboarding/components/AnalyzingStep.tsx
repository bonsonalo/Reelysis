'use client'

import { ProcessingStatusLine } from '@/components/shared/ProcessingStatusLine'
import { ProcessStatus } from '@/components/shared/ProcessStatus'
import type { ProgressTask } from '@/features/jobs/utils/jobProgressUtils'
import { OnboardingStepFrame } from './OnboardingStepFrame'

interface AnalyzingStepProps {
  statusText: string
  tasks?: ProgressTask[]
  errorMessage?: string | null
  variant?: 'shimmer' | 'checklist'
  children?: React.ReactNode
}

export function AnalyzingStep({
  statusText,
  tasks,
  errorMessage,
  variant = 'checklist',
  children,
}: AnalyzingStepProps) {
  return (
    <OnboardingStepFrame narrow>
      {variant === 'shimmer' ? (
        <ProcessingStatusLine statusText={statusText} errorMessage={errorMessage} />
      ) : (
        <ProcessStatus
          statusText={statusText}
          tasks={tasks}
          errorMessage={errorMessage}
          variant="plain"
        />
      )}
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </OnboardingStepFrame>
  )
}
