/** User roles in the system. */
export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

/** Resource allocation status — computed by the scheduler. */
export enum ResourceStatus {
  BENCH = 'BENCH',
  ALLOCATED = 'ALLOCATED',
}

/** @deprecated Use ResourceStatus */
export const EmployeeStatus = ResourceStatus;

/** Project lifecycle status. */
export enum ProjectStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
}

/** Project health — set by the background scheduler. */
export enum HealthStatus {
  ON_TRACK = 'ON_TRACK',
  ATTENTION = 'ATTENTION',
  AT_RISK = 'AT_RISK',
}

/** Milestone completion status. */
export enum MilestoneStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

/** Milestone overdue flag — set by the scheduler. */
export enum HealthFlag {
  NORMAL = 'NORMAL',
  OVERDUE = 'OVERDUE',
}

/** Skill proficiency levels. */
export enum Proficiency {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

/** Skill domain categories — used in AI matching grouping. */
export enum SkillCategory {
  BACKEND = 'Backend',
  FRONTEND = 'Frontend',
  DEVOPS = 'DevOps',
  QA = 'QA',
  OTHER = 'Other',
}

/** Supported LLM providers. */
export enum LlmProvider {
  GEMMA = 'gemma',
}
