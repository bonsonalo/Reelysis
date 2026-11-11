'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLogin } from '../hooks/useLogin'
import { useAuth } from '@/store/hook'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { postAuthDestination } from '@/features/instagram/utils'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { AuthField } from '@/components/auth/AuthField'
import { Button } from '@/components/ui/button'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const justReset = searchParams.get('reset') === '1'
  const { mutate: login, isPending } = useLogin()
  const { error, status } = useAuth()
  const { data: accounts, isLoading: isLoadingAccounts } = useInstagramAccounts({
    enabled: status === 'succeeded',
  })

  useEffect(() => {
    if (status !== 'succeeded') return
    if (isLoadingAccounts) return
    if (!accounts) return
    router.push(postAuthDestination(accounts))
  }, [status, accounts, isLoadingAccounts, router])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || isPending) return
    login({ email, password })
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-[-0.015em] text-foreground">
          Sign in to Reelysis
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Pick up where your last sync left off.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {justReset && !error && (
          <div className="rounded-md border border-success/25 bg-success-tint px-3 py-2.5 text-sm text-success">
            Password updated. Please sign in with your new password.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-danger/25 bg-danger-tint px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

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
          autoComplete="current-password"
          disabled={isPending}
          required
          labelAction={
            <Link
              href="/forgot-password"
              className="text-[13px] text-brand-text hover:underline"
            >
              Forgot password?
            </Link>
          }
        />

        <Button type="submit" className="mt-2 h-10 w-full" disabled={isPending}>
          <ButtonLoadingLabel loading={isPending} loadingLabel="Signing in…">
            Sign in
          </ButtonLoadingLabel>
        </Button>
      </form>

      <p className="mt-6 border-t border-border-subtle pt-5 text-center text-sm text-text-secondary">
        New to Reelysis?{' '}
        <Link href="/register" className="font-medium text-brand-text hover:underline">
          Create an account
        </Link>
      </p>
    </>
  )
}
