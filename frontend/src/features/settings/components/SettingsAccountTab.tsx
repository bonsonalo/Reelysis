'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { formatLastSynced } from '@/lib/utils'
import { ReconnectInstagramBanner } from '@/features/instagram/components/ReconnectInstagramBanner'
import {
  SettingsActions,
  SettingsField,
  SettingsNotice,
  SettingsPanelHeader,
  SettingsSection,
  SettingsSectionHeader,
} from './settingsUi'

type ConnectedAccount = {
  username: string
  last_synced_at?: string | null
  niche_confirmed?: string | null
  niche_detected?: string | null
  needs_reconnect?: boolean
}

type SettingsAccountTabProps = {
  account?: ConnectedAccount
  nicheDraft: string
  onNicheDraftChange: (value: string) => void
  nicheMessage: string | null
  nicheError: string | null
  isDetectingNiche: boolean
  isUpdatingNiche: boolean
  onDetectNiche: () => void
  onSaveNiche: (triggerDiscovery: boolean) => void
  onDisconnect: () => void
  isDisconnecting: boolean
}

export function SettingsAccountTab({
  account,
  nicheDraft,
  onNicheDraftChange,
  nicheMessage,
  nicheError,
  isDetectingNiche,
  isUpdatingNiche,
  onDetectNiche,
  onSaveNiche,
  onDisconnect,
  isDisconnecting,
}: SettingsAccountTabProps) {
  const router = useRouter()

  if (!account) {
    return (
      <SettingsSection>
        <SettingsPanelHeader
          title="Instagram"
          description="Connect your account to sync Reels and run competitor analysis."
        />
        <div className="px-4 py-8 sm:px-6 sm:py-10">
          <PageEmptyState
            primary="No Instagram account connected."
            secondary="You will need to connect through Meta before Reelysis can sync your Reels or suggest competitors."
          />
          <Button className="mt-6" onClick={() => router.push('/onboarding')}>
            Connect Instagram
          </Button>
        </div>
      </SettingsSection>
    )
  }

  const nicheBusy = isDetectingNiche || isUpdatingNiche
  const hasNiche = Boolean(nicheDraft.trim())

  return (
    <SettingsSection id="content-niche" className="scroll-mt-24">
      <SettingsPanelHeader
        title="Instagram"
        description="Your connected account, content niche, and sync status."
      />

      <div className="border-b border-border-subtle px-4 py-5 sm:px-6 sm:py-6">
        {account.needs_reconnect ? (
          <ReconnectInstagramBanner username={account.username} className="mb-5" />
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <a
              href={`https://instagram.com/${account.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium text-white transition-colors duration-150 hover:text-primary"
            >
              @{account.username}
            </a>
            <p className="mt-1.5 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={
                    account.needs_reconnect
                      ? 'h-1.5 w-1.5 rounded-full bg-amber-400'
                      : 'h-1.5 w-1.5 rounded-full bg-emerald-400'
                  }
                  aria-hidden
                />
                {account.needs_reconnect ? 'Reconnect needed' : 'Connected'}
              </span>
              <span className="mx-2 text-text-tertiary" aria-hidden>
                ·
              </span>
              Last synced {formatLastSynced(account.last_synced_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-border-subtle px-4 py-5 sm:px-6 sm:py-6">
        <SettingsSectionHeader
          title="Content niche"
          description="Used for competitor suggestions and how your content is framed in reports."
        />

        <div className="space-y-4">
          <SettingsField
            id="content-niche-input"
            label="Niche"
            value={nicheDraft}
            onChange={onNicheDraftChange}
            placeholder="e.g. Home decor and DIY"
            disabled={nicheBusy}
          />

          {account.niche_detected && account.niche_detected !== nicheDraft.trim() ? (
            <p className="text-sm text-text-secondary">
              Last detected:{' '}
              <span className="text-text-label">{account.niche_detected}</span>
            </p>
          ) : null}

          {nicheMessage ? <SettingsNotice tone="success">{nicheMessage}</SettingsNotice> : null}
          {nicheError ? <SettingsNotice tone="error">{nicheError}</SettingsNotice> : null}

          <SettingsActions>
            <Button
              type="button"
              onClick={() => onSaveNiche(false)}
              disabled={nicheBusy || !hasNiche}
              className="w-full sm:w-auto"
            >
              <ButtonLoadingLabel loading={isUpdatingNiche} loadingLabel="Saving…">
                Save niche
              </ButtonLoadingLabel>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onDetectNiche}
              disabled={nicheBusy}
              className="w-full sm:w-auto"
            >
              <ButtonLoadingLabel loading={isDetectingNiche} loadingLabel="Detecting…">
                Re-detect from Reels
              </ButtonLoadingLabel>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onSaveNiche(true)}
              disabled={nicheBusy || !hasNiche}
              className="w-full sm:w-auto"
            >
              <ButtonLoadingLabel loading={isUpdatingNiche} loadingLabel="Saving…">
                Save and re-discover
              </ButtonLoadingLabel>
            </Button>
          </SettingsActions>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <SettingsSectionHeader
          title="Disconnect"
          description="Remove your Instagram connection and delete all synced data from Reelysis."
        />
        <p className="text-sm leading-relaxed text-text-secondary">
          This permanently deletes your synced Reels, competitors, analyses, and reports.
          You can reconnect later, but the data will not be restored.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="mt-4 w-full sm:w-auto"
          onClick={onDisconnect}
          disabled={isDisconnecting}
        >
          Disconnect Instagram
        </Button>
      </div>
    </SettingsSection>
  )
}
