import Link from 'next/link'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  href?: string
  onClick?: () => void
}

const sizeClasses = {
  sm: { text: 'text-[15px]', mark: 'h-5 w-5' },
  md: { text: 'text-base', mark: 'h-[22px] w-[22px]' },
  lg: { text: 'text-lg', mark: 'h-6 w-6' },
}

/** A Reel frame with its opening seconds marked: the part Reelysis scores. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#ea580c" />
      <rect x="7.5" y="4.5" width="9" height="15" rx="2" fill="none" stroke="#fff" strokeWidth="1.75" />
      <rect x="9.5" y="7" width="5" height="2.25" rx="0.75" fill="#fff" />
    </svg>
  )
}

export function BrandLogo({
  className,
  size = 'md',
  href = '/dashboard',
  onClick,
}: BrandLogoProps) {
  const mark = (
    <span className={cn('inline-flex items-center gap-2', className)} translate="no">
      <BrandMark className={sizeClasses[size].mark} />
      <span
        className={cn(
          'font-semibold tracking-[-0.02em] text-foreground',
          sizeClasses[size].text,
        )}
      >
        Reelysis
      </span>
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-label="Reelysis home"
        className="inline-flex shrink-0 rounded-md"
      >
        {mark}
      </Link>
    )
  }

  return mark
}
