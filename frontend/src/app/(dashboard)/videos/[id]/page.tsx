'use client'

import { useParams, useRouter } from 'next/navigation'
import { useVideoAnalysis } from '@/features/dashboard/hooks/useVideoAnalysis'
import { 
  ArrowLeft, 
  Zap, 
  Target, 
  BarChart3, 
  MessageSquareText, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Play,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function VideoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const videoId = params.id as string
  
  const { data, isLoading } = useVideoAnalysis(videoId)

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-zinc-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Video analysis not found.</h2>
        <Button variant="link" onClick={() => router.back()} className="text-primary mt-2">
          Go back
        </Button>
      </div>
    )
  }

  const { media, analysis, metrics } = data
  const detail = analysis.analysis_detail

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="font-bold text-sm uppercase tracking-wider">Back to Dashboard</span>
        </button>
        
        <a 
          href={media.permalink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary hover:underline font-bold text-sm"
        >
          View on Instagram <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Video Preview & Primary Stats */}
        <div className="space-y-6">
          <div className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl group">
             <img src={media.thumbnail_url} alt="Video Thumbnail" className="h-full w-full object-cover opacity-80" />
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                   <Play className="h-8 w-8 fill-current ml-1" />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="rounded-2xl border border-white/5 bg-[#09090b] p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Total Views</p>
                <p className="text-2xl font-black text-white">{metrics.view.toLocaleString()}</p>
             </div>
             <div className="rounded-2xl border border-white/5 bg-[#09090b] p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Engagement</p>
                <p className="text-2xl font-black text-emerald-500">{analysis.engagement_score}%</p>
             </div>
          </div>
        </div>

        {/* Right: AI Analysis Deep Dive */}
        <div className="lg:col-span-2 space-y-8">
          {/* Top Scorecard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 relative overflow-hidden">
               <Zap className="absolute -top-2 -right-2 h-16 w-16 text-primary/10 -rotate-12" />
               <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Hook Score</p>
               <h3 className="text-4xl font-black text-white">{analysis.hook_score}<span className="text-lg text-primary/40">/100</span></h3>
               <p className="text-xs text-zinc-400 mt-2 font-medium">"{detail.hook}"</p>
            </div>
            
            <div className="rounded-2xl border border-white/5 bg-[#09090b] p-6">
               <Target className="h-5 w-5 text-primary mb-3" />
               <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Content Pillar</p>
               <h3 className="text-xl font-bold text-white capitalize">{analysis.content_pillar}</h3>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#09090b] p-6">
               <BarChart3 className="h-5 w-5 text-primary mb-3" />
               <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Pacing</p>
               <h3 className="text-xl font-bold text-white">{detail.pacing}</h3>
            </div>
          </div>

          {/* Transcript & Insights */}
          <div className="space-y-6">
             <div className="rounded-2xl border border-white/5 bg-[#09090b] p-8">
                <div className="flex items-center gap-3 mb-6">
                   <MessageSquareText className="h-5 w-5 text-primary" />
                   <h3 className="text-lg font-bold text-white uppercase tracking-tighter">AI Transcript Analysis</h3>
                </div>
                <div className="prose prose-invert max-w-none">
                   <p className="text-zinc-400 leading-relaxed italic border-l-2 border-primary/30 pl-4 py-1">
                      {media.caption || "No caption available."}
                   </p>
                   <p className="mt-4 text-white leading-relaxed font-medium">
                      {media.transcript_text || "Audio analysis pending..."}
                   </p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-6">
                   <div className="flex items-center gap-2 mb-4 text-emerald-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <h4 className="font-bold uppercase text-xs tracking-widest">Key Strengths</h4>
                   </div>
                   <ul className="space-y-3">
                      {detail.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                           <div className="h-1 w-1 rounded-full bg-emerald-500 mt-2" />
                           {s}
                        </li>
                      ))}
                   </ul>
                </div>

                <div className="rounded-2xl border border-orange-500/10 bg-orange-500/5 p-6">
                   <div className="flex items-center gap-2 mb-4 text-orange-500">
                      <TrendingUp className="h-5 w-5" />
                      <h4 className="font-bold uppercase text-xs tracking-widest">Areas for Growth</h4>
                   </div>
                   <ul className="space-y-3">
                      {detail.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                           <div className="h-1 w-1 rounded-full bg-orange-500 mt-2" />
                           {w}
                        </li>
                      ))}
                   </ul>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
