import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type PanelProps = HTMLAttributes<HTMLDivElement>

/** Raised surface — subtle bg lift + hairline border (Linear-style). */
export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-border-subtle bg-surface-card',
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
        'mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-9 lg:px-10 lg:py-10 xl:px-12',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
