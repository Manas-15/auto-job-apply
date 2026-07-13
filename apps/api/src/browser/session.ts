import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { type Browser, type BrowserContext, chromium } from 'playwright';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Where persisted login sessions live. Gitignored (see .gitignore →
 * browser-sessions/). We store Playwright storageState (cookies +
 * localStorage) here — never raw passwords.
 */
const SESSIONS_DIR = path.resolve(process.cwd(), 'browser-sessions');

export function sessionPath(site: string): string {
  return path.join(SESSIONS_DIR, `${site}.json`);
}

export function hasSession(site: string): boolean {
  return existsSync(sessionPath(site));
}

interface LaunchOptions {
  /** Which saved session to load, e.g. "naukri". */
  site: string;
  /** Force a visible browser regardless of env (used for interactive login). */
  headed?: boolean;
}

export interface LaunchedContext {
  browser: Browser;
  context: BrowserContext;
  close: () => Promise<void>;
}

/**
 * Launch a Chromium context, restoring a saved login session for `site`
 * if one exists. The caller owns the returned context and must call
 * `close()`.
 */
export async function launchContext({ site, headed }: LaunchOptions): Promise<LaunchedContext> {
  await mkdir(SESSIONS_DIR, { recursive: true });

  const headless = headed ? false : env.PLAYWRIGHT_HEADLESS;
  const storagePath = sessionPath(site);
  const hasSaved = existsSync(storagePath);

  logger.info(
    { site, headless, session: hasSaved ? 'loaded' : 'none' },
    'Launching browser context',
  );

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    ...(hasSaved ? { storageState: storagePath } : {}),
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
    locale: 'en-IN',
  });

  return {
    browser,
    context,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

/** Persist the current context's cookies/localStorage to the session file. */
export async function saveSession(context: BrowserContext, site: string): Promise<string> {
  await mkdir(SESSIONS_DIR, { recursive: true });
  const p = sessionPath(site);
  await context.storageState({ path: p });
  return p;
}
