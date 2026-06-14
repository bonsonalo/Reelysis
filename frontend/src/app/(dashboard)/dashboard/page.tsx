'use client'

import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import { useDashboardGrowth } from '@/features/dashboard/hooks/useDashboardGrowth'
import { useContentPillars } from '@/features/dashboard/hooks/useContentPillars'
import { useDashboardVideos } from '@/features/dashboard/hooks/useDashboardVideos'
import { useCompetitors } from '@/features/competitors/hooks/useCompetitors'
import { 
  Eye, 
  Users, 
  TrendingUp, 
  Zap,
  ArrowUpRight,
  Plus,
  Loader2,
  Users2,
  Sparkles,
  Video,
  Play,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GrowthChart } from '@/features/dashboard/components/GrowthChart'

export default function DashboardPage() {
  const { data: accounts } = useInstagramAccounts()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: growth } = useDashboardGrowth()
  const { data: pillars } = useContentPillars()
  const { data: videos } = useDashboardVideos()
  const { data: competitors } = useCompetitors()
  const account = accounts?.[0]

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const metricCards = [
    { 
      name: 'Total Views', 
      value: stats ? formatNumber(stats.total_views) : '0', 
      change: stats?.views_change || '0%', 
      icon: Eye 
    },
    { 
      name: 'Average Reach', 
      value: stats ? formatNumber(stats.avg_reach) : '0', 
      change: stats?.reach_change || '0%', 
      icon: Users 
    },
    { 
      name: 'Avg. Engagement', 
      value: stats ? `${stats.avg_engagement}%` : '0%', 
      change: stats?.engagement_change || '0%', 
      icon: TrendingUp 
    },
    { 
      name: 'Top Hook Score', 
      value: stats ? `${stats.top_hook_score}/100` : '0/100', 
      change: stats?.hook_change || '+0', 
      icon: Zap 
    },
  ]

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Welcome back, <span className="text-primary">{account?.username || 'Creator'}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here is what's happening with your Reels this week.
          </p>
        </div>
        <Button className="h-11 px-6 font-bold shadow-lg shadow-primary/20 flex items-center transition-colors hover:bg-primary/20">
          <Plus className="mr-2 h-5 w-5" /> <div>New Analysis </div>
        </Button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-white/5 bg-[#09090b] animate-pulse" />
          ))
        ) : (
          metricCards.map((stat) => (
            <div 
              key={stat.name}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#09090b] p-6 transition-all hover:border-primary/20 hover:bg-[#0c0c0e]"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-white/5 p-2.5 transition-colors group-hover:bg-primary/10">
                  <stat.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  stat.change.startsWith('+') ? "text-emerald-500" : "text-muted-foreground"
                )}>
                  {stat.change}
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
              
              <div className="mt-5">
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <h3 className="mt-1 text-3xl font-bold tracking-tight text-white">{stat.value}</h3>
              </div>

              <div className="absolute -bottom-px left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all group-hover:via-primary/40" />
            </div>
          ))
        )}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Growth Chart Area */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#09090b] p-8 min-h-[400px]">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Views vs. Reach
              </h3>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Reach</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
                {growth?.data && growth.data.length > 0 ? (
                  <GrowthChart data={growth.data} />
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                    <p className="text-sm text-muted-foreground italic text-center px-10">
                      Not enough data yet. Post more Reels to see your viral growth trends.
                    </p>
                  </div>
                )}
            </div>
        </div>
        
        {/* Competitors Sidebar */}
        <div className="rounded-2xl border border-white/5 bg-[#09090b] p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                Tracked Competitors
              </h3>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {competitors?.length || 0}
              </span>
            </div>
            
            <div className="space-y-4">
              {competitors?.map((comp) => (
                <div key={comp.id} className="flex items-center gap-3 group">
                  <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                    {comp.profile_picture_url ? (
                      <img src={comp.profile_picture_url} alt={comp.handle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {comp.handle[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">@{comp.handle}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(comp.followers_count)} followers</p>
                  </div>
                </div>
              ))}
              {(!competitors || competitors.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground italic">No competitors tracked yet.</p>
                </div>
              )}
            </div>
            
            <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-xs font-bold h-10">
              Manage Competitors
            </Button>
        </div>
      </div>

      {/* Content Pillars Section */}
      <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-white">High-Performing Content Pillars</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pillars?.data.map((item, i) => (
              <div key={i} className="group rounded-2xl border border-white/5 bg-[#09090b] p-6 hover:border-primary/20 transition-all hover:bg-[#0c0c0e]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Pillar {i+1}</span>
                  <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <Zap className="h-3 w-3 fill-current" />
                    {item.avg_engagement}% Eng.
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 capitalize">{item.pillar}</h3>
                <p className="text-sm text-muted-foreground">
                  Analyzed in {item.count} of your recent Reels.
                </p>
              </div>
            ))}
            {(!pillars || pillars.data.length === 0) && (
              [1,2,3].map(i => (
                <div key={i} className="h-32 rounded-2xl border border-white/5 bg-[#09090b] animate-pulse" />
              ))
            )}
          </div>
      </div>

      {/* Recent Reels Grid */}
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-white">Recent Reel Performance</h2>
          </div>
          <Link href="/videos">
            <Button variant="ghost" className="text-primary font-bold hover:bg-primary/10">
              View All Reels <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

import Link from 'next/link'
...
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {videos?.data.map((video) => (
            <Link 
              href={`/videos/${video.id}`} 
              key={video.id} 
              className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-white/5 bg-zinc-900 transition-all hover:border-primary/50 cursor-pointer"
            >
               <img 
                src={video.thumbnail_url} 
                alt={video.caption} 
                className="h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-100" 
              />
              
              {/* Stats Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-4 flex flex-col justify-end">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                    video.hook_score >= 80 ? "bg-emerald-500 text-black" : "bg-primary text-black"
                  )}>
                    Hook: {video.hook_score}
                  </div>
                </div>
                <div className="flex items-center justify-between text-white font-bold text-sm">
                  <div className="flex items-center gap-1">
                    <Play className="h-3 w-3 fill-current" />
                    {formatNumber(video.views)}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {video.engagement_rate}% Eng.
                  </div>
                </div>
              </div>
            </Link>
          ))}
...
          {(!videos || videos.data.length === 0) && (
             [1,2,3,4,5,6].map(i => (
                <div key={i} className="aspect-[9/16] rounded-xl border border-white/5 bg-[#09090b] animate-pulse" />
              ))
          )}
        </div>
      </div>
    </div>
  )
}
