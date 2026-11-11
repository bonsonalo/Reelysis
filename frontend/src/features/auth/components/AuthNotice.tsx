import { cn } from '@/lib/utils'

export function AuthNotice({
  tone,
  children,
}: {
  tone: 'success' | 'error'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-[10px] border px-4 py-3 text-sm leading-relaxed',
        tone === 'success'
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400/90'
          : 'border-red-500/20 bg-red-500/10 text-red-400',
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}
