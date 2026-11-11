'use client'

import { useState, useEffect, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'

// Hooks
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useTriggerSync } from '@/features/instagram/hooks/useTriggerSync'
import { useStartInstagramOAuth } from '@/features/instagram/hooks/useStartInstagramOAuth'
import { getOAuthErrorMessage } from '@/features/instagram/utils'
import { useConfirmNiche } from '@/features/instagram/hooks/useConfirmNiche'
import { useCompetitors, useRemoveCompetitor, useRediscoverCompetitors } from '@/features/competitors/hooks/useCompetitors'
import { useAnalysisJob, useAnalysisJobById } from '@/features/instagram/hooks/useAnalysisJob'
import { useGenerateRoadmap } from '@/features/reports/hooks/useGenerateRoadmap'
import { getReports } from '@/features/reports/api'
import { getReportGenerationUi } from '@/features/reports/utils/reportGenerationProgress'
import { getCompetitorDiscoveryUi, getInstagramSyncUi } from '@/features/jobs/utils/jobProgressUtils'

// Components
import { ConnectStep } from './components/ConnectStep'
import { AnalyzingStep } from './components/AnalyzingStep'
import { NicheStep } from './components/NicheStep'
import { CompetitorStep } from './components/CompetitorStep'
import { AddCompetitorForm } from '@/features/competitors/components/AddCompetitorForm'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { OnboardingPageSkeleton } from '@/components/shared/PageSkeletons'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OnboardingStepFrame } from './components/OnboardingStepFrame'

type OnboardingStep = 
  | 'CONNECT' 
  | 'ANALYZING' 
  | 'NICHE' 
  | 'FINDING_COMPETITORS' 
  | 'COMPETITORS'
  | 'GENERATING_ROADMAP'
  | 'COMPLETED'

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingPageSkeleton />}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const isJustConnected = searchParams.get('connected') === 'true'
  const oauthErrorMessage = getOAuthErrorMessage(searchParams.get('error'))
  
  const [step, setStep] = useState<OnboardingStep>('CONNECT')
  const [localNiche, setLocalNiche] = useState('')
  
  // Manual Gate States
  const [hasTriggeredSync, setHasTriggeredSync] = useState(false)
  const [hasApprovedCompetitors, setHasApprovedCompetitors] = useState(false)
  const [skippedReport, setSkippedReport] = useState(false)

  // 1. Data Fetching
  const { 
    data: accounts, 
    isLoading: isLoadingAccounts, 
    refetch: refetchAccounts 
  } = useInstagramAccounts({
    enabled: true,
    refetchInterval: (query) => {
      if (step !== 'ANALYZING') return false
      // Stop polling once the sync has failed; the user retries explicitly.
      const latestSync = queryClient.getQueryData<{ status?: string } | null>([
        'analysis-job',
        'instagram_sync',
      ])
      if (latestSync?.status === 'failed' && !query.state.data?.[0]?.last_synced_at) return false
      return 2000
    },
  })

  useEffect(() => {
    if (isJustConnected) {
      refetchAccounts()
    }
  }, [isJustConnected, refetchAccounts])

  const { data: discoveryJob } = useAnalysisJob('competitor_discovery', {
    refetchInterval: (query: { state: { data?: { status?: string } | null } }) => {
      const data = query.state.data
      return (data?.status === 'running' || data?.status === 'queued') ? 3000 : false
    }
  })

  const { data: competitors } = useCompetitors({
    refetchInterval: (query: { state: { data?: Array<unknown> } }) => {
      const data = query.state.data
      if (step !== 'FINDING_COMPETITORS' && step !== 'COMPETITORS') return false

      // Keep polling competitor list only while discovery is actively running.
      if (discoveryJob?.status === 'running' || discoveryJob?.status === 'queued') {
        return (!data || data.length === 0) ? 3000 : false
      }
      return false
    }
  })

  // The list is polled while discovery runs, so the last poll can land just before the
  // competitors are saved. Fetch once more when discovery finishes.
  const discoveryStatus = discoveryJob?.status
  useEffect(() => {
    if (discoveryStatus === 'succeeded') {
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
    }
  }, [discoveryStatus, queryClient])

  const { data: syncJob } = useAnalysisJob('instagram_sync', {
    refetchInterval: (query: { state: { data?: { status?: string } | null } }) => {
      const data = query.state.data
      return (data?.status === 'running' || data?.status === 'queued') ? 3000 : false
    }
  })

  const [pendingReportJobId, setPendingReportJobId] = useState<string | null>(null)

  const { data: roadmapJobById } = useAnalysisJobById(pendingReportJobId, {
    refetchInterval: (query: { state: { data?: { status?: string } | null } }) => {
      const data = query.state.data
      return (data?.status === 'running' || data?.status === 'queued') ? 3000 : false
    },
  })

  const { data: roadmapJobLatest } = useAnalysisJob('report_generation', {
    enabled: !pendingReportJobId,
    refetchInterval: (query: { state: { data?: { status?: string } | null } }) => {
      const data = query.state.data
      return (data?.status === 'running' || data?.status === 'queued') ? 3000 : false
    },
  })

  const roadmapJob = pendingReportJobId ? roadmapJobById : roadmapJobLatest

  // 2. Mutations
  const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync()
  const {
    mutate: startOAuth,
    isPending: isStartingOAuth,
    error: startOAuthError,
  } = useStartInstagramOAuth()
  const { mutate: confirmNiche, isPending: isConfirmingNiche } = useConfirmNiche()
  const { mutate: removeCompetitor } = useRemoveCompetitor()
  const { mutate: rediscoverCompetitors, isPending: isRediscovering } = useRediscoverCompetitors()
  const { mutate: generateRoadmap, isPending: isGeneratingRoadmap } = useGenerateRoadmap()

  const account = accounts?.[0]
  const isConnected = !!account

  const syncUi = getInstagramSyncUi(
    syncJob?.progress ?? 0,
    syncJob?.status,
    !!account?.niche_detected,
  )

  const discoveryUi = getCompetitorDiscoveryUi(
    discoveryJob?.progress ?? 0,
    discoveryJob?.status,
  )

  // 3. Flow Logic
  // The step is deliberately sticky state rather than a pure derivation: once the user reaches
  // COMPETITORS or later it must not jump back when polled data changes, so it syncs in an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isLoadingAccounts) return

    // Don't reset step if already on COMPETITORS or beyond
    if (step === 'COMPETITORS' || step === 'GENERATING_ROADMAP' || step === 'COMPLETED') {
      return
    }

    if (!isConnected) {
      setStep('CONNECT')
    } else if (!account.last_synced_at || isSyncing || syncJob?.status === 'running' || syncJob?.status === 'queued') {
      setStep('ANALYZING')
      if (!account.last_synced_at && !isSyncing && !syncJob && !hasTriggeredSync) {
        setHasTriggeredSync(true)
        triggerSync()
      }
    } else if (!account.niche_confirmed) {
      // Niche detection can fail (e.g. AI quota); the user can still type one in.
      if (step !== 'NICHE') {
        setLocalNiche(account.niche_detected || '')
      }
      setStep('NICHE')
    } else if (roadmapJob?.status === 'running' || roadmapJob?.status === 'queued') {
      setStep('GENERATING_ROADMAP')
    } else if (roadmapJob?.status === 'succeeded') {
      setStep('COMPLETED')
    } else if (hasApprovedCompetitors) {
      setStep('COMPETITORS')
    } else if (discoveryJob?.status === 'running' || discoveryJob?.status === 'queued') {
      setStep('FINDING_COMPETITORS')
    } else if (discoveryJob?.status === 'succeeded' && competitors && competitors.length > 0) {
      setStep('COMPETITORS')
    } else if (discoveryJob?.status === 'succeeded') {
      setStep('FINDING_COMPETITORS')
    } else if (discoveryJob?.status === 'failed') {
      setStep('FINDING_COMPETITORS')
    } else if (competitors && competitors.length > 0) {
      setStep('COMPETITORS')
    } else {
      setStep('FINDING_COMPETITORS')
    }
  }, [isConnected, account, isSyncing, syncJob, discoveryJob, roadmapJob, competitors, isLoadingAccounts, triggerSync, hasApprovedCompetitors, isJustConnected, hasTriggeredSync, step])
  /* eslint-enable react-hooks/set-state-in-effect */

  // 4. Handlers
  const handleConnect = () => startOAuth()

  const handleOpenReport = async () => {
    if (skippedReport) {
      router.push('/reports')
      return
    }
    // Reports are listed newest first, so the first one is the report just generated.
    try {
      const { data } = await getReports()
      router.push(data[0] ? `/reports/${data[0].id}` : '/reports')
    } catch {
      router.push('/reports')
    }
  }

  const handleRetrySync = () => {
    setHasTriggeredSync(true)
    triggerSync()
  }

  const handleConfirmNiche = () => {
    setHasApprovedCompetitors(false)
    confirmNiche(localNiche)
  }

  const handleFinishOnboarding = () => {
    generateRoadmap(undefined, {
      onSuccess: (data) => {
        if (data?.job_id) {
          setPendingReportJobId(String(data.job_id))
        }
        setStep('GENERATING_ROADMAP')
      },
    })
  }

  // 5. Render
  // The flow effect never leaves GENERATING_ROADMAP, so a finished report completes here.
  const visibleStep: OnboardingStep =
    step === 'GENERATING_ROADMAP' && roadmapJob?.status === 'succeeded' ? 'COMPLETED' : step

  switch (visibleStep) {
    case 'CONNECT':
      return (
        <ConnectStep
          onConnect={handleConnect}
          isConnecting={isStartingOAuth}
          errorMessage={
            startOAuthError
              ? 'Could not start the Instagram connection. Please try again.'
              : oauthErrorMessage
          }
        />
      )
    
    case 'ANALYZING': {
      const isSyncFailed = syncJob?.status === 'failed' && !isSyncing
      const needsReconnect = isSyncFailed && Boolean(account?.needs_reconnect)
      return (
        <AnalyzingStep
          variant="shimmer"
          statusText={syncUi.description}
          errorMessage={isSyncFailed ? syncJob?.error_message : undefined}
        >
          {needsReconnect ? (
            <Button onClick={handleConnect} disabled={isStartingOAuth}>
              <ButtonLoadingLabel loading={isStartingOAuth} loadingLabel="Redirecting…">
                Reconnect Instagram
              </ButtonLoadingLabel>
            </Button>
          ) : isSyncFailed ? (
            <Button onClick={handleRetrySync} disabled={isSyncing}>
              <ButtonLoadingLabel loading={isSyncing} loadingLabel="Starting…">
                Retry sync
              </ButtonLoadingLabel>
            </Button>
          ) : null}
        </AnalyzingStep>
      )
    }
    
    case 'NICHE':
      return (
        <NicheStep 
          niche={localNiche} 
          setNiche={setLocalNiche} 
          onConfirm={handleConfirmNiche} 
          isConfirming={isConfirmingNiche} 
        />
      )
    
    case 'FINDING_COMPETITORS':
      const isDiscoveryDone = discoveryJob?.status === 'succeeded'
      const isDiscoveryFailed = discoveryJob?.status === 'failed'
      return (
        <AnalyzingStep
          statusText={
            isDiscoveryFailed
              ? discoveryUi.description
              : isDiscoveryDone
                ? competitors && competitors.length > 0
                  ? 'Competitor accounts found. Review and confirm your list.'
                  : 'We could not find matching accounts automatically. Add competitors by handle.'
                : discoveryUi.description
          }
          tasks={isDiscoveryDone ? undefined : discoveryUi.tasks}
          errorMessage={isDiscoveryFailed ? discoveryJob?.error_message : undefined}
        >
          {isDiscoveryDone && (
            <Button
              onClick={() => {
                setHasApprovedCompetitors(true)
                setStep('COMPETITORS')
              }}
            >
              Review competitors
            </Button>
          )}
          {isDiscoveryFailed && (
            <div className="flex w-full max-w-md flex-col items-center gap-4">
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => rediscoverCompetitors()} disabled={isRediscovering}>
                  <ButtonLoadingLabel loading={isRediscovering} loadingLabel="Retrying…">
                    Retry discovery
                  </ButtonLoadingLabel>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setHasApprovedCompetitors(true)
                    setStep('COMPETITORS')
                  }}
                >
                  Add manually
                </Button>
              </div>
              <AddCompetitorForm
                className="w-full"
                onAdded={() => {
                  setHasApprovedCompetitors(true)
                  setStep('COMPETITORS')
                }}
              />
            </div>
          )}
        </AnalyzingStep>
      )
    
    case 'COMPETITORS':
      return (
        <CompetitorStep 
          competitors={competitors || []} 
          onRemove={(id) => removeCompetitor(id)} 
          onFinish={handleFinishOnboarding} 
          isFinishing={isGeneratingRoadmap}
        />
      )
    
    case 'GENERATING_ROADMAP': {
      const isRoadmapFailed = roadmapJob?.status === 'failed'
      const roadmapUi = getReportGenerationUi(roadmapJob?.progress ?? 0, roadmapJob?.status)
      return (
        <AnalyzingStep
          statusText={roadmapUi.description}
          tasks={isRoadmapFailed ? undefined : roadmapUi.tasks}
          errorMessage={isRoadmapFailed ? roadmapJob?.error_message : undefined}
        >
          {isRoadmapFailed && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() =>
                  generateRoadmap(undefined, {
                    onSuccess: (data) => {
                      if (data?.job_id) {
                        setPendingReportJobId(String(data.job_id))
                      }
                      setStep('GENERATING_ROADMAP')
                    },
                  })
                }
              >
                Retry
              </Button>
              <Button
                onClick={() => {
                  setSkippedReport(true)
                  setStep('COMPLETED')
                }}
                variant="outline"
              >
                Skip and continue
              </Button>
            </div>
          )}
        </AnalyzingStep>
      )
    }
    
    case 'COMPLETED':
      return (
        <OnboardingStepFrame narrow>
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-surface-card">
              <Check className="h-6 w-6 text-primary" strokeWidth={2} />
            </div>
            <h1 className="text-lg font-semibold text-white sm:text-xl">
              {skippedReport ? 'You’re all set' : 'Your strategy report is ready'}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
              {skippedReport
                ? 'Your Reels and competitors are synced, but the report didn’t finish. You can generate it any time from Reports.'
                : 'We analyzed your Reels and competitors. Open the dashboard to read your report and next steps.'}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full sm:w-auto"
                size="lg"
              >
                Go to dashboard
              </Button>
              <Button
                onClick={handleOpenReport}
                variant="outline"
                className="w-full sm:w-auto"
                size="lg"
              >
                {skippedReport ? 'Go to reports' : 'Read the report'}
              </Button>
            </div>
          </div>
        </OnboardingStepFrame>
      )

    default:
      return null
  }
}
