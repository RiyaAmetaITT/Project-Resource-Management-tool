import {
  IAIService,
  CandidateSummary,
  SkillMatchResult,
  ProjectFacts,
  TeamBuildCandidate,
  TeamBuildRoleAssignment,
} from './IAIService';
import { AppError } from '../../errors/AppError';
import { DEFAULT_LLM_MODEL, LLM_FETCH_TIMEOUT_MS } from '../../constants';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface GenerateResponse {
  response?: string;
}

export class GemmaAIService implements IAIService {
  constructor(
    private readonly host: string,
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_LLM_MODEL,
  ) {
    if (!host) throw new Error('LLM host is not configured.');
    if (!apiKey) throw new Error('LLM API key is not configured.');
  }

  async generateSkillMatch(
    requirement: string,
    candidates: CandidateSummary[],
  ): Promise<SkillMatchResult[]> {
    if (candidates.length === 0) return [];

    const prompt = this.buildSkillMatchPrompt(requirement, candidates);
    const responseText = await this.callGemma(prompt);
    return this.parseSkillMatchResponse(responseText, candidates);
  }

  async generateRiskSummary(facts: ProjectFacts): Promise<string> {
    const prompt = this.buildRiskSummaryPrompt(facts);
    return this.callGemma(prompt);
  }

  async generateTeamBuild(
    requirement: string,
    benchCandidates: TeamBuildCandidate[],
  ): Promise<TeamBuildRoleAssignment[]> {
    if (benchCandidates.length === 0) {
      return this.parseTeamBuildResponse('[]', benchCandidates);
    }

    const prompt = this.buildTeamBuildPrompt(requirement, benchCandidates);
    const responseText = await this.callGemma(prompt);
    return this.parseTeamBuildResponse(responseText, benchCandidates);
  }

  private async callGemma(prompt: string): Promise<string> {
    const baseUrl = this.host.replace(/\/$/, '');

    try {
      if (this.isGenerateEndpoint(baseUrl)) {
        return await this.callGenerateEndpoint(baseUrl, prompt);
      }
      return await this.callChatCompletionsEndpoint(baseUrl, prompt);
    } catch (error) {
      throw AppError.badRequest(this.formatCallError(error, baseUrl));
    }
  }

  private isGenerateEndpoint(host: string): boolean {
    return host.toLowerCase().endsWith('/api/generate');
  }

  private async callGenerateEndpoint(url: string, prompt: string): Promise<string> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(LLM_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as GenerateResponse;
    const content = data.response?.trim();
    if (!content) {
      throw new Error('LLM returned an empty response.');
    }
    return content;
  }

  private async callChatCompletionsEndpoint(baseUrl: string, prompt: string): Promise<string> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(LLM_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('LLM returned an empty response.');
    }
    return content;
  }

  private formatCallError(error: unknown, host: string): string {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout =
      message.includes('TimeoutError')
      || message.includes('timed out')
      || message.includes('aborted');
    if (isTimeout) {
      return 'LLM request timed out. The server will use rule-based matching instead.';
    }

    const isConnectionFailure =
      message.includes('fetch failed')
      || message.includes('ECONNREFUSED')
      || message.includes('ENOTFOUND')
      || message.includes('ETIMEDOUT');

    if (isConnectionFailure) {
      return (
        `Cannot reach LLM at ${host}. `
        + 'Check LLM Host in Admin → System Configuration.'
      );
    }

    if (message.includes('401') || message.toLowerCase().includes('api key')) {
      return (
        'LLM rejected the API key (401). '
        + 'Update LLM API Key in Admin → System Configuration with a valid key from your provider.'
      );
    }

    return `AI service error: ${message}`;
  }

  private buildSkillMatchPrompt(requirement: string, candidates: CandidateSummary[]): string {
    const candidateText = candidates
      .map(
        (c) =>
          `Name: ${c.name}, Available: ${c.availablePercent}%, Skills: ${c.skills.join(', ')}, Recent work: ${c.recentActivityTags.join(', ')}`,
      )
      .join('\n');

    return `You are a resource manager assistant. Given the following requirement and employee candidates, return a JSON array of the best matches in order.

Requirement: ${requirement}

Employee candidates (pick names only from this list — do not suggest managers or anyone not listed):
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

    return `You are a project manager assistant. Analyse this project and return a markdown table only (no other text).

Project: ${facts.projectName}

Milestones:
${milestoneText}

Recent hours logged vs expected:
${hoursText}

Return a markdown table with exactly these columns:
| Risk Area | Severity | Detail | Recommended Action |

Rules:
- Include 3–6 rows covering the most important risks from milestones and timesheet data.
- Severity must be one of: High, Medium, Low.
- Keep Detail and Recommended Action concise (one short sentence each).
- Do not wrap the table in code fences.`;
  }

  private parseSkillMatchResponse(responseText: string, candidates: CandidateSummary[]): SkillMatchResult[] {
    const jsonText = this.extractJsonArray(responseText);
    const candidateNames = new Set(candidates.map((c) => c.name));
    try {
      const parsed = JSON.parse(jsonText) as Array<{
        name: string;
        reason: string;
        suggestedUtilisationPercent?: number;
      }>;
      const filtered = parsed.filter((item) => candidateNames.has(item.name));
      if (filtered.length === 0) {
        return candidates.slice(0, 3).map((c) => ({
          employeeId: 0,
          name: c.name,
          reason: 'Top match from available employees based on skills and availability.',
        }));
      }
      return filtered.map((item, index) => ({
        employeeId: index,
        name: item.name,
        reason: item.reason,
        suggestedUtilisationPercent: item.suggestedUtilisationPercent,
      }));
    } catch {
      return candidates.slice(0, 3).map((c) => ({
        employeeId: 0,
        name: c.name,
        reason: responseText.slice(0, 200),
      }));
    }
  }

  private buildTeamBuildPrompt(requirement: string, candidates: TeamBuildCandidate[]): string {
    const candidateText = candidates
      .map((c) => {
        const skills = c.skills
          .map((s) => `${s.skillName} (${s.proficiencyLevel})`)
          .join(', ');
        return `Name: ${c.name}, Department: ${c.department}, Designation: ${c.designation}, Skills: ${skills || 'none'}`;
      })
      .join('\n');

    return `You are a resource manager assistant. A manager needs to staff a complete team from BENCH employees only.

Team requirement (plain English):
${requirement}

Available BENCH employees (organisation-wide — pick names ONLY from this list):
${candidateText}

Rules:
1. Parse every distinct role from the requirement (e.g. "1 Java Developer", "1 QA", "SDET", "1 DevOps Engineer").
2. Fill ALL roles in a SINGLE pass — assign the best-matching bench employee to each role.
3. NEVER assign the same person to more than one role.
4. For each role, list the required skills you inferred and which of the assignee's skills match.
5. If no suitable bench employee remains for a role, set assignedName to null and explain why in reason.

Return a JSON array only (no markdown) like:
[{"roleTitle":"Senior Java Developer","requiredSkills":["Java","Spring"],"assignedName":"Jane Doe","matchedSkills":["Java"],"reason":"Strong Java skills at Advanced level."}]`;
  }

  private parseTeamBuildResponse(
    responseText: string,
    candidates: TeamBuildCandidate[],
  ): TeamBuildRoleAssignment[] {
    const jsonText = this.extractJsonArray(responseText);
    const candidateNames = new Set(candidates.map((c) => c.name));

    try {
      const parsed = JSON.parse(jsonText) as Array<{
        roleTitle: string;
        requiredSkills?: string[];
        assignedName?: string | null;
        matchedSkills?: string[];
        reason?: string;
      }>;

      return parsed.map((item) => ({
        roleTitle: item.roleTitle ?? 'Unnamed role',
        requiredSkills: item.requiredSkills ?? [],
        assignedName:
          item.assignedName && candidateNames.has(item.assignedName)
            ? item.assignedName
            : null,
        matchedSkills: item.matchedSkills ?? [],
        reason: item.reason ?? '',
      }));
    } catch {
      return [];
    }
  }

  private extractJsonArray(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) return fenced[1].trim();

    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end > start) {
      return text.slice(start, end + 1);
    }
    return text.trim();
  }
}
