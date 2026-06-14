import { api } from '@/lib/axios'

export interface CompetitorAccount {
  id: string
  handle: string
  display_name: string
  followers_count: number
  media_count: number
  engagement_rank: number
  profile_picture_url?: string
}

export const getCompetitors = () => {
  return api.get<CompetitorAccount[]>('/api/v1/competitors/')
}

export const removeCompetitor = (id: string) => {
  return api.delete(`/api/v1/competitors/${id}`)
}
