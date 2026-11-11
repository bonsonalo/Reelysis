'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/utils'
import { useDeleteAccount } from '@/features/auth/hooks/useAccountSecurity'
import { DeleteAccountDialog } from './DeleteAccountDialog'
import {
  getDisplayName,
  getUserInitials,
  SettingsPanelHeader,
  SettingsRow,
  SettingsSection,
  SettingsDangerZone,
  dangerButtonClass,
} from './settingsUi'

type SettingsProfileTabProps = {
  name?: string | null
  email?: string
  emailVerified?: boolean
}

export function SettingsProfileTab({ name, email, emailVerified }: SettingsProfileTabProps) {
  const displayName = getDisplayName(name, email)
  const initials = getUserInitials(name, email)
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = (password: string) => {
    setDeleteError(null)
    deleteAccount(password, {
      onSuccess: () => setDialogOpen(false),
      onError: (err) =>
        setDeleteError(getApiErrorMessage(err, 'Could not delete your account. Try again.')),
    })
  }

  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsPanelHeader
          title="Profile"
          description="Your Reelysis login and account details."
        />

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="mt-0.5 truncate text-sm text-text-secondary">{email || '—'}</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border-subtle border-t border-border-subtle px-4 sm:px-6">
          <SettingsRow label="Email status">
            {emailVerified ? (
              <span className="text-success">Verified</span>
            ) : (
              <span className="text-warning">Not verified</span>
            )}
          </SettingsRow>
          <SettingsRow
            label="Plan"
            description="Paid plans are not available yet. Everyone starts on Free."
          >
            <span className="text-text-secondary">Free</span>
          </SettingsRow>
        </div>

      </SettingsSection>

      <SettingsDangerZone
        title="Delete account"
        description="Permanently removes your Reelysis account and all of its data."
      >
        <Button
          type="button"
          variant="outline"
          className={dangerButtonClass}
          onClick={() => {
            setDeleteError(null)
            setDialogOpen(true)
          }}
          disabled={isDeleting}
        >
          Delete account
        </Button>
      </SettingsDangerZone>

        <DeleteAccountDialog
          open={dialogOpen}
          isPending={isDeleting}
          error={deleteError}
          onClose={() => {
            if (!isDeleting) setDialogOpen(false)
          }}
          onConfirm={handleDelete}
        />
    </div>
  )
}
