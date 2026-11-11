'use client'

import { getApiErrorMessage } from '@/lib/utils'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useDisconnectInstagram } from '@/features/instagram/hooks/useDisconnectInstagram'
import { useDetectNiche, useUpdateNiche } from '@/features/instagram/hooks/useNiche'
import { useAuth } from '@/store/hook'
import { SettingsPageSkeleton } from '@/components/shared/PageSkeletons'
import { DisconnectInstagramDialog } from '@/features/instagram/components/DisconnectInstagramDialog'
import { SettingsNav, isSettingsTab, type SettingsTab } from '@/features/settings/components/SettingsNav'
import { SettingsProfileTab } from '@/features/settings/components/SettingsProfileTab'
import { SettingsAccountTab } from '@/features/settings/components/SettingsAccountTab'
import { SettingsSecurityTab } from '@/features/settings/components/SettingsSecurityTab'
import { PageHeader } from '@/components/shared/Panel'

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: accounts, isLoading: isLoadingAccounts } = useInstagramAccounts()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectInstagram()
  const { mutate: detectNiche, isPending: isDetectingNiche } = useDetectNiche()
  const { mutate: updateNiche, isPending: isUpdatingNiche } = useUpdateNiche()
  const { currentUser, status: authStatus } = useAuth()
  const account = accounts?.[0]
  const tabParam = searchParams.get('tab')
  const activeTab: SettingsTab = isSettingsTab(tabParam) ? tabParam : 'profile'
  // null = untouched, so the input shows the saved niche until the user edits it.
  const [nicheEdit, setNicheDraft] = useState<string | null>(null)
  const nicheDraft = nicheEdit ?? (account?.niche_confirmed || account?.niche_detected || '')
  const [nicheMessage, setNicheMessage] = useState<string | null>(null)
  const [nicheError, setNicheError] = useState<string | null>(null)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('tab') !== 'account') return
    if (typeof window === 'undefined' || window.location.hash !== '#content-niche') return
    const el = document.getElementById('content-niche')
    if (el) {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [searchParams, activeTab])

  const handleTabChange = (tab: SettingsTab) => {
    router.replace(`/settings?tab=${tab}`, { scroll: false })
  }

  const handleDetectNiche = () => {
    setNicheError(null)
    setNicheMessage(null)
    detectNiche(undefined, {
      onSuccess: (data) => {
        setNicheDraft(data.niche_detected)
        setNicheMessage(
          `Detected "${data.niche_detected}" from ${data.caption_count} synced caption${data.caption_count === 1 ? '' : 's'}. Save to apply.`,
        )
      },
      onError: (err: unknown) => {
        const message = getApiErrorMessage(err, '')
        setNicheError(typeof message === 'string' ? message : 'Could not detect niche. Try again later.')
      },
    })
  }

  const handleSaveNiche = (triggerDiscovery: boolean) => {
    setNicheError(null)
    setNicheMessage(null)
    const trimmed = nicheDraft.trim()
    if (!trimmed) {
      setNicheError('Niche cannot be empty.')
      return
    }
    updateNiche(
      { niche: trimmed, trigger_discovery: triggerDiscovery },
      {
        onSuccess: () => {
          setNicheMessage(
            triggerDiscovery
              ? 'Niche saved. Competitor discovery started in the background.'
              : 'Niche saved.',
          )
        },
        onError: (err: unknown) => {
          const message = getApiErrorMessage(err, '')
          setNicheError(typeof message === 'string' ? message : 'Failed to save niche.')
        },
      },
    )
  }

  const handleDisconnectConfirm = () => {
    setDisconnectError(null)
    disconnect(undefined, {
      onSuccess: () => {
        setDisconnectDialogOpen(false)
        setNicheDraft(null)
        setNicheMessage(null)
        setNicheError(null)
      },
      onError: (err: unknown) => {
        const message = getApiErrorMessage(err, '')
        setDisconnectError(
          typeof message === 'string' ? message : 'Failed to disconnect. Please try again.',
        )
      },
    })
  }

  if (isLoadingAccounts || authStatus === 'loading') {
    return <SettingsPageSkeleton />
  }

  return (
    <div className="space-y-6 pb-16 sm:space-y-8">
      <PageHeader
        title="Settings"
        description="Your Reelysis account, Instagram connection and sign-in."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <SettingsNav activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="min-w-0 flex-1 lg:max-w-2xl">
          {activeTab === 'profile' && (
            <SettingsProfileTab
              name={currentUser?.name}
              email={currentUser?.email}
              emailVerified={currentUser?.email_verified}
              avatarUrl={account?.profile_picture_url}
            />
          )}

          {activeTab === 'account' && (
            <SettingsAccountTab
              account={account}
              nicheDraft={nicheDraft}
              onNicheDraftChange={setNicheDraft}
              nicheMessage={nicheMessage}
              nicheError={nicheError}
              isDetectingNiche={isDetectingNiche}
              isUpdatingNiche={isUpdatingNiche}
              onDetectNiche={handleDetectNiche}
              onSaveNiche={handleSaveNiche}
              onDisconnect={() => {
                setDisconnectError(null)
                setDisconnectDialogOpen(true)
              }}
              isDisconnecting={isDisconnecting}
            />
          )}

          {activeTab === 'security' && <SettingsSecurityTab />}
        </div>
      </div>

      <DisconnectInstagramDialog
        open={disconnectDialogOpen}
        username={account?.username}
        isPending={isDisconnecting}
        error={disconnectError}
        onClose={() => {
          if (!isDisconnecting) setDisconnectDialogOpen(false)
        }}
        onConfirm={handleDisconnectConfirm}
      />
    </div>
  )
}
