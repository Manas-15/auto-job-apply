import { generateJson, type ChatMessage } from './ai';

/** Structured result the rewriter asks the model to return. */
export interface RewriteResult {
  /** The full rewritten résumé as clean plain text, ready to use. */
  rewrittenResume: string;
  /** Short bullet notes on what was changed and why. */
  changesSummary: string[];
  /** ATS keywords genuinely supported by the résumé that were surfaced. */
  addedKeywords: string[];
  /** JD requirements the résumé does NOT support — reported, never fabricated. */
  gaps: { keyword: string; note: string }[];
}

export interface JdContext {
  title: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  atsKeywords: string[];
}

function buildPrompt(resume: string, jd: JdContext): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are an expert résumé writer and ATS (Applicant Tracking System) optimizer.',
        "You tailor a candidate's résumé to a specific job so it scores well in ATS keyword screening.",
        '',
        'HARD RULES — never break these:',
        '- Use ONLY skills, tools, and experience that are present in the original résumé.',
        '- Never invent, exaggerate, or add skills the candidate does not demonstrably have.',
        '- You may rephrase, reorder, and surface existing experience using the exact ATS keyword',
        '  wording from the job (e.g. write "REST APIs" if the résumé says "RESTful services"),',
        '  but only when the underlying experience genuinely supports it.',
        '- If the job requires something the résumé does not support, put it in "gaps".',
        '  Do NOT add it to the résumé.',
        '',
        'Respond with ONLY a JSON object, no prose.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Tailor my résumé for this job and return JSON with exactly these fields:
{
  "rewrittenResume": string,       // full tailored résumé as clean plain text
  "changesSummary": string[],      // what you changed and why (concise bullets)
  "addedKeywords": string[],       // ATS keywords you surfaced that my experience genuinely supports
  "gaps": [{ "keyword": string, "note": string }]  // required things my résumé does NOT support
}

TARGET JOB
Title: ${jd.title || '(not provided)'}
Required skills: ${jd.requiredSkills.join(', ') || '—'}
Nice to have: ${jd.niceToHaveSkills.join(', ') || '—'}
ATS keywords: ${jd.atsKeywords.join(', ') || '—'}

MY RÉSUMÉ
"""
${resume}
"""`,
    },
  ];
}

export async function rewriteResume(
  resume: string,
  jd: JdContext,
): Promise<{ data: RewriteResult; model: string }> {
  return generateJson<RewriteResult>(buildPrompt(resume, jd), {
    temperature: 0.3,
    // Room for the full rewritten résumé plus the model's thinking budget.
    maxTokens: 8192,
  });
}
