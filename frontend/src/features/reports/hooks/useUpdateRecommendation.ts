import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRecommendationStatus } from '../api';

export const useUpdateRecommendation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => updateRecommendationStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
    },
  });
};
