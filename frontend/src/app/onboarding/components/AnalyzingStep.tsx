'use client'

import { Loader2, Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  label: string
  status: 'pending' | 'running' | 'completed'
}

interface AnalyzingStepProps {
  title?: string
  description?: string
  tasks?: Task[]
  children?: React.ReactNode
}

export function AnalyzingStep({ 
  title = "Processing...", 
  description = "Building your strategy based on account data.",
  tasks = [
    { label: "Connecting to Meta API", status: "completed" },
    { label: "Fetching recent Reels", status: "running" },
    { label: "Transcribing audio content", status: "pending" },
    { label: "Detecting content pillars", status: "pending" },
  ],
  children
}: AnalyzingStepProps) {
  return (
    <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center px-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">{title}</h1>
          <p className="text-sm text-zinc-500 font-medium">{description}</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#09090b] overflow-hidden">
          <div className="p-6 space-y-4">
            {tasks.map((task, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  {task.status === 'completed' ? (
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-emerald-500 stroke-[3px]" />
                    </div>
                  ) : task.status === 'running' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-zinc-800" />
                  )}
                  <span className={cn(
                    "text-sm font-bold transition-colors",
                    task.status === 'completed' ? "text-zinc-400" : "text-white",
                    task.status === 'pending' && "text-zinc-600"
                  )}>
                    {task.label}
                  </span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-700 group-hover:text-zinc-500 transition-colors">
                  {task.status}
                </div>
              </div>
            ))}
          </div>
          
          {/* Progress bar */}
          <div className="h-1 w-full bg-zinc-900">
             <div 
              className="h-full bg-primary transition-all duration-1000 ease-in-out" 
              style={{ width: `${(tasks.filter(t => t.status === 'completed').length / tasks.length) * 100}%` }} 
             />
          </div>
        </div>

        {children && (
          <div className="flex justify-center pt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
