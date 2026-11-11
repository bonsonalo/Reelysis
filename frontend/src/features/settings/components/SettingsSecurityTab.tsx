'use client'

import { ChangePasswordForm } from './ChangePasswordForm'
import {
  SettingsComingSoon,
  SettingsPanelHeader,
  SettingsRow,
  SettingsSection,
  SettingsSectionHeader,
} from './settingsUi'

export function SettingsSecurityTab() {
  return (
    <SettingsSection>
      <SettingsPanelHeader
        title="Security"
        description="Password and sign-in options for your Reelysis account."
      />
      <div className="border-b border-border-subtle px-4 py-5 sm:px-6 sm:py-6">
        <SettingsSectionHeader
          title="Change password"
          description="Changing your password signs you out on every other device."
        />
        <ChangePasswordForm />
      </div>
      <div className="px-4 sm:px-6">
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
