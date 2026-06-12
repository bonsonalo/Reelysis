'use client'

import { Sparkles, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NicheStepProps {
  niche: string
  setNiche: (niche: string) => void
  onConfirm: () => void
  isConfirming: boolean
}

export function NicheStep({ niche, setNiche, onConfirm, isConfirming }: NicheStepProps) {
  return (
    <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center px-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
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
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="w-full bg-transparent text-center text-xl font-bold text-primary outline-none"
          />
          <p className="mt-1 text-xs text-primary/60">Click to edit if needed</p>
        </div>

        <Button 
          onClick={onConfirm}
          disabled={isConfirming}
          className="h-12 w-full text-lg font-bold flex items-center justify-center gap-2"
        >
          {isConfirming ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Check className="h-5 w-5" />
              <span>Yes, that's correct</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
