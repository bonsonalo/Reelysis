'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/store/hook'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { isOnboarded } from '@/features/instagram/utils'
import { getApiErrorMessage } from '@/lib/utils'
import { useVerifyEmail } from '../hooks/useAccountSecurity'
import { AuthNotice } from './AuthNotice'

export default function VerifyEmailStatus() {
  const token = useSearchParams().get('token') ?? ''
  const { isAuthenticated } = useAuth()
  const { mutate: verify, isPending, isSuccess, error } = useVerifyEmail()
  const submittedRef = useRef(false)

  useEffect(() => {
    // Tokens are single-use, so guard against double-submit in dev Strict Mode.
    if (!token || submittedRef.current) return
    submittedRef.current = true
    verify(token)
  }, [token, verify])

  const { data: accounts } = useInstagramAccounts({ enabled: isAuthenticated })
  const onboarded = isOnboarded(accounts?.[0])

  // Users who verify before connecting Instagram still have onboarding to finish.
  const continueHref = !isAuthenticated ? '/login' : onboarded ? '/dashboard' : '/onboarding'
  const continueLabel = !isAuthenticated ? 'Sign in' : onboarded ? 'Go to dashboard' : 'Continue setup'

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-white sm:text-xl">Verify your email</h1>

      {!token ? (
        <AuthNotice tone="error">This verification link is incomplete.</AuthNotice>
      ) : isPending || (!isSuccess && !error) ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Verifying…
        </p>
      ) : isSuccess ? (
        <AuthNotice tone="success">Your email is verified. Thanks!</AuthNotice>
      ) : (
        <AuthNotice tone="error">
          {getApiErrorMessage(
            error,
            'This link is invalid or has expired. Request a new one from the banner in the app.',
          )}
        </AuthNotice>
      )}

      <Link href={continueHref} className="block">
        <Button className="w-full" variant={isSuccess ? 'default' : 'outline'}>
          {continueLabel}
        </Button>
      </Link>
    </div>
  )
}
