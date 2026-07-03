'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useReport } from '@/features/reports/hooks/useLatestReport'
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
  ArrowLeft,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import Markdown from 'react-markdown'
import { cn } from '@/lib/utils'

export default function ReportDetailPage() {
  const params = useParams()
  const reportId = params.id as string

  const { data: report, isLoading, refetch } = useReport(reportId)
  const { mutate: updateRecommendation, isPending: isUpdating } = useUpdateRecommendation()
  const { mutate: generateReport } = useGenerateRoadmap()
  const { data: reportJob, refetch: refetchJob } = useAnalysisJob('report_generation')

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => refetchJob(), 3000)
    return () => clearInterval(interval)
  }, [isGenerating, refetchJob])

  useEffect(() => {
    if (reportJob?.status === 'succeeded') {
      refetch()
      setIsGenerating(false)
    }
    if (reportJob?.status === 'failed') {
      setIsGenerating(false)
    }
  }, [reportJob?.status, refetch])

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center text-center p-4">
        <AlertCircle className="h-12 w-12 text-zinc-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Report not found</h2>
        <Button asChild className="mt-6">
          <Link href="/reports">Back to Reports</Link>
        </Button>
      </div>
    )
  }

  const recommendations = (report.recommendations as Recommendation[]) || []
  const filteredRecommendations = recommendations.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'pending') return item.status === 'pending'
    if (filter === 'completed') return item.status === 'completed'
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All reports
          </Link>
          <h1 className="text-3xl font-bold text-white">{report.title}</h1>
          <p className="mt-2 text-zinc-500">
            {new Date(report.created_at).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <Button
          onClick={() =>
            generateReport(undefined, {
              onSuccess: () => setIsGenerating(true),
            })
          }
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

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <p className="text-zinc-300 leading-relaxed">{report.summary}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recommendations</h2>
            <div className="flex items-center gap-1 text-sm">
              {(['all', 'pending', 'completed'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'px-3 py-1 rounded-md transition-colors capitalize',
                    filter === value ? 'bg-primary text-black font-medium' : 'text-zinc-500 hover:text-white'
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredRecommendations.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group rounded-2xl border p-6 transition-all',
                  item.status === 'completed'
                    ? 'border-emerald-500/20 bg-emerald-500/5 opacity-60'
                    : 'border-white/5 bg-[#09090b] hover:border-primary/20'
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border',
                      item.priority >= 4
                        ? 'bg-red-500/10 border-red-500/20 text-red-500'
                        : 'bg-primary/10 border-primary/20 text-primary'
                    )}
                  >
                    {item.recommedation_type}
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
                        'h-8 w-8 p-0',
                        item.status === 'completed'
                          ? 'text-emerald-500 hover:text-emerald-400'
                          : 'text-zinc-500 hover:text-primary'
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
                <h3
                  className={cn(
                    'text-xl font-bold mb-2',
                    item.status === 'completed' ? 'text-zinc-400 line-through' : 'text-white'
                  )}
                >
                  {item.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-4">{item.description}</p>
                <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Lightbulb className="h-3 w-3 text-primary" />
                    The Evidence
                  </p>
                  <p className="text-xs text-zinc-400 italic">{item.evidence}</p>
                </div>
              </div>
            ))}
            {filteredRecommendations.length === 0 && (
              <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl">
                <CheckCircle2 className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
                <p className="text-sm text-zinc-500">No recommendations match this filter.</p>
              </div>
            )}
          </div>
        </div>

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
