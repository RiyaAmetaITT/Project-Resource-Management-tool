import Groq from 'groq-sdk';
import {
  IAIService,
  CandidateSummary,
  SkillMatchResult,
  ProjectFacts,
} from './IAIService';
import { AppError } from '../../errors/AppError';

const GROQ_MODEL = 'llama3-8b-8192';

export class GroqAIService implements IAIService {
  private readonly groq: Groq;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Groq API key is not configured.');
    this.groq = new Groq({ apiKey });
  }

  async generateSkillMatch(
    requirement: string,
    candidates: CandidateSummary[],
  ): Promise<SkillMatchResult[]> {
    if (candidates.length === 0) return [];

    const prompt = this.buildSkillMatchPrompt(requirement, candidates);
    const responseText = await this.callGroq(prompt);
    return this.parseSkillMatchResponse(responseText, candidates);
  }

  async generateRiskSummary(facts: ProjectFacts): Promise<string> {
    const prompt = this.buildRiskSummaryPrompt(facts);
    return this.callGroq(prompt);
  }

  private async callGroq(prompt: string): Promise<string> {
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: GROQ_MODEL,
      });
      return completion.choices[0]?.message?.content ?? '';
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

    return `You are a resource manager assistant. Return a JSON array of the best matches for this requirement.

Requirement: ${requirement}

Candidates:
${candidateText}

Return JSON array only (no markdown):
[{"name":"Name","reason":"Reason","suggestedUtilisationPercent":50}]`;
  }

  private buildRiskSummaryPrompt(facts: ProjectFacts): string {
    const milestoneText = facts.milestones
      .map((m) => `- ${m.title}: due ${m.dueDate.toDateString()}, ${m.status}${m.isOverdue ? ' OVERDUE' : ''}`)
      .join('\n');

    const hoursText = facts.recentHoursSummary
      .map((h) => `- ${h.employeeName}: ${h.loggedHours} hrs logged vs ${h.expectedHours} expected`)
      .join('\n');

    return `Write a 2-4 sentence plain-English risk summary for this project. Be direct and actionable.

Project: ${facts.projectName}
Milestones:\n${milestoneText}
Hours:\n${hoursText}`;
  }

  private parseSkillMatchResponse(responseText: string, candidates: CandidateSummary[]): SkillMatchResult[] {
    try {
      const parsed = JSON.parse(responseText) as Array<{
        name: string;
        reason: string;
        suggestedUtilisationPercent?: number;
      }>;
      return parsed.map((item, index) => ({
        employeeId: index,
        name: item.name,
        reason: item.reason,
        suggestedUtilisationPercent: item.suggestedUtilisationPercent,
      }));
    } catch {
      return candidates.slice(0, 3).map((c) => ({
        employeeId: 0,
        name: c.name,
        reason: 'AI response could not be parsed.',
      }));
    }
  }
}
