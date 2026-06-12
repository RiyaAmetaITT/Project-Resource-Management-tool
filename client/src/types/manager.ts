import { HealthStatus } from './enums';

export interface DashboardEmployee {
  id: number;
  name: string;
  department: string;
  totalUtilisation: number;
  skills?: string;
}

export interface ResourceDashboard {
  bench: DashboardEmployee[];
  allocated: DashboardEmployee[];
  partialCount: number;
}

export interface EmployeeDetail {
  employee: {
    name: string;
    department: string;
    status: string;
    totalUtilisation: number;
  };
  skills: Array<{ skillName: string }>;
  activeAllocations: Array<{
    projectName: string;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
  }>;
  recentTags: string[];
}

export interface SkillMatchResult {
  employeeId: number;
  name: string;
  reason: string;
  skillsMatch?: string;
  availability?: string;
  recentActivity?: string;
  suggestedUtilisationPercent?: number;
}

export interface ProjectSummary {
  id: number;
  name: string;
  endDate: string;
  healthStatus: HealthStatus;
}

export interface RiskFlag {
  type: string;
  message: string;
  isPositive?: boolean;
}

export interface ProjectDetail {
  project: { name: string; healthStatus: HealthStatus };
  milestones: Array<{
    title: string;
    dueDate: string;
    storyPoints: number;
    status: string;
    healthFlag: string;
  }>;
  allocations: Array<{
    employeeName: string;
    utilisationPercent: number;
    fromDate: string;
    toDate: string;
  }>;
  riskFlags: RiskFlag[];
}

export interface TeamTimesheetRow {
  employeeId: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  hours: number;
  status: string;
}

export interface EmployeeTimesheetDetail {
  employeeName: string;
  weekStartDate: string;
  status: string;
  entries: Array<{
    projectName: string;
    hours: number;
    activityTags: string[];
  }>;
  totalHours: number;
}

export interface AllocationValidation {
  employeeName: string;
  currentTotal: number;
  newTotal: number;
  isValid: boolean;
}

export interface ProjectAllocation {
  id: number;
  employeeName: string;
  utilisationPercent: number;
  fromDate: string;
  toDate: string;
}

export interface AllocatePayload {
  employeeId: number;
  projectId: number;
  utilisationPercent: number;
  fromDate: string;
  toDate: string;
}

export type TeamBuildGapType = 'SKILL_GAP' | 'AVAILABILITY_GAP' | 'BENCH_EXHAUSTED';

export interface TeamBuildFilledRole {
  roleTitle: string;
  requiredSkills: string[];
  employeeId: number;
  employeeName: string;
  matchedSkills: string[];
  proficiencyLevels: string[];
  reason: string;
}

export interface TeamBuildUnfilledRole {
  roleTitle: string;
  requiredSkills: string[];
  gapType: TeamBuildGapType;
  message: string;
  availableFrom?: string;
  skilledEmployees?: string[];
}

export interface TeamBuildResult {
  requirement: string;
  benchSearched: number;
  filled: TeamBuildFilledRole[];
  unfilled: TeamBuildUnfilledRole[];
}
