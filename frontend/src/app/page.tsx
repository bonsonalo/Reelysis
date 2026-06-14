'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, BarChart3, Users2, Zap, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/store/hook'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'

export default function LandingPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  
  // Only fetch accounts if authenticated to determine redirection target
  const { data: accounts, isLoading: isLoadingAccounts } = useInstagramAccounts({
    enabled: isAuthenticated
  })

  // Smart Redirect Logic:
  // 1. Detects authentication via store (populated by AuthInitializer)
  // 2. Redirects to Dashboard if IG is connected
  // 3. Redirects to Onboarding if IG is NOT connected
  useEffect(() => {
    if (isAuthenticated && !isLoadingAccounts && accounts !== undefined) {
      const isConnected = accounts && accounts.length > 0
      if (isConnected) {
        router.push('/dashboard')
      } else {
        router.push('/onboarding')
      }
    }
  }, [isAuthenticated, accounts, isLoadingAccounts, router])

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-black fill-current" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Reelysis</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/register">
              <Button size="sm" className="font-bold">
                {isAuthenticated ? "Go to App" : "Get Started"}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary/80">Indexing & Analysis Engine</span>
          </div>
          
          <h1 className="mx-auto mb-8 max-w-4xl text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl">
            Close the <br />
            <span className="text-primary italic">Reach-Gap.</span>
          </h1>
          
          <p className="mx-auto mb-12 max-w-2xl text-lg text-zinc-500 md:text-xl font-medium leading-relaxed">
            AI-driven transcription and competitor indexing for high-retention Reels. 
            Identify winning content pillars and generate data-backed growth roadmaps.
          </p>
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 text-lg font-black shadow-2xl shadow-primary/20 flex items-center gap-2">
                {isAuthenticated ? "Continue to App" : "Get Started for Free"} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* App Preview Placeholder */}
          <div className="mt-20 relative mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#09090b] p-2 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
             <div className="aspect-[16/9] w-full rounded-2xl bg-black flex items-center justify-center overflow-hidden border border-white/5 relative group">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-40 grayscale transition-all group-hover:grayscale-0 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary">
                    <Play className="h-8 w-8 fill-current" />
                  </div>
                  <p className="font-bold text-sm uppercase tracking-widest opacity-80">See how it works</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Hook Analysis",
                desc: "AI identifies which hooks are driving your retention and which are falling flat."
              },
              {
                icon: Users2,
                title: "Competitor Intel",
                desc: "Track top creators in your niche. See their best topics and stealing their secrets."
              },
              {
                icon: BarChart3,
                title: "Growth Roadmap",
                desc: "Get a step-by-step content strategy tailored to your account's unique DNA."
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-3xl border border-white/5 bg-white/[0.02] transition-all hover:bg-white/[0.04] hover:border-white/10">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-4 text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Zap className="h-3 w-3 text-black fill-current" />
            </div>
            <span className="text-sm font-black tracking-tighter uppercase">Reelysis</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2024 Reelysis. For creators who mean business.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
