import { cn } from '@/lib/utils'

type PageEmptyStateProps = {
  primary: string
  secondary?: string
  className?: string
}

export function PageEmptyState({ primary, secondary, className }: PageEmptyStateProps) {
  return (
    <section className={cn('max-w-2xl space-y-2 py-6 md:space-y-2.5 md:py-8', className)}>
      <p className="text-xs leading-relaxed text-text-secondary md:text-sm">{primary}</p>
      {secondary ? (
        <p className="text-xs text-text-tertiary md:text-sm">{secondary}</p>
      ) : null}
    </section>
  )
}
