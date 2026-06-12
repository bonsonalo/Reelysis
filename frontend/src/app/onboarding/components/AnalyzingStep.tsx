'use client'

import { Loader2 } from 'lucide-react'

interface AnalyzingStepProps {
  title?: string
  description?: string
  children?: React.ReactNode
}

export function AnalyzingStep({ 
  title = "Analyzing your content...", 
  description = "We're reviewing your Reels and biography to build your custom strategy.",
  children
}: AnalyzingStepProps) {
  return (
    <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center px-4 text-center animate-in fade-in duration-700">
      <div className="mb-8 relative h-24 w-24">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-black border-2 border-primary">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
      <h1 className="mb-2 text-3xl font-bold text-white">{title}</h1>
      <p className="max-w-xs text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  )
}
