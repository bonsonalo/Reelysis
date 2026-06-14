'use client'

import { ArrowRight, Loader2 } from 'lucide-react'

interface ConnectStepProps {
  onConnect: () => void
  isConnecting: boolean
}

export function ConnectStep({ onConnect, isConnecting }: ConnectStepProps) {
  return (
    <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center px-4 text-center animate-in fade-in zoom-in duration-500">
      <h1 className="mb-6 max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl lg:text-8xl">
        Know exactly what <br />
        to post <span className="text-primary italic">next.</span>
      </h1>
      
      <p className="mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
        Connect your account to discover your content pillars, analyze competitors, 
        and generate a high-performing growth roadmap in minutes.
      </p>

      <div 
        onClick={onConnect}
        className="flex flex-col items-center gap-4 cursor-pointer group"
      >
        {isConnecting ? (
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary group-hover:text-primary/80 transition-colors">
              Start by connecting your account above
            </p>
            <ArrowRight className="h-6 w-6 text-primary group-hover:text-primary/80 transition-colors" />
          </>
        )}
      </div>
    </div>
  )
}
