import type { HTMLAttributes, ReactNode } from 'react'
import { Panel } from '@/components/shared/Panel'
import { cn } from '@/lib/utils'

export function SettingsPanelHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="border-b border-border-subtle px-4 py-4 sm:px-6">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
      ) : null}
    </div>
  )
}

export function SettingsSectionHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-4 sm:mb-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
      ) : null}
    </div>
  )
}

export function SettingsRow({
  label,
  description,
  children,
  className,
}: {
  label: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-1 py-4 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start sm:gap-x-8',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0 text-sm text-text-label">{children}</div>
    </div>
  )
}

export function SettingsComingSoon() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-white/[0.04] px-2 py-0.5 text-xs text-text-tertiary">
      Coming soon
    </span>
  )
}

export function SettingsField({
  id,
  label,
  description,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-white">
        {label}
      </label>
      {description ? (
        <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
      ) : null}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-[10px] border border-border-subtle bg-surface-input px-4 text-sm text-white placeholder:text-text-tertiary transition-[border-color,box-shadow] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11"
      />
    </div>
  )
}

export function SettingsNotice({
  tone,
  children,
}: {
  tone: 'success' | 'error'
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-[10px] border px-3 py-2.5 text-sm leading-relaxed sm:px-4',
        tone === 'success'
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400/90'
          : 'border-red-500/20 bg-red-500/5 text-red-400',
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}

export function SettingsActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {children}
    </div>
  )
}

export function SettingsSection({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <Panel className={cn('overflow-hidden', className)} {...props}>
      {children}
    </Panel>
  )
}

export function getUserInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.trim().slice(0, 2).toUpperCase()
  }
  return (email?.[0] ?? 'U').toUpperCase()
}

export function getDisplayName(name?: string | null, email?: string | null) {
  if (name?.trim()) return name.trim()
  if (email) return email.split('@')[0]
  return 'Account'
}
