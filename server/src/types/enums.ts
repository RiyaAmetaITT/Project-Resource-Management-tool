export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum ResourceStatus {
  BENCH = 'BENCH',
  ALLOCATED = 'ALLOCATED',
}

export const EmployeeStatus = ResourceStatus;

export enum ProjectStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
}

export enum HealthStatus {
  ON_TRACK = 'ON_TRACK',
  ATTENTION = 'ATTENTION',
  AT_RISK = 'AT_RISK',
}

export enum MilestoneStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum HealthFlag {
  NORMAL = 'NORMAL',
  OVERDUE = 'OVERDUE',
}

export enum Proficiency {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum SkillCategory {
  BACKEND = 'Backend',
  FRONTEND = 'Frontend',
  DEVOPS = 'DevOps',
  QA = 'QA',
  OTHER = 'Other',
}

export enum LlmProvider {
  GEMMA = 'gemma',
}
