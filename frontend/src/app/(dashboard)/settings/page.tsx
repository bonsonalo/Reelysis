'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useDisconnectInstagram } from '@/features/instagram/hooks/useDisconnectInstagram'
import { useDetectNiche, useUpdateNiche } from '@/features/instagram/hooks/useNiche'
import { useAuth } from '@/store/hook'
import { 
  User, 
  Camera, 
  ShieldCheck, 
  AlertCircle,
  Loader2,
  Sparkles,
  Mail,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatLastSynced } from '@/lib/utils'

type SettingsTab = 'profile' | 'account' | 'security'

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === 'profile' || value === 'account' || value === 'security'
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const { data: accounts } = useInstagramAccounts()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectInstagram()
  const { mutate: detectNiche, isPending: isDetectingNiche } = useDetectNiche()
  const { mutate: updateNiche, isPending: isUpdatingNiche } = useUpdateNiche()
  const { currentUser } = useAuth()
  const account = accounts?.[0]
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [nicheDraft, setNicheDraft] = useState('')
  const [nicheMessage, setNicheMessage] = useState<string | null>(null)
  const [nicheError, setNicheError] = useState<string | null>(null)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (isSettingsTab(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

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

  useEffect(() => {
    if (account) {
      setNicheDraft(account.niche_confirmed || account.niche_detected || '')
    }
  }, [account?.niche_confirmed, account?.niche_detected])

  const handleDetectNiche = () => {
    setNicheError(null)
    setNicheMessage(null)
    detectNiche(undefined, {
      onSuccess: (data) => {
        setNicheDraft(data.niche_detected)
        setNicheMessage(`AI detected: "${data.niche_detected}" from ${data.caption_count} synced caption(s). Save to apply.`)
      },
      onError: (err: unknown) => {
        const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
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
              : 'Niche saved. Re-run discovery on the Competitors page when ready.'
          )
        },
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setNicheError(typeof message === 'string' ? message : 'Failed to save niche.')
        },
      },
    )
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'account', name: 'Connected Account', icon: Camera },
    { id: 'security', name: 'Security', icon: ShieldCheck },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-24">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Settings</h1>
        <p className="mt-1 text-zinc-500 font-medium">Manage your account preferences and integrations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="w-full md:w-64 flex flex-row md:flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary text-black' 
                  : 'text-zinc-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-8">
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="rounded-2xl border border-white/5 bg-[#09090b] p-8 space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black text-primary uppercase">
                       {currentUser?.email?.[0] || 'U'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{currentUser?.email || 'User'}</h3>
                      <p className="text-sm text-zinc-500">Free Tier Account</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                          <Mail className="h-3 w-3" /> Email Address
                       </label>
                       <div className="w-full h-12 rounded-xl bg-black border border-white/10 flex items-center px-4 text-zinc-400 font-medium">
                          {currentUser?.email}
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="rounded-2xl border border-white/5 bg-[#09090b] p-8">
                <h3 className="text-xl font-bold text-white mb-6">Instagram Integration</h3>
                
                {account ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-black border border-white/10">
                       <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                             <Camera className="h-7 w-7" />
                          </div>
                          <div>
                             <p className="font-bold text-white">@{account.username}</p>
                             <p className="text-xs text-zinc-500">Connected via Meta Business API</p>
                             <p className="text-xs text-zinc-400 mt-1">
                               Last synced: {formatLastSynced(account.last_synced_at)}
                             </p>
                          </div>
                       </div>
                       <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                          Active
                       </div>
                    </div>

                    <div
                      id="content-niche"
                      className="rounded-2xl border border-white/10 bg-black p-6 space-y-4 scroll-mt-24"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-white">Content niche</h4>
                        <p className="text-xs text-zinc-500 mt-1">
                          Competitor discovery uses this niche. If you onboarded in mock mode, re-detect from your real Reels.
                        </p>
                      </div>
                      <input
                        type="text"
                        value={nicheDraft}
                        onChange={(e) => setNicheDraft(e.target.value)}
                        placeholder="e.g. Home Decor & DIY"
                        className="w-full h-12 rounded-xl bg-[#09090b] border border-white/10 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50"
                      />
                      {account.niche_detected && account.niche_detected !== nicheDraft && (
                        <p className="text-xs text-zinc-500">
                          Last AI detection: <span className="text-zinc-300">{account.niche_detected}</span>
                        </p>
                      )}
                      {nicheMessage && <p className="text-xs text-emerald-400">{nicheMessage}</p>}
                      {nicheError && <p className="text-xs text-red-400">{nicheError}</p>}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/10"
                          onClick={handleDetectNiche}
                          disabled={isDetectingNiche}
                        >
                          {isDetectingNiche ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Re-detect with AI
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleSaveNiche(false)}
                          disabled={isUpdatingNiche}
                        >
                          {isUpdatingNiche ? 'Saving…' : 'Save niche'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleSaveNiche(true)}
                          disabled={isUpdatingNiche}
                        >
                          Save & re-discover
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex gap-3">
                       <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                       <p className="text-xs text-red-500/80 leading-relaxed font-medium">
                          Disconnecting your account will immediately stop all background indexing and delete your custom growth roadmap. This action cannot be undone.
                       </p>
                    </div>

                    <Button 
                      variant="destructive" 
                      className="w-full h-12 font-bold"
                      onClick={() => disconnect()}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect Instagram Account'}
                    </Button>
                  </div>
                ) : (
                   <div className="text-center py-12 space-y-4">
                      <div className="mx-auto h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-700">
                         <Camera className="h-8 w-8" />
                      </div>
                      <p className="text-zinc-500 font-medium italic">No Instagram account connected.</p>
                      <Button className="font-bold px-8">Connect Now</Button>
                   </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="rounded-2xl border border-white/5 bg-[#09090b] p-8 space-y-8">
                  <h3 className="text-xl font-bold text-white">Security Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/10">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-colors">
                             <Lock className="h-5 w-5" />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-white">Update Password</p>
                             <p className="text-xs text-zinc-500">Change your login credentials</p>
                          </div>
                       </div>
                       <ChevronRight className="h-5 w-5 text-zinc-700" />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/10">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-colors">
                             <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-white">Two-Factor Auth</p>
                             <p className="text-xs text-zinc-500">Add an extra layer of security</p>
                          </div>
                       </div>
                       <div className="text-[10px] font-black uppercase tracking-widest text-zinc-700 bg-white/5 px-2 py-0.5 rounded">Off</div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}
