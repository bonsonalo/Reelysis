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
  bordered?: boolean
}

export function LandingSection({
  id,
  title,
  description,
  children,
  className,
  bordered = true,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      className={cn(bordered && 'border-t border-border-subtle', 'py-12 sm:py-14 md:py-20', className)}
    >
      <LandingShell>
        <div className="mb-8 max-w-2xl sm:mb-10 md:mb-12">
          <h2 className="text-lg font-semibold text-white sm:text-xl md:text-2xl">{title}</h2>
          {description && (
            <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
              {description}
            </p>
          )}
        </div>
        {children}
      </LandingShell>
    </section>
  )
}
