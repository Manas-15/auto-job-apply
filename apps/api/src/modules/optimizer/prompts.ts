import type { ChatMessage } from '../../ai/index.js';

/** Structured result the optimizer asks the model to return. */
export interface OptimizeResult {
  /** The full tailored résumé as clean plain text, ready to use. */
  tailoredResume: string;
  /** Short bullet notes on what was changed and why. */
  changesSummary: string[];
  /** ATS keywords genuinely supported by the master résumé that were surfaced. */
  addedKeywords: string[];
  /** JD requirements the résumé does NOT support — reported, never fabricated. */
  gaps: { keyword: string; note: string }[];
}

interface JdContext {
  title: string;
  company: string | null;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  atsKeywords: string[];
  responsibilities: string[];
}

export function buildOptimizePrompt(masterResume: string, jd: JdContext): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are an expert résumé writer and ATS (Applicant Tracking System) optimizer.',
        'You tailor a candidate\'s MASTER résumé to a specific job so it scores well in ATS keyword screening.',
        '',
        'HARD RULES — never break these:',
        '- Use ONLY skills, tools, and experience that are present in the master résumé.',
        '- Never invent, exaggerate, or add skills the candidate does not demonstrably have.',
        '- You may rephrase, reorder, and surface existing experience using the exact ATS keyword',
        '  wording from the job (e.g. write "REST APIs" if the résumé says "RESTful services"),',
        '  but only when the underlying experience genuinely supports it.',
        '- If the job requires something the master résumé does not support, put it in "gaps".',
        '  Do NOT add it to the résumé.',
        '',
        'Respond with ONLY a JSON object, no prose.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Tailor my résumé for this job and return JSON with exactly these fields:
{
  "tailoredResume": string,        // full tailored résumé as clean plain text
  "changesSummary": string[],      // what you changed and why (concise bullets)
  "addedKeywords": string[],       // ATS keywords you surfaced that my experience genuinely supports
  "gaps": [{ "keyword": string, "note": string }]  // required things my résumé does NOT support
}

TARGET JOB
Title: ${jd.title}${jd.company ? ` at ${jd.company}` : ''}
Required skills: ${jd.requiredSkills.join(', ') || '—'}
Nice to have: ${jd.niceToHaveSkills.join(', ') || '—'}
ATS keywords: ${jd.atsKeywords.join(', ') || '—'}
Key responsibilities:
${jd.responsibilities.map((r) => `- ${r}`).join('\n') || '—'}

MY MASTER RÉSUMÉ
"""
${masterResume}
"""`,
    },
  ];
}
