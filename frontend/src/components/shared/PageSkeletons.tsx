import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-white/[0.06]', className)}
      aria-hidden
    />
  )
}

export function PageHeaderSkeleton({
  lines = 2,
  action,
}: {
  lines?: 1 | 2 | 3
  action?: boolean
}) {
  return (
    <div className="border-b border-border-subtle pb-6 md:pb-8">
      <div
        className={cn(
          'flex flex-col gap-4',
          action && 'md:flex-row md:items-end md:justify-between md:gap-6',
        )}
      >
        <div className="min-w-0 max-w-2xl space-y-3">
          <Skeleton className="h-7 w-40 md:h-8 md:w-48" />
          {lines >= 2 && <Skeleton className="h-4 w-full max-w-xl" />}
          {lines >= 3 && <Skeleton className="h-4 w-32" />}
        </div>
        {action && <Skeleton className="h-11 w-full rounded-lg md:w-40" />}
      </div>
    </div>
  )
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6 pb-16 sm:space-y-8 sm:pb-20">
      <PageHeaderSkeleton lines={2} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <Skeleton className="h-11 w-full rounded-[10px] lg:h-[148px] lg:w-52" />
        <div className="min-w-0 flex-1 lg:max-w-2xl">
          <Skeleton className="h-[360px] w-full rounded-[10px] sm:h-[420px]" />
        </div>
      </div>
    </div>
  )
}

export function ReportsPageSkeleton() {
  return (
    <div className="space-y-6 pb-16 md:space-y-8 md:pb-20">
      <PageHeaderSkeleton lines={3} action />
      <div className="space-y-4 md:space-y-6">
        <Skeleton className="h-36 w-full rounded-[10px] md:h-44" />
        <Skeleton className="h-24 w-full rounded-[10px]" />
        <Skeleton className="h-24 w-full rounded-[10px]" />
      </div>
    </div>
  )
}

export function ReportDetailPageSkeleton() {
  return (
    <div className="space-y-6 pb-16 md:space-y-8 md:pb-20">
      <div className="border-b border-border-subtle pb-6 md:pb-8">
        <Skeleton className="mb-5 h-4 w-24" />
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 max-w-3xl space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-3/4 max-w-lg" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg lg:w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:gap-8 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-64 w-full rounded-[10px] md:h-80" />
        </div>
        <div className="space-y-4 xl:col-span-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-72 w-full rounded-[10px] md:h-96" />
        </div>
      </div>
    </div>
  )
}

export function VideosPageSkeleton() {
  return (
    <div className="space-y-6 pb-16 sm:space-y-8 sm:pb-20">
      <PageHeaderSkeleton lines={3} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[9/16] w-full rounded-[10px]" />
        ))}
      </div>
    </div>
  )
}

export function CompetitorsPageSkeleton() {
  return (
    <div className="space-y-6 pb-16 sm:space-y-8 sm:pb-20">
      <PageHeaderSkeleton lines={3} />
      <Skeleton className="h-36 w-full rounded-[10px] sm:h-40" />
      <Skeleton className="h-64 w-full rounded-[10px] sm:h-80" />
    </div>
  )
}

export function OnboardingPageSkeleton() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        <Skeleton className="mx-auto h-8 w-56" />
        <Skeleton className="mx-auto h-4 w-full max-w-sm" />
        <Skeleton className="mx-auto h-12 w-44 rounded-lg" />
      </div>
    </div>
  )
}
