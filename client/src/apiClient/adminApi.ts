import apiClient from './baseClient';
import {
  AllocationSummary,
  CreateUserPayload,
  EmployeeDeactivatePreview,
  EmployeeSkillSummary,
  EmployeeSummary,
  MilestoneSummary,
  ProjectDetail,
  ProjectSummary,
  SystemConfigSummary,
  UserSummary,
} from '../types/admin';

interface ApiDataResponse<T> {
  data: T;
}

async function getData<T>(path: string): Promise<T> {
  const response = await apiClient.get<ApiDataResponse<T>>(path);
  return response.data.data;
}

async function postData<T>(path: string, body: unknown): Promise<T> {
  const response = await apiClient.post<ApiDataResponse<T>>(path, body);
  return response.data.data;
}

async function putData<T>(path: string, body: unknown): Promise<T> {
  const response = await apiClient.put<ApiDataResponse<T>>(path, body);
  return response.data.data;
}

async function putVoid(path: string, body?: unknown): Promise<void> {
  await apiClient.put(path, body);
}

async function postVoid(path: string, body: unknown): Promise<void> {
  await apiClient.post(path, body);
}

async function deleteVoid(path: string): Promise<void> {
  await apiClient.delete(path);
}

export const adminApi = {
  // Users
  createUser: (payload: CreateUserPayload): Promise<UserSummary> =>
    postData('/admin/users', payload),

  getAllUsers: (): Promise<UserSummary[]> => getData('/admin/users'),

  resetPassword: (id: number, newPassword: string): Promise<void> =>
    putVoid(`/admin/users/${id}/reset-password`, { newPassword }),

  deactivateUser: (id: number): Promise<void> => putVoid(`/admin/users/${id}/deactivate`),

  reactivateUser: (id: number): Promise<void> => putVoid(`/admin/users/${id}/reactivate`),

  // Employees
  getAllEmployees: (): Promise<EmployeeSummary[]> => getData('/admin/employees'),

  getEmployeeById: (id: number): Promise<EmployeeSummary> => getData(`/admin/employees/${id}`),

  getEmployeeDeactivatePreview: (id: number): Promise<EmployeeDeactivatePreview> =>
    getData(`/admin/employees/${id}/deactivate-preview`),

  updateEmployee: (id: number, payload: Record<string, string>): Promise<void> =>
    putVoid(`/admin/employees/${id}`, payload),

  deactivateEmployee: (id: number): Promise<void> =>
    putVoid(`/admin/employees/${id}/deactivate`),

  assignManager: (employeeUserId: number, managerId: number): Promise<void> =>
    putVoid('/admin/employees/assign-manager', { employeeUserId, managerId }),

  // Skills
  getEmployeeSkills: (employeeId: number): Promise<EmployeeSkillSummary[]> =>
    getData(`/admin/employees/${employeeId}/skills`),

  addSkill: (employeeId: number, payload: Record<string, string>): Promise<void> =>
    postVoid(`/admin/employees/${employeeId}/skills`, payload),

  updateSkill: (skillId: number, payload: Record<string, string>): Promise<void> =>
    putVoid(`/admin/skills/${skillId}`, payload),

  removeSkill: (skillId: number): Promise<void> => deleteVoid(`/admin/skills/${skillId}`),

  // Projects
  createProject: (payload: Record<string, unknown>): Promise<ProjectDetail> =>
    postData('/admin/projects', payload),

  getAllProjects: (): Promise<ProjectSummary[]> => getData('/admin/projects'),

  updateProject: (id: number, payload: Record<string, unknown>): Promise<void> =>
    putVoid(`/admin/projects/${id}`, payload),

  // Milestones
  getMilestones: (projectId: number): Promise<MilestoneSummary[]> =>
    getData(`/admin/projects/${projectId}/milestones`),

  addMilestone: (projectId: number, payload: Record<string, unknown>): Promise<void> =>
    postVoid(`/admin/projects/${projectId}/milestones`, payload),

  updateMilestoneStatus: (milestoneId: number, status: string): Promise<void> =>
    putVoid(`/admin/milestones/${milestoneId}/status`, { status }),

  // Allocations (read-only for admin)
  getAllAllocations: (): Promise<AllocationSummary[]> => getData('/admin/allocations'),

  // System Config
  getConfig: (): Promise<SystemConfigSummary> => getData('/admin/config'),

  updateConfig: (payload: Record<string, unknown>): Promise<SystemConfigSummary> =>
    putData('/admin/config', payload),
};
