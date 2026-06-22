import { AllocationService } from './AllocationService';
import { TimesheetService } from './TimesheetService';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { ResourceSkillRepository } from '../repositories/ResourceSkillRepository';
import { ActivityTagRepository } from '../repositories/ActivityTagRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { MilestoneRepository } from '../repositories/MilestoneRepository';
import { SystemConfigRepository } from '../repositories/SystemConfigRepository';
import { AllocateDto, AllocationResponseDto, AllocationValidationDto } from '../dtos/allocation.dto';
import {
  DashboardEmployeeDto,
  EmployeeDetailDto,
  ProjectDetailDto,
  ResourceDashboardDto,
  RiskFlagDto,
  RiskFlagType,
  FrozenEmployeeDto,
} from '../dtos/manager.dto';
import { TeamTimesheetRowDto, EmployeeWeekTimesheetDetailDto } from '../dtos/timesheet.dto';
import { AppError } from '../errors/AppError';
import { ResourceProfile } from '../models/Resource';
import { Project } from '../models/Project';
import { Milestone } from '../models/Milestone';
import { formatDate } from '../utils/dateUtils';
import { buildRecentHoursSummary } from '../utils/projectHoursUtils';
import {
  LOW_HOURS_THRESHOLD_RATIO,
  MAX_UTILISATION_PERCENT,
  RECENT_ACTIVITY_WEEKS,
} from '../constants';
import { HealthFlag, ResourceStatus } from '../types/enums';

export class ManagerTeamService {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly timesheetService: TimesheetService,
    private readonly resourceRepository: ResourceRepository,
    private readonly resourceSkillRepository: ResourceSkillRepository,
    private readonly activityTagRepository: ActivityTagRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly configRepository: SystemConfigRepository,
  ) {}

  async getResourceDashboard(managerId: number): Promise<ResourceDashboardDto> {
    const resources = await this.resourceRepository.findByManagerId(managerId);
    const bench = await this.enrichWithSkills(
      resources.filter((r) => r.status === ResourceStatus.BENCH),
    );
    const allocated = await this.enrichWithSkills(
      resources.filter((r) => r.status === ResourceStatus.ALLOCATED),
    );
    const partialCount = allocated.filter((e) => e.totalUtilisation < MAX_UTILISATION_PERCENT).length;

    return { bench, allocated, partialCount };
  }

  async getEmployeeDetail(managerId: number, resourceId: number): Promise<EmployeeDetailDto> {
    const profile = await this.assertTeamMember(managerId, resourceId);

    const [skills, activeAllocations, recentTags] = await Promise.all([
      this.resourceSkillRepository.findByResourceId(resourceId),
      this.allocationService.getActiveAllocationsForEmployee(resourceId),
      this.activityTagRepository.findRecentTagsByResource(resourceId, RECENT_ACTIVITY_WEEKS),
    ]);

    return {
      employee: this.toEmployeeShape(profile),
      skills: skills.map((s) => ({
        id: s.id,
        employeeId: s.resourceId,
        skillName: s.skillName,
        category: s.category,
        proficiencyLevel: s.proficiencyLevel,
      })),
      activeAllocations,
      recentTags,
    };
  }

  async getMyProjects(managerId: number): Promise<Project[]> {
    return this.projectRepository.findByManagerId(managerId);
  }

  async getProjectDetail(managerId: number, projectId: number): Promise<ProjectDetailDto> {
    await this.allocationService.assertManagerOwnsProject(projectId, managerId);

    const [project, milestones, allocations] = await Promise.all([
      this.projectRepository.findById(projectId),
      this.milestoneRepository.findByProjectId(projectId),
      this.allocationService.getActiveAllocationsForProject(projectId),
    ]);

    const riskFlags = await this.buildRiskFlags(projectId, milestones, allocations);

    return { project, milestones, allocations, riskFlags };
  }

  async allocateResource(managerId: number, dto: AllocateDto): Promise<AllocationResponseDto> {
    await this.allocationService.assertManagerOwnsProject(dto.projectId, managerId);
    await this.allocationService.assertEmployeeInManagerTeam(dto.employeeId, managerId);
    return this.allocationService.allocateResource(dto);
  }

  async validateAllocation(managerId: number, dto: AllocateDto): Promise<AllocationValidationDto> {
    await this.allocationService.assertManagerOwnsProject(dto.projectId, managerId);
    await this.allocationService.assertEmployeeInManagerTeam(dto.employeeId, managerId);
    return this.allocationService.validateAllocation(dto);
  }

  async endAllocation(managerId: number, allocationId: number): Promise<void> {
    const allocation = await this.allocationService.getAllocationById(allocationId);
    if (!allocation) {
      throw AppError.notFound(`Allocation ${allocationId} not found.`);
    }
    await this.allocationService.assertManagerOwnsProject(allocation.projectId, managerId);
    await this.allocationService.endAllocation(allocationId);
  }

  async getActiveAllocationsForProject(
    managerId: number,
    projectId: number,
  ): Promise<AllocationResponseDto[]> {
    await this.allocationService.assertManagerOwnsProject(projectId, managerId);
    return this.allocationService.getActiveAllocationsForProject(projectId);
  }

  async getTeamTimesheets(managerId: number, weekStartDate: Date): Promise<TeamTimesheetRowDto[]> {
    return this.timesheetService.getTeamTimesheets(managerId, weekStartDate);
  }

  async getEmployeeTimesheetDetail(
    managerId: number,
    employeeId: number,
    weekStartDate: Date,
  ): Promise<EmployeeWeekTimesheetDetailDto> {
    await this.allocationService.assertEmployeeInManagerTeam(employeeId, managerId);
    return this.timesheetService.getEmployeeWeekDetail(employeeId, weekStartDate);
  }

  async getFrozenEmployees(managerId: number): Promise<FrozenEmployeeDto[]> {
    const frozen = await this.resourceRepository.findFrozenByManagerId(managerId);
    return frozen.map((employee) => ({
      employeeId: employee.id,
      employeeName: employee.fullName,
      email: employee.email,
      frozenWeekStartDate: employee.timesheetFrozenWeekStart
        ? formatDate(new Date(employee.timesheetFrozenWeekStart))
        : 'Unknown',
    }));
  }

  async restoreTimesheetAccess(managerId: number, employeeId: number): Promise<void> {
    const profile = await this.assertTeamMember(managerId, employeeId);
    if (!profile.timesheetAccessFrozen) {
      throw AppError.badRequest('This employee does not have frozen timesheet access.');
    }
    await this.resourceRepository.restoreTimesheetAccess(employeeId);
  }

  private async assertTeamMember(managerId: number, resourceId: number): Promise<ResourceProfile> {
    const profile = await this.resourceRepository.findActiveEmployeeProfileById(resourceId);
    if (!profile || profile.managerId !== managerId) {
      throw AppError.forbidden('You can only view employees assigned to your team.');
    }
    return profile;
  }

  private async enrichWithSkills(resources: ResourceProfile[]): Promise<DashboardEmployeeDto[]> {
    return Promise.all(
      resources.map(async (resource) => {
        const skills = await this.resourceSkillRepository.findByResourceId(resource.id);
        return {
          id: resource.id,
          name: resource.fullName,
          department: resource.department ?? 'Unassigned',
          totalUtilisation: resource.totalUtilisation,
          skills: skills.map((s) => s.skillName).join(', '),
        };
      }),
    );
  }

  private toEmployeeShape(profile: ResourceProfile) {
    return {
      id: profile.id,
      userId: profile.userId,
      managerId: profile.managerId,
      name: profile.fullName,
      email: profile.email,
      department: profile.department ?? 'Unassigned',
      designation: profile.designation ?? 'Unassigned',
      status: profile.status,
      totalUtilisation: profile.totalUtilisation,
      isActive: profile.isActive,
    };
  }

  private async buildRiskFlags(
    projectId: number,
    milestones: Milestone[],
    allocations: AllocationResponseDto[],
  ): Promise<RiskFlagDto[]> {
    const flags: RiskFlagDto[] = milestones
      .filter((m) => m.healthFlag === HealthFlag.OVERDUE)
      .map((m) => ({
        type: RiskFlagType.OVERDUE_MILESTONE,
        message: `${m.title} milestone is overdue`,
      }));

    const hoursSummary = await buildRecentHoursSummary(
      this.timesheetService,
      this.configRepository,
      projectId,
      allocations,
    );
    for (const summary of hoursSummary) {
      if (summary.loggedHours < summary.expectedHours * LOW_HOURS_THRESHOLD_RATIO) {
        flags.push({
          type: RiskFlagType.LOW_HOURS,
          message: `${summary.employeeName} logged only ${summary.loggedHours} hrs last week (expected ${summary.expectedHours} hrs)`,
        });
      }
    }

    const hasLowHours = flags.some((f) => f.type === RiskFlagType.LOW_HOURS);
    if (allocations.length > 0 && !hasLowHours) {
      flags.push({
        type: RiskFlagType.ALLOCATION_OK,
        message: 'Resources are correctly allocated',
        isPositive: true,
      });
    }

    return flags;
  }
}
