'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme, type ThemePreference } from '@/lib/theme'

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

/** Three-way theme switch. `compact` shows icons only (labels stay for screen readers). */
export function ThemeToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn('inline-flex rounded-lg bg-surface-hover p-0.5', className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(value)}
            title={label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md text-[13px] transition-colors duration-150',
              compact ? 'h-7 w-8 justify-center' : 'h-7 px-2.5',
              selected
                ? 'bg-surface-card font-medium text-foreground shadow-raised'
                : 'text-text-tertiary hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className={compact ? 'sr-only' : undefined}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
