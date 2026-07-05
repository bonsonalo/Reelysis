import { PageEmptyState } from '@/components/shared/PageEmptyState'

export function ReportsEmptyState() {
  return (
    <PageEmptyState
      primary="No reports yet. Generate one above when you're ready."
      secondary="The first run may take a few minutes."
    />
  )
}
