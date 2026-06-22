export interface TimesheetEntryDto {
  projectId: number;
  hours: number;
  activityTags: string[];
}

export interface SubmitTimesheetDto {
  weekStartDate: string;
  entries: TimesheetEntryDto[];
}

export interface TimesheetResponseDto {
  id: number;
  employeeId: number;
  employeeName: string;
  weekStartDate: Date;
  totalHours: number;
  status: 'SUBMITTED' | 'MISSED';
}

export interface TeamTimesheetRowDto {
  employeeId: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  hours: number;
  status: 'SUBMITTED' | 'MISSED';
}

export interface SkillMatchRequestDto {
  projectId: number;
  requirement: string;
}

export interface RiskSummaryRequestDto {
  projectId: number;
}

export interface TeamBuildRequestDto {
  requirement: string;
}

export interface WeekAllocationDto {
  projectId: number;
  projectName: string;
  utilisationPercent: number;
  maxHours: number;
}

export interface SubmitTimesheetContextDto {
  employeeName: string;
  weekStartDate: string;
  maxWeeklyHours: number;
  timesheetAccessFrozen: boolean;
  allocations: WeekAllocationDto[];
}

export interface MissedTimesheetCheckDto {
  hasMissedLastWeek: boolean;
  missedWeekStartDate: string | null;
  timesheetAccessFrozen: boolean;
}

export interface EmployeeWeekTimesheetDetailDto {
  employeeName: string;
  weekStartDate: string;
  status: 'SUBMITTED' | 'MISSED';
  entries: Array<{
    projectId: number;
    projectName: string;
    hours: number;
    activityTags: string[];
  }>;
  totalHours: number;
}
