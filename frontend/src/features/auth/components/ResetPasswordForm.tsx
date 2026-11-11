'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthField } from '@/components/auth/AuthField'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/utils'
import { useResetPassword } from '../hooks/useAccountSecurity'
import { passwordMeetsRules } from '../utils/passwordRules'
import { AuthNotice } from './AuthNotice'
import { PasswordRuleList } from './PasswordRuleList'

export default function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const { mutate: reset, isPending, error } = useResetPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (!passwordMeetsRules(password)) {
      setLocalError('Your new password does not meet all the requirements.')
      return
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match.')
      return
    }
    reset({ token, password }, { onSuccess: () => router.push('/login?reset=1') })
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-[-0.015em] text-foreground">Invalid reset link</h1>
        <AuthNotice tone="error">
          This link is missing its reset token. Request a new one below.
        </AuthNotice>
        <Link href="/forgot-password" className="block">
          <Button className="w-full">Request a new link</Button>
        </Link>
      </div>
    )
  }

  const message = localError ?? (error ? getApiErrorMessage(error, 'Could not reset password.') : null)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-[-0.015em] text-foreground">Choose a new password</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          You&apos;ll be signed out everywhere and can sign in with the new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {message ? (
          <AuthNotice tone="error">
            {message}
            {error ? (
              <>
                {' '}
                <Link href="/forgot-password" className="underline">
                  Request a new link
                </Link>
              </>
            ) : null}
          </AuthNotice>
        ) : null}

        <AuthField
          id="new-password"
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          disabled={isPending}
          required
        />
        <PasswordRuleList value={password} className="-mt-1.5" />

        <AuthField
          id="confirm-password"
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          disabled={isPending}
          required
        />

        <Button type="submit" className="h-10 w-full" disabled={isPending}>
          <ButtonLoadingLabel loading={isPending} loadingLabel="Updating…">
            Update password
          </ButtonLoadingLabel>
        </Button>
      </form>
    </>
  )
}
