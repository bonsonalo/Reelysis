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
}

const inputClassName =
  'w-full h-10 rounded-[10px] bg-surface-input border border-border-subtle px-4 text-sm text-white placeholder:text-text-tertiary transition-[border-color,box-shadow] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11'

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
}: AuthFieldProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      <label htmlFor={id} className="block text-xs font-medium text-text-label md:text-sm">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={inputClassName}
      />
    </div>
  )
}
