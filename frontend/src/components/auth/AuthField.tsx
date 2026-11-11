'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type AuthFieldProps = {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  autoComplete?: string
  required?: boolean
  className?: string
  /** Rendered at the right end of the label row, e.g. a "Forgot password?" link. */
  labelAction?: React.ReactNode
}

/** Shared text input style: white field, hairline border, brand focus halo. */
export const inputClassName =
  'h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-foreground shadow-raised transition-[border-color,box-shadow] duration-150 placeholder:text-text-placeholder hover:border-border-strong focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-70'

export function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  disabled,
  placeholder,
  autoComplete,
  required,
  className,
  labelAction,
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block text-[13px] font-medium text-text-label">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={isPassword && revealed ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          spellCheck={type === 'email' || isPassword ? false : undefined}
          className={cn(inputClassName, isPassword && 'pr-10')}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            disabled={disabled}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-text-tertiary transition-colors duration-150 hover:text-foreground"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  )
}
