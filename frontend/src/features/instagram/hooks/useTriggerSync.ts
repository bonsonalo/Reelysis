import { useMutation } from '@tanstack/react-query'
import { triggerInstagramSync } from '../api'

export const useTriggerSync = () => {
  return useMutation({
    mutationFn: triggerInstagramSync,
  })
}
