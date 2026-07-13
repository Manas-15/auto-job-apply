export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface JobAnalysis {
  id: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  atsKeywords: string[];
  responsibilities: string[];
  minYears: number | null;
  maxYears: number | null;
  seniority: string | null;
  extractedLocation: string | null;
  extractedSalary: string | null;
  summary: string | null;
  model: string | null;
}

export interface Company {
  id: string;
  name: string;
}

export interface AtsScore {
  id: string;
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  notes: string | null;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  source: string;
  url: string | null;
  location: string | null;
  salaryText: string | null;
  descriptionRaw: string | null;
  scrapedAt: string;
  company: Company | null;
  analysis: JobAnalysis | null;
  atsScores?: AtsScore[];
}

export interface AtsPreview {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  notes: string;
}

export interface DiscoverResult {
  query: string;
  fetched: number;
  created: number;
  updated: number;
  perSource: { source: string; fetched: number; error?: string }[];
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ status: string; db: string; aiProvider: string }>('/health'),
  listJobs: () => req<Job[]>('/api/jobs'),
  getJob: (id: string) => req<Job>(`/api/jobs/${id}`),
  createJob: (data: {
    title: string;
    descriptionRaw: string;
    companyName?: string;
    location?: string;
    salaryText?: string;
    url?: string;
  }) => req<Job>('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),
  analyzeJob: (id: string) =>
    req<JobAnalysis>(`/api/jobs/${id}/analyze`, { method: 'POST' }),
  discoverJobs: (data: { query?: string; limit?: number }) =>
    req<DiscoverResult>('/api/jobs/discover', { method: 'POST', body: JSON.stringify(data) }),
  scoreResume: (resumeId: string, jobId: string) =>
    req<AtsScore>('/api/ats/score', {
      method: 'POST',
      body: JSON.stringify({ resumeId, jobId }),
    }),
  previewAts: (data: {
    resumeText: string;
    required: string[];
    niceToHave: string[];
    ats: string[];
  }) => req<AtsPreview>('/api/ats/preview', { method: 'POST', body: JSON.stringify(data) }),
};
