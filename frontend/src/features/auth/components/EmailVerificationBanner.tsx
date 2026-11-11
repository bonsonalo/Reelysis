'use client'

import { useState } from 'react'
import { MailWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { getApiErrorMessage } from '@/lib/utils'
import { useResendVerification } from '../hooks/useAccountSecurity'

export function EmailVerificationBanner({ email }: { email?: string }) {
  const { mutate: resend, isPending } = useResendVerification()
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const handleResend = () => {
    setNotice(null)
    resend(undefined, {
      onSuccess: () =>
        setNotice({ tone: 'success', text: 'Verification email sent. Check your inbox.' }),
      onError: (err) =>
        setNotice({
          tone: 'error',
          text: getApiErrorMessage(err, 'Could not send the email. Try again later.'),
        }),
    })
  }

  return (
    <div
      className="print:hidden flex flex-col gap-3 border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      role="status"
    >
      <div className="flex min-w-0 gap-3 text-sm leading-relaxed">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="min-w-0">
          <p className="text-amber-100">
            Verify your email{email ? <> (<span className="text-white">{email}</span>)</> : null} to
            keep your account recoverable.
          </p>
          {notice ? (
            <p className={notice.tone === 'success' ? 'text-emerald-400' : 'text-red-400'}>
              {notice.text}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleResend}
        disabled={isPending}
        className="w-full shrink-0 sm:w-auto"
      >
        <ButtonLoadingLabel loading={isPending} loadingLabel="Sending…">
          Resend email
        </ButtonLoadingLabel>
      </Button>
    </div>
  )
}
