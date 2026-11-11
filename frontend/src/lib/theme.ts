'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { THEME_STORAGE_KEY as STORAGE_KEY } from './themeScript'

export type ThemePreference = 'light' | 'dark' | 'system'

const CHANGE_EVENT = 'reelysis-theme-change'

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function applyPreference(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

// Every toggle on the page (sidebar menu, settings, footer) reads the same stored value.
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useTheme() {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribe,
    readPreference,
    () => 'system',
  )

  // While on "system", follow the OS when it switches.
  useEffect(() => {
    if (preference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyPreference('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {}
    applyPreference(next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return { preference, setPreference }
}
