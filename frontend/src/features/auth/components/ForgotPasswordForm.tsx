'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthField } from '@/components/auth/AuthField'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/utils'
import { useForgotPassword } from '../hooks/useAccountSecurity'
import { AuthNotice } from './AuthNotice'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const { mutate: requestReset, isPending, isSuccess, error } = useForgotPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || isPending) return
    requestReset(email.trim())
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-[-0.015em] text-foreground">Reset your password</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Enter the email you signed up with and we&apos;ll send you a reset link.
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-6">
          <AuthNotice tone="success">
            If an account exists for <span className="text-foreground">{email}</span>, a reset link is
            on its way. The link expires in 30 minutes.
          </AuthNotice>
          <Link href="/login" className="block">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <AuthNotice tone="error">
              {getApiErrorMessage(error, 'Could not send the reset email. Try again.')}
            </AuthNotice>
          ) : null}

          <AuthField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isPending}
            required
          />

          <Button type="submit" className="h-10 w-full" disabled={isPending || !email}>
            <ButtonLoadingLabel loading={isPending} loadingLabel="Sending…">
              Send reset link
            </ButtonLoadingLabel>
          </Button>

          <p className="text-center text-sm text-text-secondary">
            Remembered it?{' '}
            <Link
              href="/login"
              className="text-brand-text transition-colors duration-150 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </>
  )
}
