'use client'

import { useState, useEffect } from 'react'
import { useLatestReport, useRoadmap } from '@/features/reports/hooks/useLatestReport'
import { useUpdateRecommendation } from '@/features/reports/hooks/useUpdateRecommendation'
import { useGenerateRoadmap } from '@/features/reports/hooks/useGenerateRoadmap'
import { useAnalysisJob } from '@/features/instagram/hooks/useAnalysisJob'
import { Recommendation } from '@/features/reports/api'
import { 
  CheckCircle2, 
  Clock, 
  Lightbulb, 
  Zap, 
  AlertCircle,
  RefreshCw,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import Markdown from 'react-markdown'
import { cn } from '@/lib/utils'

export default function StrategicRoadmapPage() {
  const { data: report, isLoading: isLoadingReport, refetch: refetchReport } = useLatestReport()
  const { data: roadmap, isLoading: isLoadingRoadmap, refetch: refetchRoadmap } = useRoadmap()
  const { mutate: updateRecommendation, isPending: isUpdating } = useUpdateRecommendation()
  const { mutate: generateRoadmap } = useGenerateRoadmap()
  const { data: reportJob, refetch: refetchJob } = useAnalysisJob('report_generation')
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [isGenerating, setIsGenerating] = useState(false)

  // Poll job status when generating
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        refetchJob()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isGenerating, refetchJob])

  const handleRefresh = () => {
    refetchReport()
    refetchRoadmap()
  }

  const handleGenerateReport = () => {
    generateRoadmap(undefined, {
      onSuccess: () => {
        setIsGenerating(true)
      }
    })
  }

  useEffect(() => {
    if (reportJob?.status === 'succeeded' || reportJob?.status === 'failed') {
      refetchReport()
      refetchRoadmap()
      setTimeout(() => setIsGenerating(false), 0)
    }
  }, [reportJob?.status, refetchReport, refetchRoadmap])

  const getReportAge = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === 0) return 'Today'
    if (daysDiff === 1) return 'Yesterday'
    if (daysDiff < 7) return `${daysDiff} days ago`
    if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`
    return `${Math.floor(daysDiff / 30)} months ago`
  }


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

  const recommendations = (roadmap as Recommendation[]) || []

  const sortedRecommendations = [...recommendations].sort((a: Recommendation, b: Recommendation) => b.priority - a.priority)
  
  const filteredRecommendations = sortedRecommendations.filter((item: Recommendation) => {
    if (filter === 'all') return true
    if (filter === 'pending') return item.status === 'pending'
    if (filter === 'completed') return item.status === 'completed'
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Strategic Roadmap</h1>
          <p className="mt-2 text-zinc-500">
            Updated {getReportAge(report.created_at)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleRefresh}
            variant="outline" 
            size="sm"
            className="border-white/10 hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button 
            onClick={handleGenerateReport}
            disabled={isGenerating || reportJob?.status === 'running' || reportJob?.status === 'queued'}
            size="sm"
          >
            {(isGenerating || reportJob?.status === 'running' || reportJob?.status === 'queued') ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate New
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
         {/* Left: Top Actions */}
         <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold text-white">Recommendations</h2>
               
               <div className="flex items-center gap-1 text-sm">
                  <button
                    onClick={() => setFilter('all')}
                    className={cn(
                      "px-3 py-1 rounded-md transition-colors",
                      filter === 'all' ? "bg-primary text-black font-medium" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('pending')}
                    className={cn(
                      "px-3 py-1 rounded-md transition-colors",
                      filter === 'pending' ? "bg-primary text-black font-medium" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilter('completed')}
                    className={cn(
                      "px-3 py-1 rounded-md transition-colors",
                      filter === 'completed' ? "bg-primary text-black font-medium" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    Completed
                  </button>
               </div>
            </div>

            <div className="space-y-4">
               {filteredRecommendations.map((item: Recommendation, i: number) => (
                  <div 
                    key={i} 
                    className={cn(
                      "group rounded-2xl border p-6 transition-all",
                      item.status === 'completed' 
                        ? "border-emerald-500/20 bg-emerald-500/5 opacity-60" 
                        : "border-white/5 bg-[#09090b] hover:border-primary/20 hover:bg-[#0c0c0e]"
                    )}
                  >
                     <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-col gap-1">
                           <div className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                              item.priority >= 4 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-primary/10 border-primary/20 text-primary"
                           )}>
                              {item.recommedation_type}
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                              <Clock className="h-3 w-3" />
                              Priority: {item.priority}/5
                           </div>
                           <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateRecommendation(item.id)}
                              disabled={isUpdating}
                              className={cn(
                                "h-8 w-8 p-0",
                                item.status === 'completed' 
                                  ? "text-emerald-500 hover:text-emerald-400" 
                                  : "text-zinc-500 hover:text-primary"
                              )}
                           >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                           </Button>
                        </div>
                     </div>
                     <h3 className={cn(
                       "text-xl font-bold mb-2",
                       item.status === 'completed' ? "text-zinc-400 line-through" : "text-white"
                     )}>{item.title}</h3>
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
               {filteredRecommendations.length === 0 && recommendations.length > 0 && (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                     <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
                     <p className="text-sm text-zinc-500">No recommendations match the current filter.</p>
                  </div>
               )}
               {recommendations.length === 0 && (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                     <AlertCircle className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                     <p className="text-sm text-zinc-500 mb-2">No recommendations available yet.</p>
                     <p className="text-xs text-zinc-600 mb-4">Complete your analysis to generate actionable insights.</p>
                     <Button onClick={handleGenerateReport} className="h-10 px-6">
                       <Zap className="mr-2 h-4 w-4" />
                       Generate Report
                     </Button>
                  </div>
               )}
            </div>
         </div>

         {/* Right: Full AI Report (Markdown) */}
         <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Full Report</h2>

            <div className="rounded-2xl border border-white/5 bg-[#09090b] p-6 max-h-[700px] overflow-y-auto custom-scrollbar">
               <div className="prose prose-invert prose-sm prose-primary max-w-none prose-headings:font-bold prose-p:text-zinc-400">
                  <Markdown>{report.report_markdown}</Markdown>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
