'use client'

import { useCompetitors, useRemoveCompetitor } from '@/features/competitors/hooks/useCompetitors'
import { 
  Users2, 
  Trash2, 
  TrendingUp, 
  Zap, 
  ExternalLink,
  Search,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export default function CompetitorsPage() {
  const { data: competitors, isLoading } = useCompetitors()
  const { mutate: removeCompetitor, isPending: isRemoving } = useRemoveCompetitor()
  
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCompetitors = competitors?.filter(c => 
    c.handle.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Users2 className="h-8 w-8 text-primary" />
            Market Intelligence
          </h1>
          <p className="mt-1 text-muted-foreground">
            Tracking {competitors?.length || 0} top-performing accounts in your niche.
          </p>
        </div>
        
        <div className="relative w-full md:w-80 group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
           <input 
            type="text" 
            placeholder="Search accounts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-white/5 bg-[#09090b] text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all"
           />
        </div>
      </div>

      {/* Competitors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompetitors?.map((comp) => (
          <div 
            key={comp.id} 
            className="group relative rounded-3xl border border-white/5 bg-[#09090b] p-8 space-y-6 hover:border-primary/20 transition-all hover:bg-[#0c0c0e] hover:shadow-2xl hover:shadow-primary/5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden">
                  {comp.profile_picture_url ? (
                    <img src={comp.profile_picture_url} alt={comp.handle} className="h-full w-full object-cover" />
                  ) : (
                    <Users2 className="h-8 w-8 text-zinc-600" />
                  )}
                </div>
                <div>
                   <h3 className="text-xl font-bold text-white truncate max-w-[150px]">@{comp.handle}</h3>
                   <p className="text-sm text-zinc-500 truncate max-w-[150px]">{comp.display_name}</p>
                </div>
              </div>
              
              <button 
                onClick={() => removeCompetitor(comp.id)}
                className="p-2 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Stop tracking"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="rounded-2xl bg-white/[0.03] p-4 border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Followers</p>
                  <p className="text-xl font-bold text-white">{formatNumber(comp.followers_count)}</p>
               </div>
               <div className="rounded-2xl bg-emerald-500/5 p-4 border border-emerald-500/10">
                  <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Market Rank</p>
                  <div className="flex items-center gap-1.5">
                     <TrendingUp className="h-4 w-4 text-emerald-500" />
                     <p className="text-xl font-bold text-white">Top 5%</p>
                  </div>
               </div>
            </div>

            <div className="space-y-3 pt-2">
               <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
                  <span>Engagement Strength</span>
                  <span className="text-primary">{comp.engagement_rank}%</span>
               </div>
               <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000" 
                    style={{ width: `${comp.engagement_rank}%` }} 
                  />
               </div>
            </div>

            <a 
              href={`https://instagram.com/${comp.handle}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-white/10 text-zinc-400 font-bold text-sm hover:bg-white/5 hover:text-white transition-all"
            >
              Visit Profile <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}

        {(!filteredCompetitors || filteredCompetitors.length === 0) && !isLoading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-bold text-white">No competitors found</h3>
            <p className="text-zinc-500 mt-2">Try adjusting your search or connect your account.</p>
          </div>
        )}
      </div>
    </div>
  )
}
