/**
 * Minimal HTML → plain text. Source APIs/feeds return HTML descriptions
 * (sometimes entity-encoded, e.g. RSS); the analyzer and ATS scorer work
 * better on clean text. Entities are decoded first so this handles both
 * real HTML (<p>) and encoded HTML (&lt;p&gt;). No external deps.
 */
export function htmlToText(input: string): string {
  return decodeEntities(input)
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\s*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&'); // decode ampersand last
}
