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
      <div className="mb-6 sm:mb-8">
        <h1 className="text-lg font-semibold text-white sm:text-xl">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-primary transition-colors duration-150 hover:text-orange-400"
          >
            Sign up
          </Link>
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
        {justReset && !error && (
          <div className="rounded-[10px] border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400/90">
            Password updated. Please sign in with your new password.
          </div>
        )}

        {error && (
          <div className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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

        <div>
          <AuthField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="Your password"
            disabled={isPending}
            required
          />
          <div className="mt-3 text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-text-tertiary transition-colors duration-150 hover:text-text-secondary"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="mt-1 w-full sm:mt-2" size="lg" disabled={isPending}>
          <ButtonLoadingLabel loading={isPending} loadingLabel="Signing in…">
            Sign in
          </ButtonLoadingLabel>
        </Button>
      </form>
    </>
  )
}
