import { useMutation } from '@tanstack/react-query'
import { startInstagramOAuth } from '../api'

/** Starts Meta OAuth and leaves the page; used for first connect and for reconnecting. */
export const useStartInstagramOAuth = () => {
  return useMutation({
    mutationFn: startInstagramOAuth,
    onSuccess: (oauthUrl) => {
      if (oauthUrl) window.location.href = oauthUrl
    },
  })
}
