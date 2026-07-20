// Typed client for the app's own Next.js API routes. Same-origin, so
// requests are relative and the auth cookie rides along automatically.

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export interface Resume {
  id: string;
  label: string;
  content: string;
  isTailored: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Gap {
  keyword: string;
  note: string;
}

export interface Analysis {
  id: string;
  resumeId: string | null;
  jobTitle: string | null;
  jobText: string;
  resumeText: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  atsKeywords: string[];
  jdSummary: string | null;
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  notes: string | null;
  rewrittenText: string | null;
  changesSummary: string[];
  addedKeywords: string[];
  gaps: Gap[];
  atsScoreAfter: number | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AnalysisSummary = Pick<
  Analysis,
  'id' | 'jobTitle' | 'jdSummary' | 'atsScore' | 'atsScoreAfter' | 'rewrittenText' | 'createdAt'
>;

/** Error thrown by the API client, carrying the HTTP status and stable code. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the failure is an AI provider quota/limit being exhausted. */
  get isQuota(): boolean {
    return this.code === 'AI_QUOTA_EXCEEDED';
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { message?: string; code?: string };
      if (body.message) message = body.message;
      code = body.code;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, code);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // auth
  register: (data: { email: string; password: string; name?: string }) =>
    req<SessionUser>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    req<SessionUser>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => req<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  // résumés
  listResumes: () => req<Resume[]>('/api/resumes'),
  createResume: (data: { label: string; content: string }) =>
    req<Resume>('/api/resumes', { method: 'POST', body: JSON.stringify(data) }),
  deleteResume: (id: string) => req<{ ok: true }>(`/api/resumes/${id}`, { method: 'DELETE' }),

  // analysis + rewrite
  analyze: (data: { resumeText: string; jobText: string; jobTitle?: string; resumeId?: string }) =>
    req<Analysis>('/api/analyze', { method: 'POST', body: JSON.stringify(data) }),
  rewrite: (analysisId: string) =>
    req<Analysis>('/api/rewrite', { method: 'POST', body: JSON.stringify({ analysisId }) }),

  // history
  listAnalyses: () => req<AnalysisSummary[]>('/api/analyses'),
  getAnalysis: (id: string) => req<Analysis>(`/api/analyses/${id}`),
  deleteAnalysis: (id: string) => req<{ ok: true }>(`/api/analyses/${id}`, { method: 'DELETE' }),
};
