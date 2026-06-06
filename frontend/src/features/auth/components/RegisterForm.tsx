"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRegister } from '../hooks/useRegister';
import { useAuth } from '@/store/hook';
import { Button } from '@/components/ui/button';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { mutate: register, isPending } = useRegister();
  const { error, status } = useAuth();

  useEffect(() => {
    if (status === 'succeeded') {
      router.push('/onboarding');
    }
  }, [status, router]);

  const handleRegister = () => {
    if (!name || !email || !password || isPending) return;
    register({ name, email, password });
  };

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
                <div>
                  <div className="text-white font-bold text-base">Transcript-first</div>
                  <div className="text-gray-500 text-s">AI analysis on every Reel</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-lg p-4">
                <div>
                  <div className="text-white font-bold text-base">10 competitors</div>
                  <div className="text-gray-500 text-s">Auto-discovered from your niche</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-lg p-4">
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
        <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16 bg-[#0d0d0d]">
            <div className="w-full max-w-sm">
                <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
                <p className="text-sm text-gray-400 mb-6">Already have one? <a href="/login" className="ml-2 text-orange-500 hover:underline">Sign in →</a></p>

                {error && (
                <div className="mb-4 text-red-500 text-sm font-medium">{error}</div>
                )}

                <div className="mb-5 mt-6">
                    <label className="block text-gray-300 text-sm mb-1" htmlFor="name">Full name</label>
                    <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} disabled={isPending} placeholder="Your name" className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] text-white border border-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-600 text-sm" />
                </div>

                <div className="mb-5">
                    <label className="block text-gray-300 text-sm mb-1" htmlFor="email">Email address</label>
                    <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isPending} placeholder="you@example.com" className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] text-white border border-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-600 text-sm" />
                </div>

                <div className="mb-8">
                    <label className="block text-gray-300 text-sm mb-1" htmlFor="password">Password</label>
                    <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isPending} placeholder="********" className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] text-white border border-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-600 text-sm" />
                </div>

                <Button type="button" onClick={handleRegister} disabled={isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg">
                {isPending ? 'Creating account...' : 'Create account'}
                </Button>
            </div>
        </div>

      </div>
    </div>
  );

}
