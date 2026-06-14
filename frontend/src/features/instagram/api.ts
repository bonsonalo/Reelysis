import { api } from '@/lib/axios'

export const getInstagramAccounts = async () => {
  const response = await api.get('/api/v1/instagram/accounts')
  return response.data
}

export const triggerInstagramSync = async () => {
  const response = await api.post('/api/v1/instagram/sync')
  return response.data
}

export const confirmNiche = async (niche: string) => {
  const response = await api.patch('/api/v1/instagram/niche/confirm', { niche })
  return response.data
}
