import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  IAIService,
  CandidateSummary,
  SkillMatchResult,
  ProjectFacts,
} from './IAIService';
import { AppError } from '../../errors/AppError';

const GEMINI_MODEL = 'gemini-1.5-flash';

export class GeminiAIService implements IAIService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Gemini API key is not configured.');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateSkillMatch(
    requirement: string,
    candidates: CandidateSummary[],
  ): Promise<SkillMatchResult[]> {
    if (candidates.length === 0) return [];

    const prompt = this.buildSkillMatchPrompt(requirement, candidates);
    const responseText = await this.callGemini(prompt);
    return this.parseSkillMatchResponse(responseText, candidates);
  }

  async generateRiskSummary(facts: ProjectFacts): Promise<string> {
    const prompt = this.buildRiskSummaryPrompt(facts);
    return this.callGemini(prompt);
  }

  private async callGemini(prompt: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      throw AppError.badRequest(`AI service error: ${String(error)}`);
    }
  }

  private buildSkillMatchPrompt(requirement: string, candidates: CandidateSummary[]): string {
    const candidateText = candidates
      .map(
        (c) =>
          `Name: ${c.name}, Available: ${c.availablePercent}%, Skills: ${c.skills.join(', ')}, Recent work: ${c.recentActivityTags.join(', ')}`,
      )
      .join('\n');

    return `You are a resource manager assistant. Given the following requirement and candidates, return a JSON array of the best matches in order.

Requirement: ${requirement}

Candidates:
${candidateText}

Return a JSON array only (no markdown) like:
[{"name":"Candidate Name","reason":"Brief plain-English reason","suggestedUtilisationPercent":50}]`;
  }

  private buildRiskSummaryPrompt(facts: ProjectFacts): string {
    const milestoneText = facts.milestones
      .map((m) => `- ${m.title}: due ${m.dueDate.toDateString()}, status ${m.status}${m.isOverdue ? ' (OVERDUE)' : ''}`)
      .join('\n');

    const hoursText = facts.recentHoursSummary
      .map((h) => `- ${h.employeeName}: logged ${h.loggedHours} hrs (expected ${h.expectedHours} hrs)`)
      .join('\n');

    return `You are a project manager assistant. Write a brief, plain-English risk summary paragraph for this project.

Project: ${facts.projectName}

Milestones:
${milestoneText}

Recent hours logged vs expected:
${hoursText}

Write 2–4 sentences. Focus on the biggest risks. Be direct and actionable. No bullet points.`;
  }

  private parseSkillMatchResponse(responseText: string, candidates: CandidateSummary[]): SkillMatchResult[] {
    try {
      const parsed = JSON.parse(responseText) as Array<{
        name: string;
        reason: string;
        suggestedUtilisationPercent?: number;
      }>;
      return parsed.map((item, index) => ({
        employeeId: index, // Actual ID resolved by the calling service from name lookup
        name: item.name,
        reason: item.reason,
        suggestedUtilisationPercent: item.suggestedUtilisationPercent,
      }));
    } catch {
      // If AI returns non-JSON, treat entire response as a single suggestion
      return candidates.slice(0, 3).map((c) => ({
        employeeId: 0,
        name: c.name,
        reason: responseText.slice(0, 200),
      }));
    }
  }
}
