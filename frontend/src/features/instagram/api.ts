import { api } from '@/lib/axios'

export interface InstagramAccount {
  id: string
  username: string
  account_type?: string
  profile_picture_url?: string | null
  biography?: string | null
  niche_detected?: string | null
  niche_confirmed?: string | null
  followers_count?: number
  media_count?: number
  last_synced_at?: string | null
  token_expires_at?: string | null
  needs_reconnect?: boolean
}

export const getInstagramAccounts = async (): Promise<InstagramAccount[]> => {
  const response = await api.get<InstagramAccount[]>('/api/v1/instagram/accounts')
  return response.data
}

export const startInstagramOAuth = async (): Promise<string | null> => {
  const response = await api.get<{ oauth_url?: string }>('/api/v1/instagram/oauth/start')
  return response.data?.oauth_url ?? null
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
  const response = await api.patch<{ message: string; niche: string }>(
    '/api/v1/instagram/niche/confirm',
    { niche },
  )
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
