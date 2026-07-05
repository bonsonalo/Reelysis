'use client'

import { Check } from 'lucide-react'
import { Panel } from '@/components/shared/Panel'
import { cn } from '@/lib/utils'
import type { ProgressTask, ProgressTaskStatus } from '@/features/jobs/utils/jobProgressUtils'

export type { ProgressTask, ProgressTaskStatus }

function ThinkingDots({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center gap-1', className)}
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70"
          style={{ animationDelay: `${i * 160}ms`, animationDuration: '1.2s' }}
        />
      ))}
    </span>
  )
}

function TaskStatusIcon({ status }: { status: ProgressTaskStatus }) {
  if (status === 'completed') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
        <Check className="h-3 w-3 text-text-tertiary" strokeWidth={2.5} />
      </span>
    )
  }
  if (status === 'running') {
    return <ThinkingDots className="h-5 w-5" />
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
        <ThinkingDots className="mt-1 shrink-0" />
        <p className="text-sm leading-relaxed text-text-label">{statusText}</p>
      </div>

      {tasks && tasks.length > 0 && (
        <ul className="mt-5 space-y-1 border-t border-border-subtle pt-5">
          {tasks.map((task) => (
            <li
              key={task.label}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2 transition-colors duration-200',
                task.status === 'running' && 'bg-white/[0.03]',
              )}
            >
              <TaskStatusIcon status={task.status} />
              <span
                className={cn(
                  'text-sm leading-snug transition-colors duration-200',
                  task.status === 'completed' && 'text-text-tertiary',
                  task.status === 'running' && 'font-medium text-white',
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
        <p className="mt-4 rounded-[10px] border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
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
