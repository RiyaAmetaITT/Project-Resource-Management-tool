import apiClient from './baseClient';

export const managerApi = {
  getDashboard: () => apiClient.get('/manager/resources/dashboard').then((r) => r.data.data),
  getEmployeeDetail: (id: number) => apiClient.get(`/manager/resources/employees/${id}`).then((r) => r.data.data),

  allocate: (data: object) => apiClient.post('/manager/allocations', data).then((r) => r.data.data),
  endAllocation: (id: number) => apiClient.put(`/manager/allocations/${id}/end`),
  getProjectAllocations: (projectId: number) => apiClient.get(`/manager/projects/${projectId}/allocations`).then((r) => r.data.data),

  getMyProjects: () => apiClient.get('/manager/projects').then((r) => r.data.data),
  getProjectDetail: (id: number) => apiClient.get(`/manager/projects/${id}/detail`).then((r) => r.data.data),

  getTeamTimesheets: (week?: string) =>
    apiClient.get('/manager/timesheets', { params: { week } }).then((r) => r.data.data),

  aiSkillMatch: (projectId: number, requirement: string) =>
    apiClient.post('/manager/ai/skill-match', { projectId, requirement }).then((r) => r.data.data),
  aiRiskSummary: (projectId: number) =>
    apiClient.post('/manager/ai/risk-summary', { projectId }).then((r) => r.data.data),
};
