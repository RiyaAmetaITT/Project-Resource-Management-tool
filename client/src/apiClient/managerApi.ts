import apiClient, { AI_API_TIMEOUT_MS } from './baseClient';
import {
  AllocatePayload,
  AllocationValidation,
  EmployeeDetail,
  EmployeeTimesheetDetail,
  ProjectAllocation,
  ProjectDetail,
  ProjectSummary,
  ResourceDashboard,
  SkillMatchResult,
  TeamBuildResult,
  TeamTimesheetRow,
  FrozenEmployee,
} from '../types/manager';

interface ApiDataResponse<T> {
  data: T;
}

async function getData<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const response = await apiClient.get<ApiDataResponse<T>>(path, { params });
  return response.data.data;
}

async function postData<T>(
  path: string,
  body: unknown,
  timeoutMs?: number,
): Promise<T> {
  const response = await apiClient.post<ApiDataResponse<T>>(path, body, { timeout: timeoutMs });
  return response.data.data;
}

export const managerApi = {
  getDashboard: (): Promise<ResourceDashboard> => getData('/manager/resources/dashboard'),
  getEmployeeDetail: (id: number): Promise<EmployeeDetail> =>
    getData(`/manager/resources/employees/${id}`),

  allocate: (data: AllocatePayload): Promise<{ employeeName: string; projectName: string }> =>
    postData('/manager/allocations', data),
  validateAllocation: (data: AllocatePayload): Promise<AllocationValidation> =>
    postData('/manager/allocations/validate', data),
  endAllocation: (id: number): Promise<void> => apiClient.put(`/manager/allocations/${id}/end`),
  getProjectAllocations: (projectId: number): Promise<ProjectAllocation[]> =>
    getData(`/manager/projects/${projectId}/allocations`),

  getMyProjects: (): Promise<ProjectSummary[]> => getData('/manager/projects'),
  getProjectDetail: (id: number): Promise<ProjectDetail> =>
    getData(`/manager/projects/${id}/detail`),

  getTeamTimesheets: (week?: string): Promise<TeamTimesheetRow[]> =>
    getData('/manager/timesheets', { week }),
  getEmployeeTimesheetDetail: (employeeId: number, week?: string): Promise<EmployeeTimesheetDetail> =>
    getData('/manager/timesheets/detail', { employeeId, week }),
  getFrozenEmployees: (): Promise<FrozenEmployee[]> =>
    getData('/manager/timesheets/frozen-employees'),
  restoreTimesheetAccess: (employeeId: number): Promise<void> =>
    apiClient.put(`/manager/resources/employees/${employeeId}/restore-timesheet-access`),

  aiSkillMatch: (projectId: number, requirement: string): Promise<{ results: SkillMatchResult[] }> =>
    postData('/manager/ai/skill-match', { projectId, requirement }, AI_API_TIMEOUT_MS),
  aiRiskSummary: (projectId: number): Promise<{ summary: string }> =>
    postData('/manager/ai/risk-summary', { projectId }, AI_API_TIMEOUT_MS),
  aiTeamBuild: (requirement: string): Promise<TeamBuildResult> =>
    postData('/manager/ai/team-build', { requirement }, AI_API_TIMEOUT_MS),
};
