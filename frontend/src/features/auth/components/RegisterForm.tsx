'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRegister } from '../hooks/useRegister'
import { useAuth } from '@/store/hook'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { AuthField } from '@/components/auth/AuthField'
import { Button } from '@/components/ui/button'

export default function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const { mutate: register, isPending } = useRegister()
  const { error, status } = useAuth()

  useEffect(() => {
    if (status === 'succeeded') {
      router.push('/onboarding')
    }
  }, [status, router])

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password || isPending) return
    register({ name, email, password })
  }

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-lg font-semibold text-white sm:text-xl">Create your account</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary transition-colors duration-150 hover:text-orange-400"
          >
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-5 sm:space-y-6">
        {error && (
          <div className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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

        <Button type="submit" className="mt-1 w-full sm:mt-2" size="lg" disabled={isPending}>
          <ButtonLoadingLabel loading={isPending} loadingLabel="Creating account…">
            Get started
          </ButtonLoadingLabel>
        </Button>

        <p className="pt-1 text-center text-xs leading-relaxed text-text-tertiary sm:pt-2">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-text-secondary transition-colors hover:text-white">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-text-secondary transition-colors hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </>
  )
}
