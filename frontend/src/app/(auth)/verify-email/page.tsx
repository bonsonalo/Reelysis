import { Suspense } from 'react'
import VerifyEmailStatus from '@/features/auth/components/VerifyEmailStatus'

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailStatus />
    </Suspense>
  )
}
