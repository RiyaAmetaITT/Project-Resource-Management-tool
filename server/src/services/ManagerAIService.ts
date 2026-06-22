import { AllocationService } from './AllocationService';
import { TimesheetService } from './TimesheetService';
import { AIServiceFactory } from './ai/AIServiceFactory';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { ResourceSkillRepository } from '../repositories/ResourceSkillRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import {
  CandidateSummary,
  ProjectFacts,
  SkillMatchResult,
  TeamBuildCandidate,
  TeamBuildRoleAssignment,
} from './ai/IAIService';
import { IProjectRiskAnalysis } from './IProjectRiskAnalysis';
import {
  SkillMatchResponseDto,
  SkillMatchResultDto,
  TeamBuildGapType,
  TeamBuildResponseDto,
  TeamBuildFilledRoleDto,
  TeamBuildUnfilledRoleDto,
} from '../dtos/manager.dto';
import { AppError } from '../errors/AppError';
import { ResourceProfile } from '../models/Resource';
import { formatDate } from '../utils/dateUtils';
import { buildRecentHoursSummary } from '../utils/projectHoursUtils';
import {
  LOW_HOURS_THRESHOLD_RATIO,
  MAX_UTILISATION_PERCENT,
  RECENT_ACTIVITY_DISPLAY_COUNT,
  RECENT_ACTIVITY_WEEKS,
  TEAM_BUILD_AI_TIMEOUT_MS,
} from '../constants';
import { HealthFlag, ResourceStatus } from '../types/enums';

export class ManagerAIService implements IProjectRiskAnalysis {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly timesheetService: TimesheetService,
    private readonly aiServiceFactory: AIServiceFactory,
    private readonly resourceRepository: ResourceRepository,
    private readonly resourceSkillRepository: ResourceSkillRepository,
    private readonly activityTagRepository: ActivityTagRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly configRepository: SystemConfigRepository,
  ) {}

  async performSkillMatch(
    managerId: number,
    projectId: number,
    requirement: string,
  ): Promise<SkillMatchResponseDto> {
    await this.allocationService.assertManagerOwnsProject(projectId, managerId);

    const config = await this.configRepository.getConfig();
    const employeeResources = await this.resourceRepository.findAllActiveEmployees();
    const allCandidates = await this.buildCandidateSummaries(employeeResources);
    const requiredWeeklyHours = this.parseRequiredWeeklyHours(requirement);
    const qualifiedCandidates = this.filterCandidatesByCapacity(
      allCandidates,
      config.maxWeeklyHours,
      requiredWeeklyHours,
    );

    if (qualifiedCandidates.length === 0) {
      throw AppError.badRequest(this.buildNoCandidatesMessage(requiredWeeklyHours));
    }

    const aiService = await this.aiServiceFactory.create();
    const results = await aiService.generateSkillMatch(requirement, qualifiedCandidates);
    const candidateNames = new Set(qualifiedCandidates.map((c) => c.name));
    const validResults = results.filter((r) => candidateNames.has(r.name));
    const resourcesByName = new Map(employeeResources.map((r) => [r.fullName, r]));

    const enrichedResults: SkillMatchResultDto[] = validResults.map((r) =>
      this.enrichSkillMatchResult(r, resourcesByName, qualifiedCandidates),
    );

    return { projectId, results: enrichedResults };
  }

  async performTeamBuild(_managerId: number, requirement: string): Promise<TeamBuildResponseDto> {
    const trimmedRequirement = requirement.trim();
    if (!trimmedRequirement) {
      throw AppError.badRequest('Team requirement cannot be empty.');
    }

    const allEmployees = await this.resourceRepository.findAllActiveEmployees();
    const benchEmployees = allEmployees.filter((r) => r.status === ResourceStatus.BENCH);
    const benchCandidates = await this.buildTeamBuildCandidates(benchEmployees);
    const orgEmployees = await this.buildOrgEmployeeSkillIndex(allEmployees);

    let assignments = await this.tryAiTeamBuild(trimmedRequirement, benchCandidates);
    if (assignments.length === 0) {
      assignments = this.buildRuleBasedTeamAssignments(trimmedRequirement, benchCandidates);
    }

    return this.finalizeTeamBuildResults(
      trimmedRequirement,
      assignments,
      benchCandidates,
      orgEmployees,
      benchEmployees.length,
    );
  }

  async performRiskSummary(managerId: number, projectId: number): Promise<string> {
    await this.allocationService.assertManagerOwnsProject(projectId, managerId);
    return this.buildRiskSummaryForProject(projectId);
  }

  async buildRiskSummaryForProject(projectId: number): Promise<string> {
    const facts = await this.buildProjectFacts(projectId);

    try {
      const aiService = await this.aiServiceFactory.create();
      return await aiService.generateRiskSummary(facts);
    } catch {
      return this.buildFallbackRiskSummary(facts);
    }
  }

  async findRiskReductionCandidates(projectId: number): Promise<SkillMatchResultDto[]> {
    const facts = await this.buildProjectFacts(projectId);
    const requirement = this.buildRiskReductionRequirement(facts);

    const config = await this.configRepository.getConfig();
    const employeeResources = await this.resourceRepository.findAllActiveEmployees();
    const allCandidates = await this.buildCandidateSummaries(employeeResources);
    const qualifiedCandidates = this.filterCandidatesByCapacity(
      allCandidates,
      config.maxWeeklyHours,
      null,
    );

    if (qualifiedCandidates.length === 0) return [];

    const resourcesByName = new Map(employeeResources.map((r) => [r.fullName, r]));

    try {
      const aiService = await this.aiServiceFactory.create();
      const results = await aiService.generateSkillMatch(requirement, qualifiedCandidates);
      const candidateNames = new Set(qualifiedCandidates.map((c) => c.name));
      const validResults = results.filter((r) => candidateNames.has(r.name));

      if (validResults.length === 0) {
        return this.buildRuleBasedSkillSuggestions(qualifiedCandidates, resourcesByName).slice(0, 3);
      }

      return validResults
        .slice(0, 3)
        .map((r) => this.enrichSkillMatchResult(r, resourcesByName, qualifiedCandidates));
    } catch {
      return this.buildRuleBasedSkillSuggestions(qualifiedCandidates, resourcesByName).slice(0, 3);
    }
  }

  private async buildCandidateSummaries(resources: ResourceProfile[]): Promise<CandidateSummary[]> {
    return Promise.all(
      resources.map(async (resource) => {
        const skills = await this.resourceSkillRepository.findByResourceId(resource.id);
        const recentTags = await this.activityTagRepository.findRecentTagsByResource(
          resource.id,
          RECENT_ACTIVITY_WEEKS,
        );
        return {
          name: resource.fullName,
          skills: skills.map((s) => s.skillName),
          availablePercent: MAX_UTILISATION_PERCENT - resource.totalUtilisation,
          recentActivityTags: recentTags,
        };
      }),
    );
  }

  private enrichSkillMatchResult(
    result: SkillMatchResult,
    resourcesByName: Map<string, ResourceProfile>,
    qualifiedCandidates: CandidateSummary[],
  ): SkillMatchResultDto {
    const matched = resourcesByName.get(result.name);
    const candidate = qualifiedCandidates.find((c) => c.name === result.name);
    return {
      ...result,
      employeeId: matched?.id ?? 0,
      skillsMatch: candidate?.skills.join(', '),
      availability: candidate ? `${candidate.availablePercent}% free` : undefined,
      recentActivity: candidate?.recentActivityTags
        .slice(0, RECENT_ACTIVITY_DISPLAY_COUNT)
        .join(', '),
    };
  }

  private buildNoCandidatesMessage(requiredWeeklyHours: number | null): string {
    if (requiredWeeklyHours !== null) {
      return `No employees have at least ${requiredWeeklyHours} free hours per week for this requirement.`;
    }
    return 'No available employees found for this requirement.';
  }

  private parseRequiredWeeklyHours(requirement: string): number | null {
    const match = requirement.match(/(\d+)\s*(?:hrs?|hours?)\s*(?:\/|per)?\s*week/i)
      ?? requirement.match(/(?:about|around|~)\s*(\d+)\s*(?:hrs?|hours?)/i);
    return match ? Number(match[1]) : null;
  }

  private filterCandidatesByCapacity(
    candidates: CandidateSummary[],
    maxWeeklyHours: number,
    requiredWeeklyHours: number | null,
  ): CandidateSummary[] {
    if (requiredWeeklyHours !== null) {
      return candidates.filter(
        (c) => (c.availablePercent / MAX_UTILISATION_PERCENT) * maxWeeklyHours >= requiredWeeklyHours,
      );
    }
    return candidates.filter((c) => c.availablePercent > 0);
  }

  private async buildProjectFacts(projectId: number): Promise<ProjectFacts> {
    const project = await this.projectRepository.findById(projectId);
    const milestones = await this.milestoneRepository.findByProjectId(projectId);
    const allocations = await this.allocationService.getActiveAllocationsForProject(projectId);
    const recentHoursSummary = await buildRecentHoursSummary(
      this.timesheetService,
      this.configRepository,
      projectId,
      allocations,
    );

    return {
      projectName: project?.name ?? 'Unknown',
      milestones: milestones.map((m) => ({
        title: m.title,
        dueDate: new Date(m.dueDate),
        status: m.status,
        isOverdue: m.healthFlag === HealthFlag.OVERDUE,
      })),
      allocatedResources: allocations.map((a) => ({
        name: a.employeeName,
        utilisationPercent: a.utilisationPercent,
      })),
      recentHoursSummary,
    };
  }

  private async tryAiTeamBuild(
    requirement: string,
    benchCandidates: TeamBuildCandidate[],
  ): Promise<TeamBuildRoleAssignment[]> {
    try {
      const aiService = await this.aiServiceFactory.create();
      const aiPromise = aiService.generateTeamBuild(requirement, benchCandidates);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Team build AI timed out')),
          TEAM_BUILD_AI_TIMEOUT_MS,
        );
      });

      const assignments = await Promise.race([aiPromise, timeoutPromise]);
      return assignments.length > 0 ? assignments : [];
    } catch {
      return [];
    }
  }

  private async buildTeamBuildCandidates(resources: ResourceProfile[]): Promise<TeamBuildCandidate[]> {
    return Promise.all(
      resources.map(async (resource) => {
        const skills = await this.resourceSkillRepository.findByResourceId(resource.id);
        return {
          employeeId: resource.id,
          name: resource.fullName,
          department: resource.department ?? 'Unassigned',
          designation: resource.designation ?? 'Unassigned',
          skills: skills.map((s) => ({
            skillName: s.skillName,
            proficiencyLevel: s.proficiencyLevel,
          })),
        };
      }),
    );
  }

  private async buildOrgEmployeeSkillIndex(resources: ResourceProfile[]): Promise<
    Array<{
      employeeId: number;
      name: string;
      status: ResourceStatus;
      skills: Array<{ skillName: string; proficiencyLevel: string }>;
    }>
  > {
    return Promise.all(
      resources.map(async (resource) => {
        const skills = await this.resourceSkillRepository.findByResourceId(resource.id);
        return {
          employeeId: resource.id,
          name: resource.fullName,
          status: resource.status,
          skills: skills.map((s) => ({
            skillName: s.skillName,
            proficiencyLevel: s.proficiencyLevel,
          })),
        };
      }),
    );
  }

  private buildRuleBasedTeamAssignments(
    requirement: string,
    benchCandidates: TeamBuildCandidate[],
  ): TeamBuildRoleAssignment[] {
    const roleTitles = this.extractRoleTitlesFromRequirement(requirement);
    const assignedNames = new Set<string>();
    const assignments: TeamBuildRoleAssignment[] = [];

    for (const roleTitle of roleTitles) {
      const requiredSkills = this.inferSkillsFromRoleTitle(roleTitle);
      const best = this.pickBestBenchCandidate(requiredSkills, benchCandidates, assignedNames);

      if (best) {
        assignedNames.add(best.candidate.name);
        assignments.push({
          roleTitle,
          requiredSkills,
          assignedName: best.candidate.name,
          matchedSkills: best.matchedSkills,
          reason: best.reason,
        });
      } else {
        assignments.push({
          roleTitle,
          requiredSkills,
          assignedName: null,
          matchedSkills: [],
          reason: 'No suitable bench employee found for this role.',
        });
      }
    }

    return assignments;
  }

  private extractRoleTitlesFromRequirement(requirement: string): string[] {
    const segments = requirement
      .split(/[,;]+|\band\b/gi)
      .map((s) => s.trim())
      .filter(Boolean);

    if (segments.length === 0) return [requirement.trim()];

    return segments.map((segment) =>
      segment.replace(/^\d+\s*/, '').trim() || segment,
    );
  }

  private inferSkillsFromRoleTitle(roleTitle: string): string[] {
    const title = roleTitle.toLowerCase();
    const skillKeywords: Array<{ pattern: RegExp; skills: string[] }> = [
      { pattern: /java/, skills: ['Java'] },
      { pattern: /qa|quality|tester/, skills: ['QA', 'Testing'] },
      { pattern: /sdet/, skills: ['SDET', 'Automation', 'Testing'] },
      { pattern: /devops/, skills: ['DevOps'] },
      { pattern: /frontend|react|angular/, skills: ['Frontend', 'React'] },
      { pattern: /backend|node|python/, skills: ['Backend'] },
      { pattern: /developer|engineer/, skills: ['Development'] },
    ];

    const matched = skillKeywords
      .filter((entry) => entry.pattern.test(title))
      .flatMap((entry) => entry.skills);

    return matched.length > 0 ? [...new Set(matched)] : [roleTitle];
  }

  private pickBestBenchCandidate(
    requiredSkills: string[],
    benchCandidates: TeamBuildCandidate[],
    excludeNames: Set<string>,
  ): { candidate: TeamBuildCandidate; matchedSkills: string[]; reason: string } | null {
    let best: {
      candidate: TeamBuildCandidate;
      matchedSkills: string[];
      score: number;
    } | null = null;

    for (const candidate of benchCandidates) {
      if (excludeNames.has(candidate.name)) continue;

      const matchedSkills = this.findMatchingSkills(candidate.skills, requiredSkills);
      if (matchedSkills.length === 0) continue;

      const score = matchedSkills.length;
      if (!best || score > best.score) {
        best = { candidate, matchedSkills, score };
      }
    }

    if (!best) return null;

    const proficiencies = best.matchedSkills.map((skillName) => {
      const skill = best!.candidate.skills.find(
        (s) => s.skillName.toLowerCase() === skillName.toLowerCase(),
      );
      return skill ? `${skillName} (${skill.proficiencyLevel})` : skillName;
    });

    return {
      candidate: best.candidate,
      matchedSkills: best.matchedSkills,
      reason: `Best bench match with ${proficiencies.join(', ')}.`,
    };
  }

  private async finalizeTeamBuildResults(
    requirement: string,
    assignments: TeamBuildRoleAssignment[],
    benchCandidates: TeamBuildCandidate[],
    orgEmployees: Array<{
      employeeId: number;
      name: string;
      status: ResourceStatus;
      skills: Array<{ skillName: string; proficiencyLevel: string }>;
    }>,
    benchSearched: number,
  ): Promise<TeamBuildResponseDto> {
    const candidatesByName = new Map(benchCandidates.map((c) => [c.name, c]));
    const assignedNames = new Set<string>();
    const filled: TeamBuildFilledRoleDto[] = [];
    const unfilled: TeamBuildUnfilledRoleDto[] = [];

    for (const assignment of assignments) {
      const isDuplicateAssignment =
        assignment.assignedName != null && assignedNames.has(assignment.assignedName);
      const candidate =
        assignment.assignedName != null ? candidatesByName.get(assignment.assignedName) : null;

      if (assignment.assignedName && candidate && !isDuplicateAssignment) {
        assignedNames.add(assignment.assignedName);
        const proficiencyLevels = assignment.matchedSkills.map((skillName) => {
          const skill = candidate.skills.find(
            (s) => s.skillName.toLowerCase() === skillName.toLowerCase(),
          );
          return skill?.proficiencyLevel ?? 'Unknown';
        });

        filled.push({
          roleTitle: assignment.roleTitle,
          requiredSkills: assignment.requiredSkills,
          employeeId: candidate.employeeId,
          employeeName: candidate.name,
          matchedSkills: assignment.matchedSkills,
          proficiencyLevels,
          reason: assignment.reason,
        });
        continue;
      }

      const gap = await this.analyzeRoleGap(
        assignment.roleTitle,
        assignment.requiredSkills,
        orgEmployees,
        assignedNames,
      );
      unfilled.push(gap);
    }

    return { requirement, filled, unfilled, benchSearched };
  }

  private async analyzeRoleGap(
    roleTitle: string,
    requiredSkills: string[],
    orgEmployees: Array<{
      employeeId: number;
      name: string;
      status: ResourceStatus;
      skills: Array<{ skillName: string; proficiencyLevel: string }>;
    }>,
    assignedNames: Set<string>,
  ): Promise<TeamBuildUnfilledRoleDto> {
    const skillsToMatch = requiredSkills.length > 0 ? requiredSkills : this.inferSkillsFromRoleTitle(roleTitle);
    const withSkills = orgEmployees.filter((emp) =>
      this.employeeMatchesSkills(emp.skills, skillsToMatch),
    );

    if (withSkills.length === 0) {
      return {
        roleTitle,
        requiredSkills: skillsToMatch,
        gapType: TeamBuildGapType.SKILL_GAP,
        message:
          `Skill Gap: Nobody in the organisation has the required skills `
          + `(${skillsToMatch.join(', ')}). Consider hiring or training.`,
      };
    }

    const availableBench = withSkills.filter(
      (e) => e.status === ResourceStatus.BENCH && !assignedNames.has(e.name),
    );
    if (availableBench.length > 0) {
      return {
        roleTitle,
        requiredSkills: skillsToMatch,
        gapType: TeamBuildGapType.BENCH_EXHAUSTED,
        message:
          `Matching bench employees exist (${availableBench.map((e) => e.name).join(', ')}) `
          + 'but could not be matched confidently for this role.',
        skilledEmployees: availableBench.map((e) => e.name),
      };
    }

    const usedBench = withSkills.filter(
      (e) => e.status === ResourceStatus.BENCH && assignedNames.has(e.name),
    );
    if (usedBench.length > 0) {
      return {
        roleTitle,
        requiredSkills: skillsToMatch,
        gapType: TeamBuildGapType.BENCH_EXHAUSTED,
        message:
          `All matching bench employees (${usedBench.map((e) => e.name).join(', ')}) `
          + 'are already assigned to other roles in this team.',
        skilledEmployees: usedBench.map((e) => e.name),
      };
    }

    const allocated = withSkills.filter((e) => e.status === ResourceStatus.ALLOCATED);
    if (allocated.length === 0) {
      return {
        roleTitle,
        requiredSkills: skillsToMatch,
        gapType: TeamBuildGapType.BENCH_EXHAUSTED,
        message:
          'No suitable bench employee could be matched for this role in the current team build.',
      };
    }

    const availabilityDates = await Promise.all(
      allocated.map((e) => this.getEmployeeAvailabilityDate(e.employeeId)),
    );
    const earliestAvailable = availabilityDates.reduce(
      (earliest, date) => (date < earliest ? date : earliest),
      availabilityDates[0],
    );

    return {
      roleTitle,
      requiredSkills: skillsToMatch,
      gapType: TeamBuildGapType.AVAILABILITY_GAP,
      message:
        `Availability Gap: ${allocated.map((e) => e.name).join(', ')} have the required skills `
        + `but are currently allocated until ${formatDate(earliestAvailable)}.`,
      availableFrom: formatDate(earliestAvailable),
      skilledEmployees: allocated.map((e) => e.name),
    };
  }

  private async getEmployeeAvailabilityDate(employeeId: number): Promise<Date> {
    const allocations = await this.allocationService.getActiveAllocationsForEmployee(employeeId);
    if (allocations.length === 0) return new Date();

    const latestEnd = allocations.reduce(
      (latest, allocation) => {
        const end = new Date(allocation.toDate);
        return end > latest ? end : latest;
      },
      new Date(allocations[0].toDate),
    );

    const availableFrom = new Date(latestEnd);
    availableFrom.setDate(availableFrom.getDate() + 1);
    return availableFrom;
  }

  private findMatchingSkills(
    employeeSkills: Array<{ skillName: string }>,
    requiredSkills: string[],
  ): string[] {
    const matched: string[] = [];
    for (const required of requiredSkills) {
      const match = employeeSkills.find((s) => this.skillsAreEquivalent(s.skillName, required));
      if (match && !matched.includes(match.skillName)) {
        matched.push(match.skillName);
      }
    }
    return matched;
  }

  private employeeMatchesSkills(
    employeeSkills: Array<{ skillName: string }>,
    requiredSkills: string[],
  ): boolean {
    return this.findMatchingSkills(employeeSkills, requiredSkills).length > 0;
  }

  private skillsAreEquivalent(employeeSkill: string, requiredSkill: string): boolean {
    const a = employeeSkill.toLowerCase().trim();
    const b = requiredSkill.toLowerCase().trim();
    return a.includes(b) || b.includes(a);
  }

  private buildRiskReductionRequirement(facts: ProjectFacts): string {
    const parts: string[] = [];
    const overdue = facts.milestones.filter((m) => m.isOverdue);

    if (overdue.length > 0) {
      parts.push(`Help deliver overdue milestones: ${overdue.map((m) => m.title).join(', ')}`);
    }

    const lowHours = facts.recentHoursSummary.filter(
      (h) => h.expectedHours > 0 && h.loggedHours < h.expectedHours * LOW_HOURS_THRESHOLD_RATIO,
    );
    if (lowHours.length > 0) {
      parts.push(
        `Additional capacity to cover shortfall from ${lowHours.map((h) => h.employeeName).join(', ')}`,
      );
    }

    if (parts.length === 0) {
      return 'Available employees with relevant skills to help reduce project delivery risk';
    }

    return parts.join('. ');
  }

  private buildRuleBasedSkillSuggestions(
    candidates: CandidateSummary[],
    resourcesByName: Map<string, ResourceProfile>,
  ): SkillMatchResultDto[] {
    return candidates
      .filter((c) => c.availablePercent > 0)
      .sort((a, b) => b.availablePercent - a.availablePercent)
      .slice(0, 3)
      .map((c) => ({
        employeeId: resourcesByName.get(c.name)?.id ?? 0,
        name: c.name,
        reason: `Available ${c.availablePercent}% with skills: ${c.skills.join(', ') || 'general'}`,
        skillsMatch: c.skills.join(', '),
        availability: `${c.availablePercent}% free`,
      }));
  }

  private buildFallbackRiskSummary(facts: ProjectFacts): string {
    const overdue = facts.milestones.filter((m) => m.isOverdue);
    const lowHours = facts.recentHoursSummary.filter(
      (h) => h.expectedHours > 0 && h.loggedHours < h.expectedHours * LOW_HOURS_THRESHOLD_RATIO,
    );

    const rows: string[] = [
      '| Risk Area | Severity | Detail | Recommended Action |',
      '| --- | --- | --- | --- |',
    ];

    if (overdue.length > 0) {
      const titles = overdue.map((m) => m.title).join(', ');
      rows.push(
        `| Overdue milestones | High | ${overdue.length} milestone(s) overdue: ${titles}. | Review blockers and adjust timeline with the team. |`,
      );
    } else {
      rows.push(
        '| Milestone schedule | Low | No milestones are currently flagged as overdue. | Continue monitoring upcoming due dates. |',
      );
    }

    if (lowHours.length > 0) {
      lowHours.forEach((h) => {
        rows.push(
          `| Low effort | Medium | ${h.employeeName} logged ${h.loggedHours} of ${h.expectedHours} expected hrs. | Follow up on workload or blockers. |`,
        );
      });
    } else if (facts.recentHoursSummary.length > 0) {
      rows.push(
        '| Timesheet effort | Low | Recent hours are broadly in line with allocations. | No immediate action required. |',
      );
    } else {
      rows.push(
        '| Timesheet data | Medium | No recent timesheet data for allocated resources. | Prompt team to submit timesheets. |',
      );
    }

    return `${rows.join('\n')}\n\nRule-based fallback — AI unavailable. Project: "${facts.projectName}".`;
  }
}
