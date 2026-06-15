'use client'

import { useLatestReport, useRoadmap } from '@/features/reports/hooks/useLatestReport'
import { 
  CheckCircle2, 
  Clock, 
  Lightbulb, 
  TrendingUp, 
  Zap, 
  AlertCircle,
  FileText,
  Calendar,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import Markdown from 'react-markdown'
import { cn } from '@/lib/utils'

export default function StrategicRoadmapPage() {
  const { data: report, isLoading: isLoadingReport } = useLatestReport()
  const { data: roadmap, isLoading: isLoadingRoadmap } = useRoadmap()

  if (isLoadingReport || isLoadingRoadmap) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center text-center p-4">
        <div className="mb-6 rounded-full bg-primary/10 p-4 border border-primary/20">
          <Zap className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">No Strategic Roadmap Found</h1>
        <p className="max-w-md text-zinc-500 mb-8">
          Complete your profile analysis in the onboarding to generate your custom strategy.
        </p>
        <Button onClick={() => window.location.href = '/onboarding'}>
          Go to Onboarding
        </Button>
      </div>
    )
  }

  const recommendations = roadmap?.recommendations || []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-widest">Growth Strategy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase">
            Viral <span className="text-primary italic">Roadmap.</span>
          </h1>
          <p className="mt-3 text-zinc-500 max-w-xl font-medium">
            Based on your recent performance and competitor benchmarks, we've identified these high-impact actions.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex flex-col text-right pr-4 border-r border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Last Updated</span>
            <span className="text-sm font-bold text-white">{new Date(report.created_at).toLocaleDateString()}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
         {/* Left: Top Actions */}
         <div className="space-y-8">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Zap className="h-6 w-6 fill-current" />
               </div>
               <h2 className="text-2xl font-bold text-white">Critical Actions</h2>
            </div>

            <div className="space-y-4">
               {recommendations.map((item: any, i: number) => (
                  <div key={i} className="group rounded-2xl border border-white/5 bg-[#09090b] p-6 hover:border-primary/20 transition-all hover:bg-[#0c0c0e]">
                     <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-col gap-1">
                           <div className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                              item.priority >= 4 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-primary/10 border-primary/20 text-primary"
                           )}>
                              {item.recommedation_type}
                           </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                           <Clock className="h-3 w-3" />
                           Priority: {item.priority}/5
                        </div>
                     </div>
                     <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                     <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                        {item.description}
                     </p>
                     <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5">
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                           <Lightbulb className="h-3 w-3 text-primary" />
                           The Evidence
                        </p>
                        <p className="text-xs text-zinc-400 italic">
                           {item.evidence}
                        </p>
                     </div>
                  </div>
               ))}
               {recommendations.length === 0 && (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                     <AlertCircle className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                     <p className="text-sm text-zinc-500">Scanning for new recommendations...</p>
                  </div>
               )}
            </div>
         </div>

         {/* Right: Full AI Report (Markdown) */}
         <div className="space-y-8">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <FileText className="h-6 w-6" />
               </div>
               <h2 className="text-2xl font-bold text-white">Full Strategy</h2>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#09090b] p-8 max-h-[800px] overflow-y-auto custom-scrollbar">
               <div className="prose prose-invert prose-sm prose-primary max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-zinc-400 prose-p:leading-relaxed">
                  <Markdown>{report.report_markdown}</Markdown>
               </div>
            </div>

            <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/10 flex items-center justify-center gap-2 group">
               <span>Export Strategy (PDF)</span>
               <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
         </div>
      </div>
    </div>
  )
}
