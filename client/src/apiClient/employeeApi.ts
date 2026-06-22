import apiClient from './baseClient';
import {
  AllocationSummary,
  MissedTimesheetCheck,
  SubmitTimesheetContext,
  SubmitTimesheetPayload,
  TimesheetSummary,
  TimesheetWeekDetail,
} from '../types/employee';

interface ApiDataResponse<T> {
  data: T;
}

async function getData<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const response = await apiClient.get<ApiDataResponse<T>>(path, { params });
  return response.data.data;
}

export const employeeApi = {
  submitTimesheet: async (data: SubmitTimesheetPayload): Promise<void> => {
    await apiClient.post('/employee/timesheets', data);
  },
  getMyTimesheets: (): Promise<TimesheetSummary[]> => getData('/employee/timesheets'),
  getSubmitContext: (week: string): Promise<SubmitTimesheetContext> =>
    getData('/employee/timesheets/submit-context', { week }),
  getTimesheetWeekDetail: (week: string): Promise<TimesheetWeekDetail> =>
    getData('/employee/timesheets/detail', { week }),
  checkMissedTimesheet: (): Promise<MissedTimesheetCheck> =>
    getData('/employee/timesheets/missed-check'),
  getMyAllocations: (): Promise<AllocationSummary[]> => getData('/employee/allocations'),
};
