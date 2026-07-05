import { cn } from '@/lib/utils'

type OnboardingStepFrameProps = {
  children: React.ReactNode
  className?: string
  narrow?: boolean
}

export function OnboardingStepFrame({
  children,
  className,
  narrow = false,
}: OnboardingStepFrameProps) {
  return (
    <div
      className={cn(
        'flex min-h-[calc(100dvh-3.5rem)] w-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12',
        className,
      )}
    >
      <div className={cn('w-full', narrow ? 'max-w-md' : 'max-w-2xl')}>{children}</div>
    </div>
  )
}
