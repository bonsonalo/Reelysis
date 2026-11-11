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
      className="flex gap-1 overflow-x-auto border-b border-border-subtle pb-px lg:w-48 lg:shrink-0 lg:flex-col lg:self-start lg:overflow-visible lg:border-b-0 lg:pb-0"
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
              active
                ? 'bg-surface-hover font-medium text-foreground'
                : 'text-text-secondary hover:bg-surface-hover hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
