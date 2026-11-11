import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type PanelProps = HTMLAttributes<HTMLDivElement>

/** Raised surface: white, hairline border, a 1px shadow so it sits on the page. */
export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-border-subtle bg-surface-card shadow-raised',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Standard page gutters — scales from mobile through desktop; caps width on large screens. */
export function PageContainer({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-9',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Page title row: title + one line of context on the left, actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <div className="mt-1.5 text-sm leading-relaxed text-text-secondary">{description}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
