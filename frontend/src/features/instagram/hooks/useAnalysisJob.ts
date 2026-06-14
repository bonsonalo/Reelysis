import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export interface AnalysisJob {
  id: string
  job_type: string
  status: string
  progress: number
  error_message?: string
}

export const useAnalysisJob = (jobType: string, options?: { refetchInterval?: number | false }) => {
  return useQuery({
    queryKey: ['analysis-job', jobType],
    queryFn: async () => {
      // Find the latest job of this type for the user
      // We might need an endpoint for this or just filter the list of jobs
      const response = await api.get<AnalysisJob[]>(`/api/v1/analysis/jobs?type=${jobType}`)
      return response.data?.[0] || null
    },
    ...options
  })
}
