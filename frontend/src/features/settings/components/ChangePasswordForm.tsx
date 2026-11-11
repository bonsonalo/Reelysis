'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { getApiErrorMessage } from '@/lib/utils'
import { useChangePassword } from '@/features/auth/hooks/useAccountSecurity'
import { passwordMeetsRules } from '@/features/auth/utils/passwordRules'
import { PasswordRuleList } from '@/features/auth/components/PasswordRuleList'
import { SettingsActions, SettingsField, SettingsNotice } from './settingsUi'

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const { mutate: changePassword, isPending } = useChangePassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setNotice(null)
    if (!passwordMeetsRules(newPassword)) {
      setNotice({ tone: 'error', text: 'Your new password does not meet all the requirements.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setNotice({ tone: 'error', text: 'New passwords do not match.' })
      return
    }
    changePassword(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setNotice({
            tone: 'success',
            text: 'Password updated. Other devices have been signed out.',
          })
        },
        onError: (err) =>
          setNotice({ tone: 'error', text: getApiErrorMessage(err, 'Could not update password.') }),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SettingsField
        id="current-password"
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={setCurrentPassword}
        disabled={isPending}
      />
      <SettingsField
        id="new-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={setNewPassword}
        disabled={isPending}
      />
      {newPassword ? <PasswordRuleList value={newPassword} /> : null}
      <SettingsField
        id="confirm-new-password"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        disabled={isPending}
      />

      {notice ? <SettingsNotice tone={notice.tone}>{notice.text}</SettingsNotice> : null}

      <SettingsActions>
        <Button
          type="submit"
          disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
          className="w-full sm:w-auto"
        >
          <ButtonLoadingLabel loading={isPending} loadingLabel="Updating…">
            Update password
          </ButtonLoadingLabel>
        </Button>
      </SettingsActions>
    </form>
  )
}
