'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useReports } from '@/features/reports/hooks/useLatestReport'
import { useGenerateRoadmap } from '@/features/reports/hooks/useGenerateRoadmap'
import { useAnalysisJob } from '@/features/instagram/hooks/useAnalysisJob'
import { FileText, Zap, Loader2, ChevronRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ReportsPage() {
  const { data: reports, isLoading, refetch } = useReports()
  const { mutate: generateReport } = useGenerateRoadmap()
  const { data: reportJob, refetch: refetchJob } = useAnalysisJob('report_generation')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => refetchJob(), 3000)
    return () => clearInterval(interval)
  }, [isGenerating, refetchJob])

  useEffect(() => {
    if (reportJob?.status === 'succeeded' || reportJob?.status === 'failed') {
      refetch()
      setIsGenerating(false)
    }
  }, [reportJob?.status, refetch])

  const handleGenerate = () => {
    generateReport(undefined, {
      onSuccess: () => setIsGenerating(true),
    })
  }

  const formatDate = (createdAt: string) => {
    return new Date(createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports</h1>
          <p className="mt-2 text-zinc-500">
            Strategic growth reports generated from your content and competitor analysis.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || reportJob?.status === 'running' || reportJob?.status === 'queued'}
        >
          {(isGenerating || reportJob?.status === 'running' || reportJob?.status === 'queued') ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Generate New Report
            </>
          )}
        </Button>
      </div>

      {!reports || reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
          <AlertCircle className="h-12 w-12 text-zinc-600 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No reports yet</h2>
          <p className="max-w-md text-zinc-500 mb-8">
            Complete onboarding and video analysis, then generate your first strategic report.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => (window.location.href = '/onboarding')} className="border-white/10">
              Go to Onboarding
            </Button>
            <Button onClick={handleGenerate}>Generate Report</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report, index) => (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className={cn(
                'group block rounded-2xl border border-white/5 bg-[#09090b] p-6 transition-all hover:border-primary/30 hover:bg-[#0c0c0e]',
                index === 0 && 'border-primary/20 bg-primary/5'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-white truncate">{report.title}</h2>
                      {index === 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mb-2">{formatDate(report.created_at)}</p>
                    <p className="text-sm text-zinc-400 line-clamp-2">{report.summary}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-primary shrink-0 mt-1 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
