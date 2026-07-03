import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export interface AnalysisJob {
  id: string
  job_type?: string
  type?: string
  status: string
  progress: number
  error_message?: string
  completed_at?: string
  created_at?: string
}

function normalizeAnalysisJob(raw: AnalysisJob): AnalysisJob {
  return {
    ...raw,
    job_type: raw.job_type ?? raw.type,
  }
}

type AnalysisJobQueryOptions = {
  refetchInterval?: number | false | ((query: { state: { data?: AnalysisJob | null } }) => number | false)
  enabled?: boolean
}

export const useAnalysisJob = (jobType: string, options?: AnalysisJobQueryOptions) => {
  return useQuery({
    queryKey: ['analysis-job', jobType],
    queryFn: async () => {
      const response = await api.get<AnalysisJob[]>(
        `/api/v1/analysis/jobs?type=${jobType}&limit=1`
      )
      const job = response.data?.[0]
      return job ? normalizeAnalysisJob(job) : null
    },
    ...options,
  })
}

export const useAnalysisJobById = (jobId: string | null, options?: AnalysisJobQueryOptions) => {
  return useQuery({
    queryKey: ['analysis-job-by-id', jobId],
    queryFn: async () => {
      const response = await api.get<AnalysisJob>(`/api/v1/analysis/jobs/${jobId}`)
      return normalizeAnalysisJob(response.data)
    },
    enabled: !!jobId,
    ...options,
  })
}
