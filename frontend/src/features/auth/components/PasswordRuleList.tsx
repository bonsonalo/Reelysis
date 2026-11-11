import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PASSWORD_RULES } from '../utils/passwordRules'

export function PasswordRuleList({ value, className }: { value: string; className?: string }) {
  return (
    <ul className={cn('space-y-1.5 text-xs', className)}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value)
        return (
          <li
            key={rule.label}
            className={cn(
              'flex items-center gap-2 transition-colors duration-150',
              met ? 'text-emerald-400' : 'text-text-tertiary',
            )}
          >
            <Check className={cn('h-3.5 w-3.5 shrink-0', !met && 'opacity-30')} />
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
