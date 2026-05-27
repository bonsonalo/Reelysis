'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLogin } from '../hooks/useLogin'
import { useAuth } from '@/store/hook'
import { Button } from '@/components/ui/button'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const { mutate: login, isPending } = useLogin()
  const { error, status } = useAuth()

  useEffect(() => {
    if (status === 'succeeded') {
      router.push('/dashboard')
    }
  }, [status, router])

  const handleLogin = () => {
    if (!email || !password || isPending) return
    login({ email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1C1A1A]">
      <div className="flex w-full max-w-5xl rounded-2xl overflow-hidden shadow-xl border border-gray-900">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between bg-[#181818] p-12 w-1/2 min-h-[36rem]">
          <div>
            <div className="text-white font-bold text-lg mb-10 tracking-tight">
              Reelysis
            </div>
            <div className="uppercase text-orange-500 text-xs font-semibold mb-3 tracking-wider">
              Welcome back
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
              Your growth<br />dashboard awaits.
            </h1>
            <p className="text-gray-400 mb-10 text-base">
              Everything you need to understand your content, outpace competitors, and grow.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-lg p-4">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-white font-bold text-base">Transcript-first</div>
                  <div className="text-gray-500 text-s">AI analysis on every Reel</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-lg p-4">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="text-white font-bold text-base">10 competitors</div>
                  <div className="text-gray-500 text-s">Auto-discovered from your niche</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-lg p-4">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="text-white font-bold text-base">One click</div>
                  <div className="text-gray-500 text-s">From sync to full growth report</div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-gray-600 text-xs mt-10">
            © 2026 Reelysis{' '}
            <span className="underline cursor-pointer">Privacy</span> ·{' '}
            <span className="underline cursor-pointer">Terms</span>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-[#0a0a0a] p-8 md:p-16 flex flex-col justify-center bg-[#0d0d0d]">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Sign in</h2>
              <span className="text-sm text-gray-400">
                No account?{' '}
                <a href="/register" className="text-orange-500 hover:underline ml-2">
                  Create one free →
                </a>
              </span>
            </div>

            {error && (
              <div className="mb-4 text-red-500 text-center text-sm font-medium">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-gray-300 mb-2" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded bg-[#232323] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
                autoComplete="email"
                disabled={isPending}
                placeholder="you@example.com"
              />
            </div>

            <div className="mb-2">
              <label className="block text-gray-300 mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded bg-[#232323] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
                autoComplete="current-password"
                disabled={isPending}
                placeholder="********"
              />
            </div>

            <div className="flex items-center justify-end mb-6">
              <a href="#" className="text-orange-500 text-sm hover:underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="button"
              onClick={handleLogin}
              className="w-full mb-4 text-base py-2 bg-orange-500 hover:bg-orange-600"
              disabled={isPending}
            >
              {isPending ? 'Signing in...' : 'Sign in'}
            </Button>

          </div>
        </div>

      </div>
    </div>
  )
}