import { api } from '@/lib/axios'

export const getInstagramAccounts = async () => {
  const response = await api.get('/api/v1/instagram/accounts')
  return response.data
}

export interface TriggerSyncResponse {
  message: string
  job_id: string
  status: string
}

export const triggerInstagramSync = async (): Promise<TriggerSyncResponse> => {
  const response = await api.post<TriggerSyncResponse>('/api/v1/instagram/sync')
  return response.data
}

export const confirmNiche = async (niche: string) => {
  const response = await api.patch('/api/v1/instagram/niche/confirm', { niche })
  return response.data
}

export const updateNiche = async (niche: string, triggerDiscovery = false) => {
  const response = await api.patch('/api/v1/instagram/niche', {
    niche,
    trigger_discovery: triggerDiscovery,
  })
  return response.data
}

export const detectNiche = async () => {
  const response = await api.post<{
    niche_detected: string
    niche_confirmed: string | null
    biography?: string
    caption_count: number
  }>('/api/v1/instagram/niche/detect')
  return response.data
}
