import { generateJson, type ChatMessage } from './ai';

/** Structured JD extraction the analyzer asks the model to return. */
export interface JdExtraction {
  requiredSkills: string[];
  niceToHaveSkills: string[];
  atsKeywords: string[];
  summary: string;
}

function buildPrompt(title: string, description: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are an expert technical recruiter and ATS (Applicant Tracking System) analyst. ' +
        'Extract structured data from job descriptions. Respond with ONLY a JSON object, no prose.',
    },
    {
      role: 'user',
      content: `Analyze this job posting and return JSON with exactly these fields:
{
  "requiredSkills": string[],   // hard requirements (technologies, tools, must-have skills)
  "niceToHaveSkills": string[], // "good to have" / preferred
  "atsKeywords": string[],      // keywords an ATS would scan for (skills + role terms)
  "summary": string             // 1-2 sentence summary of the role
}

Title: ${title || '(not provided)'}

Description:
"""
${description}
"""`,
    },
  ];
}

/** Extract ATS keywords from a job description via the AI provider. */
export async function analyzeJobDescription(
  title: string,
  description: string,
): Promise<{ data: JdExtraction; model: string }> {
  const { data, model } = await generateJson<JdExtraction>(buildPrompt(title, description), {
    temperature: 0.2,
  });
  return {
    model,
    data: {
      requiredSkills: normalize(data.requiredSkills),
      niceToHaveSkills: normalize(data.niceToHaveSkills),
      atsKeywords: normalize(data.atsKeywords),
      summary: data.summary ?? '',
    },
  };
}

function normalize(list: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list ?? []) {
    const s = String(raw).trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
