'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRegister } from '../hooks/useRegister'
import { useAuth } from '@/store/hook'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { AuthField } from '@/components/auth/AuthField'
import { Button } from '@/components/ui/button'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { postAuthDestination } from '@/features/instagram/utils'
import { PasswordRuleList } from './PasswordRuleList'

export default function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const { mutate: register, isPending } = useRegister()
  const { error, status } = useAuth()
  const { data: accounts, isLoading: isLoadingAccounts } = useInstagramAccounts({
    enabled: status === 'succeeded',
  })

  useEffect(() => {
    if (status !== 'succeeded' || isLoadingAccounts || !accounts) return
    router.push(postAuthDestination(accounts))
  }, [status, accounts, isLoadingAccounts, router])

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password || isPending) return
    register({ name, email, password })
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-[-0.015em] text-foreground">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          After this, you&apos;ll connect your Instagram account.
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="rounded-md border border-danger/25 bg-danger-tint px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <AuthField
          id="name"
          label="Full name"
          value={name}
          onChange={setName}
          autoComplete="name"
          placeholder="Your name"
          disabled={isPending}
          required
        />

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

        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="Create a password"
          disabled={isPending}
          required
        />
        <PasswordRuleList value={password} className="-mt-1.5" />

        <Button type="submit" className="mt-2 h-10 w-full" disabled={isPending}>
          <ButtonLoadingLabel loading={isPending} loadingLabel="Creating account…">
            Create account
          </ButtonLoadingLabel>
        </Button>

        <p className="pt-1 text-center text-xs leading-relaxed text-text-tertiary sm:pt-2">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-text-secondary underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-text-secondary underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 border-t border-border-subtle pt-5 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-text hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
