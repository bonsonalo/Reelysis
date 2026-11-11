import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PageErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

/** Shown when a page query fails for a reason other than "not found". */
export function PageErrorState({
  title = 'Something went wrong',
  message = 'We could not load this page. Check your connection and try again.',
  onRetry,
  retrying,
  className,
}: PageErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] w-full flex-col items-center justify-center p-4 text-center',
        className,
      )}
      role="alert"
    >
      <AlertCircle className="mb-4 h-10 w-10 text-red-400/80" />
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">{message}</p>
      {onRetry ? (
        <Button className="mt-6" variant="outline" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Try again'}
        </Button>
      ) : null}
    </div>
  )
}
