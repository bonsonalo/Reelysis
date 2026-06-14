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
import ReactMarkdown from 'react-markdown'
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
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-zinc-500 mb-4" />
        <h2 className="text-xl font-bold text-white">No roadmap generated yet.</h2>
        <p className="text-zinc-400 mt-2">Complete your profile analysis to see your growth strategy.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Header */}
      <div className="relative rounded-3xl border border-primary/20 bg-primary/5 p-8 md:p-12 overflow-hidden shadow-2xl">
         <Zap className="absolute -top-10 -right-10 h-64 w-64 text-primary/5 -rotate-12" />
         <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest">
               <Calendar className="h-3 w-3" />
               Latest Update: {new Date(report.created_at).toLocaleDateString()}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
               Your Viral <br />
               <span className="text-primary italic font-serif">Roadmap.</span>
            </h1>
            <p className="max-w-2xl text-lg text-zinc-300 leading-relaxed font-medium">
               {report.summary}
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
         {/* Left: Actionable Tasks */}
         <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
               </div>
               <h2 className="text-2xl font-bold text-white">Priority Recommendations</h2>
            </div>

            <div className="space-y-4">
               {roadmap?.map((item, index) => (
                  <div key={item.id} className="group relative rounded-2xl border border-white/5 bg-[#09090b] p-6 hover:border-primary/30 transition-all hover:bg-[#0c0c0e]">
                     <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-white group-hover:bg-primary group-hover:text-black transition-colors">
                              {index + 1}
                           </span>
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
                  <ReactMarkdown>{report.report_markdown}</ReactMarkdown>
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
