'use client'

import {
  SettingsComingSoon,
  SettingsPanelHeader,
  SettingsRow,
  SettingsSection,
} from './settingsUi'

export function SettingsSecurityTab() {
  return (
    <SettingsSection>
      <SettingsPanelHeader
        title="Security"
        description="Password and sign-in options for your Reelysis account."
      />
      <div className="divide-y divide-border-subtle px-4 sm:px-6">
        <SettingsRow
          label="Password"
          description="Change the password you use to sign in."
        >
          <SettingsComingSoon />
        </SettingsRow>
        <SettingsRow
          label="Two-factor authentication"
          description="Require a code from your phone when signing in."
        >
          <SettingsComingSoon />
        </SettingsRow>
      </div>
    </SettingsSection>
  )
}
