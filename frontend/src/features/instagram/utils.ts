import type { InstagramAccount } from './api'

/** Single definition of "finished onboarding", shared by landing, login and register redirects. */
export function isOnboarded(account: InstagramAccount | null | undefined): boolean {
  return Boolean(account?.niche_confirmed && account?.last_synced_at)
}

export function postAuthDestination(accounts: InstagramAccount[] | null | undefined): string {
  return isOnboarded(accounts?.[0]) ? '/dashboard' : '/onboarding'
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Instagram access was declined. Connect again and approve the requested permissions.',
  invalid_state: 'That connection link expired. Please start the connection again.',
  connect_failed:
    'We could not finish connecting your Instagram account. Make sure it is a Business or Creator account and try again.',
}

export function getOAuthErrorMessage(code: string | null): string | null {
  if (!code) return null
  return OAUTH_ERROR_MESSAGES[code] ?? OAUTH_ERROR_MESSAGES.connect_failed
}
