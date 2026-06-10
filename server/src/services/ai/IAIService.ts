/**
 * AI service interface — Strategy Pattern.
 * Concrete implementations: GeminiAIService, GroqAIService.
 * Business code depends only on this interface, never on a specific provider.
 */

export interface CandidateSummary {
  name: string;
  skills: string[];
  availablePercent: number;
  recentActivityTags: string[];
}

export interface SkillMatchResult {
  employeeId: number;
  name: string;
  reason: string;
  suggestedUtilisationPercent?: number;
}

export interface ProjectFacts {
  projectName: string;
  milestones: Array<{
    title: string;
    dueDate: Date;
    status: string;
    isOverdue: boolean;
  }>;
  allocatedResources: Array<{
    name: string;
    utilisationPercent: number;
  }>;
  recentHoursSummary: Array<{
    employeeName: string;
    loggedHours: number;
    expectedHours: number;
  }>;
}

export interface IAIService {
  generateSkillMatch(requirement: string, candidates: CandidateSummary[]): Promise<SkillMatchResult[]>;
  generateRiskSummary(facts: ProjectFacts): Promise<string>;
}
