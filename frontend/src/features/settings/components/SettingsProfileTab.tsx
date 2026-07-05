'use client'

import {
  getDisplayName,
  getUserInitials,
  SettingsPanelHeader,
  SettingsRow,
  SettingsSection,
} from './settingsUi'

type SettingsProfileTabProps = {
  name?: string | null
  email?: string
}

export function SettingsProfileTab({ name, email }: SettingsProfileTabProps) {
  const displayName = getDisplayName(name, email)
  const initials = getUserInitials(name, email)

  return (
    <SettingsSection>
      <SettingsPanelHeader
        title="Profile"
        description="Your Reelysis login and account details."
      />

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="mt-0.5 truncate text-sm text-text-secondary">{email || '—'}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle px-4 sm:px-6">
        <SettingsRow
          label="Plan"
          description="Paid plans are not available yet. Everyone starts on Free."
        >
          <span className="text-text-secondary">Free</span>
        </SettingsRow>
      </div>
    </SettingsSection>
  )
}
