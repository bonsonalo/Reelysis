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
  status: string;
  report_markdown: string;
  report_json?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  recommendations?: Recommendation[];
}

export interface ReportListItem {
  id: string;
  title: string;
  status: string;
  summary: string;
  created_at: string;
}

export const getReports = () => {
  return api.get<ReportListItem[]>('/api/v1/reports/');
};

export const getReport = (id: string) => {
  return api.get<AccountReport>(`/api/v1/reports/${id}`);
};

export const generateReport = () => {
  return api.post<{ message: string; job_id: string }>('/api/v1/reports/generate');
};

export const updateRecommendationStatus = (id: string) => {
  return api.patch<{ id: string; status: string }>(`/api/v1/analysis/report/roadmap/${id}`);
};
