import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from '@/store'
import {
  closeMobileSidebar,
  openMobileSidebar,
  toggleMobileSidebar,
} from '@/store/slices/sidebarSlice'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export const useAuth = () => {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((state) => state.auth)

  return {
    currentUser: auth.currentUser,
    isAuthenticated: auth.isAuthenticated,
    status: auth.status,
    error: auth.error,
    dispatch,
  }
}

export const useSidebar = () => {
  const dispatch = useAppDispatch()
  const isMobileOpen = useAppSelector((state) => state.sidebar.isMobileOpen)

  return {
    isMobileOpen,
    openMobileSidebar: () => dispatch(openMobileSidebar()),
    closeMobileSidebar: () => dispatch(closeMobileSidebar()),
    toggleMobileSidebar: () => dispatch(toggleMobileSidebar()),
  }
}