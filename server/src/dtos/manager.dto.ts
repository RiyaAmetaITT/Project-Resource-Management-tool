import { AllocationResponseDto } from './allocation.dto';
import { Project } from '../models/Project';
import { Milestone } from '../models/Milestone';

export interface DashboardEmployeeDto {
  id: number;
  name: string;
  department: string;
  totalUtilisation: number;
  skills?: string;
}

export interface ResourceDashboardDto {
  bench: DashboardEmployeeDto[];
  allocated: DashboardEmployeeDto[];
  partialCount: number;
}

export interface ManagerEmployeeShapeDto {
  id: number;
  userId: number;
  managerId: number | null;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: string;
  totalUtilisation: number;
  isActive: boolean;
}

export interface ManagerEmployeeSkillDto {
  id: number;
  employeeId: number;
  skillName: string;
  category: string;
  proficiencyLevel: string;
}

export interface EmployeeDetailDto {
  employee: ManagerEmployeeShapeDto;
  skills: ManagerEmployeeSkillDto[];
  activeAllocations: AllocationResponseDto[];
  recentTags: string[];
}

export interface RiskFlagDto {
  type: RiskFlagType;
  message: string;
  isPositive?: boolean;
}

export enum RiskFlagType {
  OVERDUE_MILESTONE = 'OVERDUE_MILESTONE',
  LOW_HOURS = 'LOW_HOURS',
  ALLOCATION_OK = 'ALLOCATION_OK',
}

export interface SkillMatchResultDto {
  employeeId: number;
  name: string;
  reason: string;
  skillsMatch?: string;
  availability?: string;
  recentActivity?: string;
  suggestedUtilisationPercent?: number;
}

export interface SkillMatchResponseDto {
  projectId: number;
  results: SkillMatchResultDto[];
}

export interface ProjectDetailDto {
  project: Project | null;
  milestones: Milestone[];
  allocations: AllocationResponseDto[];
  riskFlags: RiskFlagDto[];
}

export enum TeamBuildGapType {
  SKILL_GAP = 'SKILL_GAP',
  AVAILABILITY_GAP = 'AVAILABILITY_GAP',
  BENCH_EXHAUSTED = 'BENCH_EXHAUSTED',
}

export interface TeamBuildFilledRoleDto {
  roleTitle: string;
  requiredSkills: string[];
  employeeId: number;
  employeeName: string;
  matchedSkills: string[];
  proficiencyLevels: string[];
  reason: string;
}

export interface TeamBuildUnfilledRoleDto {
  roleTitle: string;
  requiredSkills: string[];
  gapType: TeamBuildGapType;
  message: string;
  availableFrom?: string;
  skilledEmployees?: string[];
}

export interface TeamBuildResponseDto {
  requirement: string;
  filled: TeamBuildFilledRoleDto[];
  unfilled: TeamBuildUnfilledRoleDto[];
  benchSearched: number;
}
