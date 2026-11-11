'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { useStartInstagramOAuth } from '../hooks/useStartInstagramOAuth'

export function ReconnectInstagramBanner({
  username,
  className,
}: {
  username?: string
  className?: string
}) {
  const { mutate: startOAuth, isPending, error } = useStartInstagramOAuth()

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[10px] border border-warning/30 bg-warning-tint px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5',
        className,
      )}
      role="alert"
    >
      <div className="flex min-w-0 gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="font-medium text-foreground">Instagram access expired</p>
          <p className="text-text-secondary">
            Reconnect {username ? `@${username}` : 'your account'} so syncs and reports keep working.
            Your data stays as it is.
          </p>
          {error ? (
            <p className="mt-1 text-danger">
              {getApiErrorMessage(error, 'Could not start the connection. Try again.')}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => startOAuth()}
        disabled={isPending}
        className="w-full shrink-0 sm:w-auto"
      >
        <ButtonLoadingLabel loading={isPending} loadingLabel="Redirecting…">
          Reconnect Instagram
        </ButtonLoadingLabel>
      </Button>
    </div>
  )
}
