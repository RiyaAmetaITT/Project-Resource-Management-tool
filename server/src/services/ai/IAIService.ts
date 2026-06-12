/**
 * AI service interface — Strategy Pattern.
 * Concrete implementation: GemmaAIService.
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

export interface TeamBuildCandidateSkill {
  skillName: string;
  proficiencyLevel: string;
}

export interface TeamBuildCandidate {
  employeeId: number;
  name: string;
  department: string;
  designation: string;
  skills: TeamBuildCandidateSkill[];
}

/** Raw AI output for one role in a team-build request. */
export interface TeamBuildRoleAssignment {
  roleTitle: string;
  requiredSkills: string[];
  assignedName: string | null;
  matchedSkills: string[];
  reason: string;
}

export interface IAIService {
  generateSkillMatch(requirement: string, candidates: CandidateSummary[]): Promise<SkillMatchResult[]>;
  generateRiskSummary(facts: ProjectFacts): Promise<string>;
  generateTeamBuild(
    requirement: string,
    benchCandidates: TeamBuildCandidate[],
  ): Promise<TeamBuildRoleAssignment[]>;
}
