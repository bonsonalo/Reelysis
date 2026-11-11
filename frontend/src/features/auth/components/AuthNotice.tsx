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
          ? 'border-success/25 bg-success-tint text-success'
          : 'border-danger/25 bg-danger-tint text-danger',
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}
