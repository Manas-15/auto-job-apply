import type { JobSourceAdapter } from '../types.js';
import { arbeitnowSource } from './arbeitnow.js';
import { jobicySource } from './jobicy.js';
import { remoteOkSource } from './remoteok.js';
import { remotiveSource } from './remotive.js';
import { weWorkRemotelySource } from './weworkremotely.js';

/** All free, no-key sources, keyed by a short id used in the API. */
export const sources: Record<string, JobSourceAdapter> = {
  remotive: remotiveSource,
  remoteok: remoteOkSource,
  arbeitnow: arbeitnowSource,
  jobicy: jobicySource,
  weworkremotely: weWorkRemotelySource,
};

export const defaultSourceKeys = Object.keys(sources);
