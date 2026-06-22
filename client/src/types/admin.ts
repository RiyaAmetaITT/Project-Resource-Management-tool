import { Role, ProjectStatus, HealthStatus, EmployeeStatus } from './enums';

export interface UserSummary {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  username: string;
  temporaryPassword: string;
  role: Role;
}

export interface EmployeeSummary {
  id: number;
  name: string;
  department: string;
  status: EmployeeStatus;
}

export interface EmployeeDeactivatePreview {
  employee: {
    name: string;
    department: string;
    status: string;
    totalUtilisation: number;
  };
  activeAllocations: Array<{
    projectName: string;
    utilisationPercent: number;
    toDate: string;
  }>;
}

export interface EmployeeSkillSummary {
  id: number;
  skillName: string;
  proficiencyLevel: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
  managerName: string;
  endDate: string;
  status: ProjectStatus;
  completedStoryPoints: number;
  totalStoryPoints: number;
}

export interface ProjectDetail {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  totalStoryPoints: number;
  completedStoryPoints: number;
  status: ProjectStatus;
  healthStatus: HealthStatus;
  managerId: number;
  managerName: string;
}

export interface MilestoneSummary {
  id: number;
  title: string;
  dueDate: string;
  storyPoints: number;
  status: string;
  healthFlag: string;
}

export interface AllocationSummary {
  employeeName: string;
  projectName: string;
  utilisationPercent: number;
  fromDate: string;
  toDate: string;
}

export interface SystemConfigSummary {
  llmProvider: string;
  llmHost: string;
  llmModel: string;
  llmApiKey: string;
  schedulerIntervalHrs: number;
  maxWeeklyHours: number;
}
