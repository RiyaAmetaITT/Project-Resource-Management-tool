export interface TimesheetEntryDto {
  projectId: number;
  hours: number;
  activityTags: string[];
}

export interface SubmitTimesheetDto {
  weekStartDate: string; // DD-MM-YYYY
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

/** Per-project row for manager team timesheet view (Screen 4.4). */
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
