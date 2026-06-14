'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/hook'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { Loader2, Menu, X, Zap } from 'lucide-react'
import { Sidebar } from '@/components/shared/Sidebar'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { isLoading } = useCurrentUser()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      <div className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-all lg:hidden",
        isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )} onClick={() => setIsSidebarOpen(false)} />

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#09090b] px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
               <Zap className="h-5 w-5 text-black fill-current" />
            </div>
            <span className="text-lg font-black tracking-tighter uppercase">Reelysis</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 md:p-10 lg:p-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
