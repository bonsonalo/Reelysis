'use client'

import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useTriggerSync } from '@/features/instagram/hooks/useTriggerSync'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useConfirmNiche } from '@/features/instagram/hooks/useConfirmNiche'

export default function OnboardingPage() {
  const { data: accounts, isLoading: isLoadingAccounts } = useInstagramAccounts()
  const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync()
  const { mutate: confirmNiche, isPending: isConfirming } = useConfirmNiche()
  
  const isConnected = accounts && accounts.length > 0
  const account = accounts?.[0]
  
  // Local state for the "Niche Confirmation" UI
  const [showNicheCard, setShowNicheCard] = useState(false)
  const [confirmedNiche, setConfirmedNiche] = useState('')

  useEffect(() => {
    // If account is connected and sync hasn't happened, trigger it
    if (isConnected && !account?.last_synced_at && !isSyncing) {
      triggerSync()
    }
    
    // If niche is detected but not confirmed, show the card
    if (account?.niche_detected && !account?.niche_confirmed) {
      setConfirmedNiche(account.niche_detected)
      setShowNicheCard(true)
    }
  }, [isConnected, account, triggerSync, isSyncing])

  if (isLoadingAccounts) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 1. NICHE CONFIRMATION CARD (from your design)
  if (showNicheCard) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center px-4">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-8 shadow-2xl">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <h2 className="mb-2 text-center text-2xl font-bold text-white">We detected your niche!</h2>
          <p className="mb-8 text-center text-muted-foreground">
            Our AI analyzed your content and suggests this category:
          </p>

          <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <input 
              type="text" 
              value={confirmedNiche}
              onChange={(e) => setConfirmedNiche(e.target.value)}
              className="w-full bg-transparent text-center text-xl font-bold text-primary outline-none"
            />
            <p className="mt-1 text-xs text-primary/60">Click to edit if needed</p>
          </div>

          <Button 
            onClick={() => confirmNiche(confirmedNiche)}
            disabled={isConfirming}
            className="h-12 w-full text-lg font-bold"
          >
            {isConfirming ? <Loader2 className="h-5 w-5 animate-spin" /> : "Yes, that's correct"}
          </Button>
        </div>
      </div>
    )
  }

  // 2. SYNCING STATE
  if (isSyncing || (isConnected && !account?.niche_detected)) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center px-4 text-center">
        <div className="mb-8 relative h-24 w-24">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-full w-full items-center justify-center rounded-full bg-black border-2 border-primary">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">Analyzing your content...</h1>
        <p className="max-w-xs text-muted-foreground">
          We're reviewing your Reels and biography to build your custom strategy.
        </p>
      </div>
    )
  }

  // 3. WELCOME STATE (Initial view)
  return (
    <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>The AI Strategist for Reels</span>
      </div>

      <h1 className="mb-6 max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl lg:text-8xl">
        Know exactly what <br />
        to post <span className="text-primary italic">next.</span>
      </h1>
      
      <p className="mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
        Connect your account to discover your content pillars, analyze competitors, 
        and generate a high-performing growth roadmap in minutes.
      </p>

      {!isConnected && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Start by connecting your account above
          </p>
          <ArrowRight className="h-6 w-6 animate-bounce text-primary" />
        </div>
      )}
    </div>
  )
}
