import { createSlice } from '@reduxjs/toolkit'

interface SidebarState {
  isMobileOpen: boolean
}

const initialState: SidebarState = {
  isMobileOpen: false,
}

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    openMobileSidebar: (state) => {
      state.isMobileOpen = true
    },
    closeMobileSidebar: (state) => {
      state.isMobileOpen = false
    },
    toggleMobileSidebar: (state) => {
      state.isMobileOpen = !state.isMobileOpen
    },
  },
})

export const { openMobileSidebar, closeMobileSidebar, toggleMobileSidebar } =
  sidebarSlice.actions

export default sidebarSlice.reducer
