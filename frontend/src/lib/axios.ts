import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

// Paths that must never trigger a refresh attempt (would loop).
const AUTH_PATHS = ['/api/v1/auth/login', '/api/v1/auth/signup', '/api/v1/auth/refresh']

// Pages a logged-out visitor may stay on after a failed refresh.
export const PUBLIC_PAGES = [
  '/',
  '/login',
  '/register',
  '/privacy',
  '/terms',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

// One refresh shared by every request that got a 401 at the same time. Refresh tokens
// rotate, so parallel refresh calls would revoke each other and log the user out.
let refreshPromise: Promise<void> | null = null

function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/api/v1/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    if (!original) return Promise.reject(error)

    const isAuthRequest = AUTH_PATHS.some((path) => original.url?.includes(path))

    if (error.response?.status === 401 && !original._retry && !isAuthRequest) {
      original._retry = true
      try {
        await refreshSession()
        return api(original)
      } catch {
        if (typeof window !== 'undefined' && !PUBLIC_PAGES.includes(window.location.pathname)) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)
