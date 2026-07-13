import type { JobSource, WorkMode } from '@prisma/client';

/** A job as returned by a source adapter, before it's stored. */
export interface RawJob {
  source: JobSource;
  externalId: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  salaryText: string | null;
  descriptionRaw: string;
  postedAt: Date | null;
  workMode: WorkMode;
}

export interface FetchOptions {
  query: string;
  limit: number;
}

/** A pluggable job source (Remotive, RemoteOK, …). */
export interface JobSourceAdapter {
  key: JobSource;
  label: string;
  fetch(opts: FetchOptions): Promise<RawJob[]>;
}
