import type { JobSourceAdapter } from '../types.js';
import { remoteOkSource } from './remoteok.js';
import { remotiveSource } from './remotive.js';

/** All free, no-key sources, keyed by a short id used in the API. */
export const sources: Record<string, JobSourceAdapter> = {
  remotive: remotiveSource,
  remoteok: remoteOkSource,
};

export const defaultSourceKeys = Object.keys(sources);
