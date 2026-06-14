'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/axios'

// Hooks
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useTriggerSync } from '@/features/instagram/hooks/useTriggerSync'
import { useConfirmNiche } from '@/features/instagram/hooks/useConfirmNiche'
import { useCompetitors, useRemoveCompetitor } from '@/features/competitors/hooks/useCompetitors'
import { useAnalysisJob } from '@/features/instagram/hooks/useAnalysisJob'
import { useGenerateRoadmap } from '@/features/reports/hooks/useGenerateRoadmap'

// Components
import { ConnectStep } from './components/ConnectStep'
import { AnalyzingStep } from './components/AnalyzingStep'
import { NicheStep } from './components/NicheStep'
import { CompetitorStep } from './components/CompetitorStep'
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
  const [hasApprovedCompetitors, setHasApprovedCompetitors] = useState(false)

  // 1. Data Fetching
  const { 
    data: accounts, 
    isLoading: isLoadingAccounts, 
    refetch: refetchAccounts 
  } = useInstagramAccounts({
    enabled: true,
    refetchInterval: (query) => {
      const data = query.state.data
      const account = data?.[0]
      return (account && !account.niche_detected) ? 3000 : false
    }
  })

  useEffect(() => {
    if (isJustConnected) {
      refetchAccounts()
    }
  }, [isJustConnected, refetchAccounts])

  const { data: competitors } = useCompetitors({
    refetchInterval: (query) => {
       const data = query.state.data
       return (step === 'FINDING_COMPETITORS' && (!data || data.length === 0)) ? 3000 : false
    }
  })

  const { data: discoveryJob } = useAnalysisJob('competitor_discovery', {
    refetchInterval: (query) => {
      const data = query.state.data
      return (data?.status === 'running' || data?.status === 'queued') ? 3000 : false
    }
  })

  const { data: syncJob } = useAnalysisJob('instagram_sync', {
    refetchInterval: (query) => {
      const data = query.state.data
      return (data?.status === 'running' || data?.status === 'queued') ? 3000 : false
    }
  })

  const { data: roadmapJob } = useAnalysisJob('report_generation', {
    refetchInterval: (query) => {
      const data = query.state.data
      return (data?.status === 'running' || data?.status === 'queued') ? 3000 : false
    }
  })

  // 2. Mutations
  const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync()
  const { mutate: confirmNiche, isPending: isConfirmingNiche } = useConfirmNiche()
  const { mutate: removeCompetitor } = useRemoveCompetitor()
  const { mutate: generateRoadmap } = useGenerateRoadmap()

  const account = accounts?.[0]
  const isConnected = !!account

  const syncTasks = [
    { label: "Establishing Meta Handshake", status: isJustConnected || isConnected ? "completed" : "running" as any },
    { label: "Indexing Reel Performance", status: syncJob?.status === "succeeded" ? "completed" : (syncJob ? "running" : "pending") as any },
    { label: "Transcribing Audio & Visuals", status: syncJob?.status === "succeeded" ? "completed" : "pending" as any },
    { label: "Profiling Content Pillars", status: account?.niche_detected ? "completed" : "pending" as any },
  ]

  const discoveryTasks = [
    { label: "Querying Market Database", status: "completed" as any },
    { label: "Identifying High-Growth Profiles", status: discoveryJob?.status === "succeeded" ? "completed" : "running" as any },
    { label: "Calculating Engagement Strength", status: discoveryJob?.status === "succeeded" ? "completed" : "pending" as any },
  ]

  const roadmapTasks = [
    { label: "Synthesizing Competitor Data", status: "completed" as any },
    { label: "Drafting Actionable Recommendations", status: roadmapJob?.status === "succeeded" ? "completed" : "running" as any },
    { label: "Finalizing Viral Roadmap", status: roadmapJob?.status === "succeeded" ? "completed" : "pending" as any },
  ]

  // 3. Flow Logic
  useEffect(() => {
    if (isLoadingAccounts) return

    if (!isConnected) {
      setStep('CONNECT')
    } else if ((!account.last_synced_at || isJustConnected) && !hasApprovedSync) {
      setStep('ANALYZING') 
    } else if (isSyncing || syncJob?.status === 'running' || syncJob?.status === 'queued' || (hasApprovedSync && !account.niche_detected)) {
      setStep('ANALYZING')
      if (hasApprovedSync && !account.last_synced_at && !isSyncing && !syncJob) {
        triggerSync()
      }
    } else if (!account.niche_confirmed) {
      setStep('NICHE')
      setLocalNiche(account.niche_detected || '')
    } else if (roadmapJob?.status === 'running' || roadmapJob?.status === 'queued') {
      setStep('GENERATING_ROADMAP')
    } else if (roadmapJob?.status === 'succeeded') {
      setStep('COMPLETED')
    } else if ((discoveryJob?.status === 'succeeded' || (competitors && competitors.length > 0)) && !hasApprovedCompetitors) {
      setStep('FINDING_COMPETITORS') 
    } else if (discoveryJob?.status === 'running' || discoveryJob?.status === 'queued' || !competitors || competitors.length === 0) {
      setStep('FINDING_COMPETITORS')
    } else {
      setStep('COMPETITORS')
    }
  }, [isConnected, account, isSyncing, syncJob, discoveryJob, roadmapJob, competitors, isLoadingAccounts, triggerSync, hasApprovedSync, hasApprovedCompetitors, isJustConnected])

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
      onSuccess: () => {
        setStep('GENERATING_ROADMAP')
      }
    })
  }

  // 5. Render
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
      return (
        <AnalyzingStep 
          title={isDiscoveryDone && !hasApprovedCompetitors ? "Indexing Complete" : "Market Discovery"} 
          description={isDiscoveryDone && !hasApprovedCompetitors
            ? "Competitor dataset ready for review and selection." 
            : "Scanning the niche for top-performing creator benchmarks."
          }
          tasks={discoveryTasks}
        >
          {isDiscoveryDone && !hasApprovedCompetitors && (
            <Button 
              onClick={() => setHasApprovedCompetitors(true)}
              className="mt-8 h-12 px-8 text-lg font-bold flex items-center gap-2"
            >
              <Check className="h-5 w-5" />
              <span>View Market Data</span>
            </Button>
          )}
        </AnalyzingStep>
      )
    
    case 'COMPETITORS':
      return (
        <CompetitorStep 
          competitors={competitors || []} 
          onRemove={(id) => removeCompetitor(id)} 
          onFinish={handleFinishOnboarding} 
          isFinishing={false}
        />
      )
    
    case 'GENERATING_ROADMAP':
      return (
        <AnalyzingStep 
          title="Strategy Synthesis" 
          description="Compiling market trends and profile data into a final roadmap." 
          tasks={roadmapTasks}
        />
      )
    
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
