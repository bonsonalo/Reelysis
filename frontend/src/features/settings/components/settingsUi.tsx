import type { HTMLAttributes, ReactNode } from 'react'
import { Panel } from '@/components/shared/Panel'
import { cn } from '@/lib/utils'
import { inputClassName } from '@/components/auth/AuthField'

export function SettingsPanelHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="border-b border-border-subtle px-4 py-4 sm:px-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
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
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
        'flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8',
        className,
      )}
    >
      <div className="min-w-0 sm:max-w-md">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0 shrink-0 text-sm text-text-label sm:text-right">{children}</div>
    </div>
  )
}

export function SettingsComingSoon() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-surface-hover px-2 py-0.5 text-xs text-text-tertiary">
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
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  type?: string
  autoComplete?: string
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {description ? (
        <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
      ) : null}
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
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
          ? 'border-green-200 bg-success-tint text-success'
          : 'border-red-200 bg-danger-tint text-danger',
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

/** Irreversible actions, kept apart from the forms above them. */
export function SettingsDangerZone({
  title,
  description,
  children,
}: {
  title: string
  description: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[10px] border border-red-200 bg-surface-card">
      <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</div>
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </section>
  )
}

export const dangerButtonClass =
  'w-full border-red-200 text-danger hover:border-red-300 hover:bg-danger-tint sm:w-auto'

export function getDisplayName(name?: string | null, email?: string | null) {
  if (name?.trim()) return name.trim()
  if (email) return email.split('@')[0]
  return 'Account'
}
