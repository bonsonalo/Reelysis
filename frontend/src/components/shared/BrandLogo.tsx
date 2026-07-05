import Link from 'next/link'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  href?: string
  onClick?: () => void
}

const sizeClasses = {
  sm: 'text-base tracking-tighter',
  md: 'text-lg tracking-tighter',
  lg: 'text-xl tracking-tighter',
}

export function BrandLogo({
  className,
  size = 'md',
  href = '/dashboard',
  onClick,
}: BrandLogoProps) {
  const mark = (
    <span
      className={cn(
        'font-semibold text-white',
        sizeClasses[size],
        className,
      )}
    >
      REEL<span className="text-primary">YSIS</span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-flex shrink-0 rounded-md transition-opacity duration-150 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
        {mark}
      </Link>
    )
  }

  return mark
}
