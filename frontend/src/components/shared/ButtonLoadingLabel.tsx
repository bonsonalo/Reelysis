import { Loader2 } from 'lucide-react'

type ButtonLoadingLabelProps = {
  loading: boolean
  loadingLabel: string
  children: React.ReactNode
}

/** Consistent spinner + label for buttons in a loading state. */
export function ButtonLoadingLabel({
  loading,
  loadingLabel,
  children,
}: ButtonLoadingLabelProps) {
  if (loading) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {loadingLabel}
      </>
    )
  }

  return <>{children}</>
}
