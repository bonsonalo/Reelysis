'use client'

import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MetricHelpContent } from '@/features/dashboard/constants/metricHelp'

type MetricInfoTipProps = {
  content: MetricHelpContent
  side?: 'top' | 'bottom'
  className?: string
}

export function MetricInfoTip({ content, side = 'bottom', className }: MetricInfoTipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPosition({
      top: side === 'top' ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
    })
  }, [side])

  const show = () => {
    updatePosition()
    setVisible(true)
  }

  const hide = () => setVisible(false)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={cn(
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors duration-150 hover:bg-white/[0.08] hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
          className,
        )}
        aria-label={`About ${content.title}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              transform:
                side === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
              zIndex: 9999,
            }}
            className="pointer-events-none w-56 rounded-md border border-white/10 bg-zinc-900 px-3 py-2.5 text-xs leading-relaxed text-zinc-300 shadow-xl"
          >
            <span className="mb-1 block text-xs font-semibold text-white">
              {content.title}
            </span>
            {content.body}
          </span>,
          document.body,
        )}
    </>
  )
}

export function MetricLabel({
  label,
  help,
  className,
  tipSide = 'bottom',
}: {
  label: string
  help?: MetricHelpContent
  className?: string
  tipSide?: 'top' | 'bottom'
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span>{label}</span>
      {help && <MetricInfoTip content={help} side={tipSide} />}
    </span>
  )
}
