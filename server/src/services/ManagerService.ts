import { ManagerTeamService } from './ManagerTeamService';
import { ManagerAIService } from './ManagerAIService';
import { AllocateDto, AllocationResponseDto, AllocationValidationDto } from '../dtos/allocation.dto';
import {
  EmployeeDetailDto,
  ProjectDetailDto,
  ResourceDashboardDto,
  SkillMatchResponseDto,
  SkillMatchResultDto,
  TeamBuildResponseDto,
  FrozenEmployeeDto,
} from '../dtos/manager.dto';
import { TeamTimesheetRowDto, EmployeeWeekTimesheetDetailDto } from '../dtos/timesheet.dto';
import { Project } from '../models/Project';

export class ManagerService {
  constructor(
    private readonly teamService: ManagerTeamService,
    private readonly aiService: ManagerAIService,
  ) {}

  getResourceDashboard(managerId: number): Promise<ResourceDashboardDto> {
    return this.teamService.getResourceDashboard(managerId);
  }

  getEmployeeDetail(managerId: number, resourceId: number): Promise<EmployeeDetailDto> {
    return this.teamService.getEmployeeDetail(managerId, resourceId);
  }

  getMyProjects(managerId: number): Promise<Project[]> {
    return this.teamService.getMyProjects(managerId);
  }

  getProjectDetail(managerId: number, projectId: number): Promise<ProjectDetailDto> {
    return this.teamService.getProjectDetail(managerId, projectId);
  }

  allocateResource(managerId: number, dto: AllocateDto): Promise<AllocationResponseDto> {
    return this.teamService.allocateResource(managerId, dto);
  }

  validateAllocation(managerId: number, dto: AllocateDto): Promise<AllocationValidationDto> {
    return this.teamService.validateAllocation(managerId, dto);
  }

  endAllocation(managerId: number, allocationId: number): Promise<void> {
    return this.teamService.endAllocation(managerId, allocationId);
  }

  getActiveAllocationsForProject(
    managerId: number,
    projectId: number,
  ): Promise<AllocationResponseDto[]> {
    return this.teamService.getActiveAllocationsForProject(managerId, projectId);
  }

  getTeamTimesheets(managerId: number, weekStartDate: Date): Promise<TeamTimesheetRowDto[]> {
    return this.teamService.getTeamTimesheets(managerId, weekStartDate);
  }

  getEmployeeTimesheetDetail(
    managerId: number,
    employeeId: number,
    weekStartDate: Date,
  ): Promise<EmployeeWeekTimesheetDetailDto> {
    return this.teamService.getEmployeeTimesheetDetail(managerId, employeeId, weekStartDate);
  }

  getFrozenEmployees(managerId: number): Promise<FrozenEmployeeDto[]> {
    return this.teamService.getFrozenEmployees(managerId);
  }

  restoreTimesheetAccess(managerId: number, employeeId: number): Promise<void> {
    return this.teamService.restoreTimesheetAccess(managerId, employeeId);
  }

  performSkillMatch(
    managerId: number,
    projectId: number,
    requirement: string,
  ): Promise<SkillMatchResponseDto> {
    return this.aiService.performSkillMatch(managerId, projectId, requirement);
  }

  performTeamBuild(managerId: number, requirement: string): Promise<TeamBuildResponseDto> {
    return this.aiService.performTeamBuild(managerId, requirement);
  }

  performRiskSummary(managerId: number, projectId: number): Promise<string> {
    return this.aiService.performRiskSummary(managerId, projectId);
  }

  buildRiskSummaryForProject(projectId: number): Promise<string> {
    return this.aiService.buildRiskSummaryForProject(projectId);
  }

  findRiskReductionCandidates(projectId: number): Promise<SkillMatchResultDto[]> {
    return this.aiService.findRiskReductionCandidates(projectId);
  }
}
