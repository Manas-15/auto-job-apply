import type { ChatMessage } from '../../ai/index.js';

/** Shape the analyzer asks the model to return. */
export interface JdExtraction {
  requiredSkills: string[];
  niceToHaveSkills: string[];
  atsKeywords: string[];
  responsibilities: string[];
  minYears: number | null;
  maxYears: number | null;
  seniority: string | null;
  extractedLocation: string | null;
  extractedSalary: string | null;
  summary: string;
}

export function buildAnalyzePrompt(title: string, description: string): ChatMessage[] {
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
  "requiredSkills": string[],        // hard requirements (technologies, tools)
  "niceToHaveSkills": string[],      // "good to have" / preferred
  "atsKeywords": string[],           // keywords an ATS would scan for (skills + role terms)
  "responsibilities": string[],      // key responsibilities, concise
  "minYears": number | null,         // minimum years of experience
  "maxYears": number | null,
  "seniority": string | null,        // e.g. "Junior", "Mid", "Senior", "Lead"
  "extractedLocation": string | null,
  "extractedSalary": string | null,
  "summary": string                  // 1-2 sentence summary of the role
}

Title: ${title}

Description:
"""
${description}
"""`,
    },
  ];
}
