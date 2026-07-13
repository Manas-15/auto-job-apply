import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { launchContext, saveSession } from '../src/browser/session.js';

/**
 * Interactive, one-time Naukri login. Opens a real browser window; YOU
 * sign in (and solve any CAPTCHA/OTP) yourself. Your password is never
 * read by this program or stored anywhere — only the resulting session
 * cookies are saved locally to browser-sessions/naukri.json (gitignored).
 *
 * Run: npm run naukri:login --workspace @aja/api
 */
async function main() {
  const { context, close } = await launchContext({ site: 'naukri', headed: true });
  const page = await context.newPage();

  await page.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'domcontentloaded' });

  // eslint-disable-next-line no-console
  console.log(`
────────────────────────────────────────────────────────────
  Naukri login
────────────────────────────────────────────────────────────
  A browser window has opened. In THAT window:
    1. Log in to Naukri with your own credentials.
    2. Complete any CAPTCHA / OTP if prompted.
    3. Wait until you see your logged-in Naukri homepage.

  Your password is typed only into Naukri's own page — this
  program never sees it. Only session cookies get saved.

  When you're fully logged in, come back here and press Enter.
────────────────────────────────────────────────────────────
`);

  const rl = createInterface({ input: stdin, output: stdout });
  await rl.question('Press Enter once you are logged in… ');
  rl.close();

  const saved = await saveSession(context, 'naukri');
  await close();

  // eslint-disable-next-line no-console
  console.log(`\n✅ Session saved to ${saved}`);
  // eslint-disable-next-line no-console
  console.log('You can now run the Naukri scraper. Re-run this login if the session expires.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Login failed:', err);
  process.exit(1);
});
