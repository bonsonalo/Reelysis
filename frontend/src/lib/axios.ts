import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    
    // List of paths that shouldn't trigger a redirect loop
    const authPaths = ['/api/v1/auth/login', '/api/v1/auth/signup', '/api/v1/auth/refresh']
    const isAuthRequest = authPaths.some(path => original.url?.includes(path))
    
    if (error.response?.status === 401 && !original._retry && !isAuthRequest) {
      original._retry = true
      try {
        await api.post('/api/v1/auth/refresh')
        return api(original)
      } catch {
        // Only redirect if we are not already on an auth page
        const publicPages = ['/login', '/register', '/']
        if (!publicPages.includes(window.location.pathname)) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)