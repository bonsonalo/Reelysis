'use client'

import { useDashboardVideos } from '@/features/dashboard/hooks/useDashboardVideos'
import { 
  Video, 
  Play, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function AllVideosPage() {
  // Fetch more videos for the full list
  const { data: videos, isLoading } = useDashboardVideos(24)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Video className="h-8 w-8 text-primary" />
            Your Reel Performance
          </h1>
          <p className="mt-1 text-muted-foreground">
            Deep analysis and metrics for all your connected Instagram content.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {videos?.data.map((video) => (
          <Link 
            href={`/videos/${video.id}`} 
            key={video.id} 
            className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 cursor-pointer"
          >
             <img 
              src={video.thumbnail_url} 
              alt={video.caption} 
              className="h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100" 
            />
            
            {/* Score Badge */}
            <div className="absolute top-4 left-4 z-10">
               <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border",
                  video.hook_score >= 80 
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500" 
                    : "bg-primary/20 border-primary/30 text-primary"
               )}>
                  Hook: {video.hook_score}
               </div>
            </div>

            {/* Stats Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-6 flex flex-col justify-end">
              <div className="space-y-3">
                 <p className="text-white text-xs font-bold line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {video.caption || "No caption"}
                 </p>
                 <div className="flex items-center justify-between text-white font-black text-lg">
                    <div className="flex items-center gap-1.5">
                      <Play className="h-4 w-4 fill-current" />
                      {formatNumber(video.views)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <TrendingUp className="h-3 w-3" />
                      {video.engagement_rate}%
                    </div>
                 </div>
              </div>
            </div>
          </Link>
        ))}

        {(!videos || videos.data.length === 0) && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-bold text-white">No Reels found</h3>
            <p className="text-zinc-500 mt-2">Connect your Instagram or post more Reels to see analysis here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
