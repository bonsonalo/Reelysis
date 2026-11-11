import { cn } from '@/lib/utils'
import { landingShellClass } from './landingContent'

type LandingShellProps = {
  children: React.ReactNode
  className?: string
}

export function LandingShell({ children, className }: LandingShellProps) {
  return <div className={cn(landingShellClass, className)}>{children}</div>
}

type LandingSectionProps = {
  id?: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  /** Grey band behind the section, used to separate neighbours without rules. */
  tinted?: boolean
}

export function LandingSection({
  id,
  title,
  description,
  children,
  className,
  tinted = false,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-16 py-16 sm:py-20 md:py-24',
        tinted && 'border-y border-border-subtle bg-surface-subtle',
        className,
      )}
    >
      <LandingShell>
        <LandingHeading title={title} description={description} />
        {children}
      </LandingShell>
    </section>
  )
}

export function LandingHeading({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('mb-10 max-w-[640px] md:mb-14', className)}>
      <h2 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-foreground md:text-[36px]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-text-secondary md:text-[17px]">
          {description}
        </p>
      )}
    </div>
  )
}
