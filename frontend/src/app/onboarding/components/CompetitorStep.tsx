'use client'

import { Users2, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CompetitorAccount } from '../api'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CompetitorStepProps {
  competitors: CompetitorAccount[]
  onRemove: (id: string) => void
  onFinish: () => void
  isFinishing: boolean
}

export function CompetitorStep({ competitors, onRemove, onFinish, isFinishing }: CompetitorStepProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(competitors.map(c => c.id))

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-4 py-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="w-full max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
            <Users2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-white">Choose your competitors</h2>
          <p className="mt-2 text-muted-foreground">
            We found these high-performing accounts in your niche. Select the ones you want us to analyze.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {competitors.map((comp) => {
            const isSelected = selectedIds.includes(comp.id)
            return (
              <div 
                key={comp.id}
                onClick={() => toggleSelect(comp.id)}
                className={cn(
                  "group relative flex items-center gap-4 rounded-2xl border p-4 transition-all cursor-pointer",
                  isSelected 
                    ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
                    : "border-white/10 bg-[#09090b] grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-white/20"
                )}
              >
                <div className="h-12 w-12 flex-shrink-0 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/5">
                  {comp.profile_picture_url ? (
                    <img src={comp.profile_picture_url} alt={comp.handle} className="h-full w-full object-cover" />
                  ) : (
                    <Users2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">@{comp.handle}</p>
                  <p className="text-xs text-muted-foreground truncate">{comp.followers_count.toLocaleString()} followers</p>
                </div>
                
                <div className={cn(
                  "h-6 w-6 rounded-full border flex items-center justify-center transition-all",
                  isSelected 
                    ? "bg-primary border-primary text-black" 
                    : "border-white/20 text-transparent"
                )}>
                  <Check className="h-4 w-4 stroke-[3px]" />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={onFinish}
            disabled={isFinishing || selectedIds.length === 0}
            className="h-14 px-12 text-lg font-bold shadow-xl shadow-primary/20 flex items-center gap-2"
          >
            {isFinishing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span>Approve & Generate Strategy</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
