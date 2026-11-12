'use client'

import { Check } from 'lucide-react'
import { Panel } from '@/components/shared/Panel'
import { cn } from '@/lib/utils'
import type { ProgressTask, ProgressTaskStatus } from '@/features/jobs/utils/jobProgressUtils'

export type { ProgressTask, ProgressTaskStatus }

function WorkingSpinner({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-4 w-4 shrink-0', className)} aria-hidden>
      <span className="absolute inset-0 rounded-full border-2 border-border-strong" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-text-secondary [animation-duration:0.9s] motion-reduce:animate-none" />
    </span>
  )
}

function TaskStatusIcon({ status }: { status: ProgressTaskStatus }) {
  if (status === 'completed') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-hover">
        <Check className="h-3 w-3 text-text-tertiary" strokeWidth={2.5} />
      </span>
    )
  }
  if (status === 'running') {
    return <span className="flex h-5 w-5 shrink-0 items-center justify-center"><WorkingSpinner /></span>
  }
  return (
    <span
      className="h-5 w-5 shrink-0 rounded-full border border-border-subtle bg-surface-input"
      aria-hidden
    />
  )
}

type ProcessStatusProps = {
  statusText: string
  tasks?: ProgressTask[]
  errorMessage?: string | null
  className?: string
  variant?: 'panel' | 'plain'
}

export function ProcessStatus({
  statusText,
  tasks,
  errorMessage,
  className,
  variant = 'panel',
}: ProcessStatusProps) {
  const body = (
    <div
      role="status"
      aria-live="polite"
      className={cn('animate-in fade-in duration-300', className)}
    >
      <div className="flex items-start gap-3.5">
        <WorkingSpinner className="mt-0.5" />
        <p className="text-sm leading-relaxed text-text-label">{statusText}</p>
      </div>

      {tasks && tasks.length > 0 && (
        <ul className="mt-5 space-y-1 border-t border-border-subtle pt-5">
          {tasks.map((task) => (
            <li
              key={task.label}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2 transition-colors duration-200',
                task.status === 'running' && 'bg-surface-hover',
              )}
            >
              <TaskStatusIcon status={task.status} />
              <span
                className={cn(
                  'text-sm leading-snug transition-colors duration-200',
                  task.status === 'completed' && 'text-text-tertiary',
                  task.status === 'running' && 'font-medium text-foreground',
                  task.status === 'pending' && 'text-text-tertiary/70',
                )}
              >
                {task.label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-[10px] border border-danger/25 bg-danger-tint px-3 py-2.5 text-sm text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  )

  if (variant === 'plain') {
    return body
  }

  return (
    <Panel className="overflow-hidden p-5 sm:p-6">
      {body}
    </Panel>
  )
}
