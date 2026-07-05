'use client'

function WorkingSpinner() {
  return (
    <span
      className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center"
      aria-hidden
    >
      <span className="absolute h-4 w-4 rounded-full border border-primary/20" />
      <span className="absolute h-4 w-4 animate-spin rounded-full border border-transparent border-t-primary [animation-duration:0.8s]" />
    </span>
  )
}

type ProcessingStatusLineProps = {
  statusText: string
  errorMessage?: string | null
  className?: string
}

export function ProcessingStatusLine({
  statusText,
  errorMessage,
  className,
}: ProcessingStatusLineProps) {
  if (errorMessage) {
    return (
      <section
        role="status"
        aria-live="polite"
        className={className ?? 'max-w-2xl py-2 md:py-4'}
      >
        <p className="text-sm leading-relaxed text-red-400 md:text-[15px]">{errorMessage}</p>
      </section>
    )
  }

  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy
      className={className ?? 'max-w-2xl py-2 md:py-4'}
    >
      <div className="flex items-start gap-2.5">
        <WorkingSpinner />
        <p
          key={statusText}
          className="shimmer-text animate-in fade-in duration-500 text-sm font-medium leading-relaxed md:text-[15px]"
        >
          {statusText}
        </p>
      </div>
    </section>
  )
}
