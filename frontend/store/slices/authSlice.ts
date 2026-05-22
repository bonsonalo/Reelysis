import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  name: string
  email: string
}

interface AuthState {
  currentUser: User | null
  isAuthenticated: boolean
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: AuthState = {
  currentUser: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload
      state.isAuthenticated = true
      state.status = 'succeeded'
      state.error = null
    },
    clearUser: (state) => {
      state.currentUser = null
      state.isAuthenticated = false
      state.status = 'idle'
      state.error = null
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.status = 'failed'
    },
    setLoading: (state) => {
      state.status = 'loading'
    },
  },
})

export const { setUser, clearUser, setError, setLoading } = authSlice.actions
export default authSlice.reducer