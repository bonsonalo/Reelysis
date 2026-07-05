'use client'

import { cn } from '@/lib/utils'

export type SettingsTab = 'profile' | 'account' | 'security'

export const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Instagram' },
  { id: 'security', label: 'Security' },
]

export function isSettingsTab(value: string | null): value is SettingsTab {
  return value === 'profile' || value === 'account' || value === 'security'
}

type SettingsNavProps = {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

export function SettingsNav({ activeTab, onTabChange }: SettingsNavProps) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-[10px] border border-border-subtle bg-surface-input p-1 lg:w-52 lg:shrink-0 lg:flex-col lg:overflow-visible lg:self-start"
      aria-label="Settings sections"
    >
      {SETTINGS_TABS.map((tab) => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
              active
                ? 'bg-white/[0.08] font-medium text-white'
                : 'text-text-secondary hover:bg-white/[0.04] hover:text-white',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
