'use client'

import { Button } from '@/components/ui/button'
import { Video, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/lib/axios'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import Link from 'next/link'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: accounts, isLoading } = useInstagramAccounts()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const response = await api.get('/api/v1/instagram/oauth/start')
      if (response.data?.oauth_url) {
        window.location.href = response.data.oauth_url
      }
    } catch (error) {
      console.error('Failed to start OAuth:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const isConnected = accounts && accounts.length > 0

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/5 bg-black/50 px-6 backdrop-blur-md md:px-12">
        <Link href="/" className="text-xl font-black tracking-tighter">
          REEL<span className="text-primary">YSIS</span>
        </Link>

        <div className="mt-5">
          {!isConnected ? (
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="h-10 px-4 font-bold flex items-center gap-2"
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <><Video className="mr-2 h-4 w-4" /> Connect Instagram</>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Account Linked
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {children}
      </main>

      {/* Background Gradients */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[25%] -left-[10%] h-[50%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[25%] -right-[10%] h-[50%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>
    </div>
  )
}
