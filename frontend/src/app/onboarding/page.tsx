'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/axios'

// Hooks
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useTriggerSync } from '@/features/instagram/hooks/useTriggerSync'
import { useConfirmNiche } from '@/features/instagram/hooks/useConfirmNiche'
import { useCompetitors, useRemoveCompetitor, useRediscoverCompetitors } from '@/features/competitors/hooks/useCompetitors'
import { useAnalysisJob, useAnalysisJobById } from '@/features/instagram/hooks/useAnalysisJob'
import { useGenerateRoadmap } from '@/features/reports/hooks/useGenerateRoadmap'
import { getReportGenerationUi } from '@/features/reports/utils/reportGenerationProgress'

// Components
import { ConnectStep } from './components/ConnectStep'
import { AnalyzingStep } from './components/AnalyzingStep'
import { NicheStep } from './components/NicheStep'
import { CompetitorStep } from './components/CompetitorStep'
import { AddCompetitorForm } from '@/features/competitors/components/AddCompetitorForm'
import { Loader2, CheckCircle2, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isJustConnected = searchParams.get('connected') === 'true'
  
  const [step, setStep] = useState<OnboardingStep>('CONNECT')
  const [localNiche, setLocalNiche] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  
  // Manual Gate States
  const [hasApprovedSync, setHasApprovedSync] = useState(false)
  const [hasTriggeredSync, setHasTriggeredSync] = useState(false)
  const [hasApprovedCompetitors, setHasApprovedCompetitors] = useState(false)

  // 1. Data Fetching
  const { 
    data: accounts, 
    isLoading: isLoadingAccounts, 
    refetch: refetchAccounts 
  } = useInstagramAccounts({
    enabled: true,
    refetchInterval: step === 'ANALYZING' ? 2000 : false
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
  const { mutate: confirmNiche, isPending: isConfirmingNiche } = useConfirmNiche()
  const { mutate: removeCompetitor } = useRemoveCompetitor()
  const { mutate: rediscoverCompetitors, isPending: isRediscovering } = useRediscoverCompetitors()
  const { mutate: generateRoadmap } = useGenerateRoadmap()

  const account = accounts?.[0]
  const isConnected = !!account

  const syncTasks = [
    { label: "Establishing Meta Handshake", status: isJustConnected || isConnected ? "completed" : "running" as any },
    { label: "Indexing Reel Performance", status: syncJob?.status === "succeeded" ? "completed" : (syncJob ? "running" : "pending") as any },
    { label: "Parsing Captions & Hashtags", status: syncJob?.status === "succeeded" ? "completed" : "pending" as any },
    { label: "Profiling Content Pillars", status: account?.niche_detected ? "completed" : "pending" as any },
  ]

  const discoveryTasks = [
    { label: "Querying Market Database", status: "completed" as any },
    { label: "Identifying High-Growth Profiles", status: discoveryJob?.status === "succeeded" ? "completed" : "running" as any },
    { label: "Calculating Engagement Strength", status: discoveryJob?.status === "succeeded" ? "completed" : "pending" as any },
  ]

  // 3. Flow Logic
  useEffect(() => {
    if (isLoadingAccounts) return

    // Don't reset step if already on COMPETITORS or beyond
    if (step === 'COMPETITORS' || step === 'GENERATING_ROADMAP' || step === 'COMPLETED') {
      return
    }

    if (!isConnected) {
      setStep('CONNECT')
    } else if (!account.last_synced_at || isSyncing || syncJob?.status === 'running' || syncJob?.status === 'queued' || !account.niche_detected) {
      setStep('ANALYZING')
      if (!account.last_synced_at && !isSyncing && !syncJob && !hasTriggeredSync) {
        setHasTriggeredSync(true)
        triggerSync()
      }
    } else if (!account.niche_confirmed) {
      setStep('NICHE')
      setLocalNiche(account.niche_detected || '')
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
  }, [isConnected, account, isSyncing, syncJob, discoveryJob, roadmapJob, competitors, isLoadingAccounts, triggerSync, hasApprovedCompetitors, isJustConnected, hasTriggeredSync])

  // 4. Handlers
  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const response = await api.get('/api/v1/instagram/oauth/start')
      if (response.data?.oauth_url) {
        window.location.href = response.data.oauth_url
      }
    } catch (error) {
      console.error('Failed to start OAuth:', error)
      setIsConnecting(false)
    }
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
  console.log('Rendering step:', step)
  switch (step) {
    case 'CONNECT':
      return <ConnectStep onConnect={handleConnect} isConnecting={isConnecting} />
    
    case 'ANALYZING':
      const isConnectionSuccess = !hasApprovedSync && (isConnected || isJustConnected)
      return (
        <AnalyzingStep 
          title={isConnectionSuccess ? "Auth Verified" : "Data Indexing"}
          description={isConnectionSuccess 
            ? "Instagram node connected. Initializing deep-scan sequence." 
            : "Indexing your Reel metrics and transcribing content DNA."
          }
          tasks={syncTasks}
        >
          {isConnectionSuccess && (
            <Button 
              onClick={() => setHasApprovedSync(true)}
              className="mt-8 h-12 px-8 text-lg font-bold flex items-center gap-2"
            >
              <Check className="h-5 w-5" />
              <span>Initialize Deep Scan</span>
            </Button>
          )}
        </AnalyzingStep>
      )
    
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
          title={isDiscoveryFailed ? "Discovery Unavailable" : isDiscoveryDone ? "Indexing Complete" : "Market Discovery"} 
          description={isDiscoveryFailed
            ? "Auto-discovery couldn't find accounts. Add competitors manually or retry."
            : isDiscoveryDone
            ? "Competitor dataset ready for review and selection." 
            : "Scanning the niche for top-performing creator benchmarks."
          }
          tasks={discoveryTasks}
        >
          {isDiscoveryDone && (
            <Button 
              onClick={() => {
                setHasApprovedCompetitors(true)
                setStep('COMPETITORS')
              }}
              className="mt-8 h-12 px-8 text-lg font-bold flex items-center gap-2"
            >
              <Check className="h-5 w-5" />
              <span>View Market Data</span>
            </Button>
          )}
          {isDiscoveryFailed && (
            <div className="flex flex-col items-center gap-4 mt-8 w-full max-w-md mx-auto">
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => rediscoverCompetitors()}
                  disabled={isRediscovering}
                  className="h-12 px-8 text-lg font-bold"
                >
                  {isRediscovering ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Retry discovery'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setHasApprovedCompetitors(true)
                    setStep('COMPETITORS')
                  }}
                  className="h-12 px-8 text-lg font-bold border-white/10"
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
      console.log('COMPETITORS step rendering:', { competitors, competitorsCount: competitors?.length })
      return (
        <CompetitorStep 
          competitors={competitors || []} 
          onRemove={(id) => removeCompetitor(id)} 
          onFinish={handleFinishOnboarding} 
          isFinishing={false}
        />
      )
    
    case 'GENERATING_ROADMAP': {
      const isRoadmapFailed = roadmapJob?.status === 'failed'
      const roadmapUi = getReportGenerationUi(roadmapJob?.progress ?? 0, roadmapJob?.status)
      return (
        <AnalyzingStep 
          title={isRoadmapFailed ? "Strategy Generation Failed" : "Building Your Strategy"} 
          description={roadmapUi.description}
          tasks={roadmapUi.tasks}
          progressPercent={roadmapUi.progressPercent}
        >
          {isRoadmapFailed && roadmapJob?.error_message && (
            <p className="text-sm text-red-400 text-center max-w-md mb-4">{roadmapJob.error_message}</p>
          )}
          {isRoadmapFailed && (
            <div className="flex gap-4 mt-8">
              <Button 
                onClick={() => generateRoadmap(undefined, {
                  onSuccess: (data) => {
                    if (data?.job_id) {
                      setPendingReportJobId(String(data.job_id))
                    }
                    setStep('GENERATING_ROADMAP')
                  },
                })}
                className="h-12 px-8 text-lg font-bold"
              >
                Retry
              </Button>
              <Button 
                onClick={() => setStep('COMPLETED')}
                variant="outline"
                className="h-12 px-8 text-lg font-bold"
              >
                Skip & Continue
              </Button>
            </div>
          )}
        </AnalyzingStep>
      )
    }
    
    case 'COMPLETED':
      return (
        <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center px-4 text-center animate-in fade-in zoom-in duration-700">
          <div className="mb-6 rounded-full bg-emerald-500/10 p-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-white">Your Strategy is Ready!</h1>
          <p className="mb-10 max-w-md text-muted-foreground">
            We've analyzed your niche and competitors. Your personalized growth roadmap is waiting for you in the dashboard.
          </p>
          <Button 
            onClick={() => router.push('/dashboard')}
            className="h-14 px-12 text-lg font-bold shadow-xl shadow-primary/20 flex items-center gap-2"
          >
            <Check className="h-5 w-5" />
            <span>Finish & Go to Dashboard</span>
          </Button>
        </div>
      )

    default:
      return null
  }
}
