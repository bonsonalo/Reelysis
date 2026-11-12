export const THEME_STORAGE_KEY = 'reelysis-theme'

/**
 * Runs before first paint (inlined in <head>) so the saved theme is applied
 * without a flash of the other one. No saved choice means dark, the original
 * Reelysis look. Keep it dependency-free.
 */
export const themeBootScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'dark';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light')}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()`
