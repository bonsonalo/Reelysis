import { api } from '@/lib/axios';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  recommedation_type: string;
  priority: number;
  evidence: string;
  status: string;
}

export interface AccountReport {
  id: string;
  title: string;
  summary: string;
  report_markdown: string;
  created_at: string;
}

export const getLatestReport = () => {
  return api.get<AccountReport>('/api/v1/analysis/report/latest');
};

export const getRoadmap = () => {
  return api.get<Recommendation[]>('/api/v1/analysis/report/roadmap');
};

export const updateRecommendationStatus = (id: string) => {
  return api.patch<{ id: string; status: string }>(`/api/v1/analysis/report/roadmap/${id}`);
};
