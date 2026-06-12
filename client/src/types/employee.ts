export interface MissedTimesheetCheck {
  hasMissedLastWeek: boolean;
  missedWeekStartDate: string | null;
}

export interface WeekAllocation {
  projectId: number;
  projectName: string;
  utilisationPercent: number;
  maxHours: number;
}

export interface SubmitTimesheetContext {
  employeeName: string;
  weekStartDate: string;
  maxWeeklyHours: number;
  allocations: WeekAllocation[];
}

export interface TimesheetEntry {
  projectId: number;
  hours: number;
  activityTags: string[];
}

export interface SubmitTimesheetPayload {
  weekStartDate: string;
  entries: TimesheetEntry[];
}

export interface TimesheetSummary {
  id: number;
  weekStartDate: string;
  totalHours: number;
  status: 'SUBMITTED' | 'MISSED';
}

export interface TimesheetWeekDetail {
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

export interface AllocationSummary {
  projectId: number;
  projectName: string;
  utilisationPercent: number;
  fromDate: string;
  toDate: string;
}
