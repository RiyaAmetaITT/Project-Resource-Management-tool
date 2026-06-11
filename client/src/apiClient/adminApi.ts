import apiClient from './baseClient';

export const adminApi = {
  // Users
  createUser: (data: object) => apiClient.post('/admin/users', data).then((r) => r.data.data),
  getAllUsers: () => apiClient.get('/admin/users').then((r) => r.data.data),
  resetPassword: (id: number, newPassword: string) => apiClient.put(`/admin/users/${id}/reset-password`, { newPassword }),
  deactivateUser: (id: number) => apiClient.put(`/admin/users/${id}/deactivate`),
  reactivateUser: (id: number) => apiClient.put(`/admin/users/${id}/reactivate`),

  // Employees
  getAllEmployees: () => apiClient.get('/admin/employees').then((r) => r.data.data),
  getEmployeeDeactivatePreview: (id: number) =>
    apiClient.get(`/admin/employees/${id}/deactivate-preview`).then((r) => r.data.data),
  updateEmployee: (id: number, data: object) => apiClient.put(`/admin/employees/${id}`, data),
  deactivateEmployee: (id: number) => apiClient.put(`/admin/employees/${id}/deactivate`),
  assignManager: (employeeUserId: number, managerId: number) =>
    apiClient.put('/admin/employees/assign-manager', { employeeUserId, managerId }),

  // Skills
  getEmployeeSkills: (employeeId: number) => apiClient.get(`/admin/employees/${employeeId}/skills`).then((r) => r.data.data),
  addSkill: (employeeId: number, data: object) => apiClient.post(`/admin/employees/${employeeId}/skills`, data),
  updateSkill: (skillId: number, data: object) => apiClient.put(`/admin/skills/${skillId}`, data),
  removeSkill: (skillId: number) => apiClient.delete(`/admin/skills/${skillId}`),

  // Projects
  createProject: (data: object) => apiClient.post('/admin/projects', data).then((r) => r.data.data),
  getAllProjects: () => apiClient.get('/admin/projects').then((r) => r.data.data),
  updateProject: (id: number, data: object) => apiClient.put(`/admin/projects/${id}`, data),

  // Milestones
  getMilestones: (projectId: number) => apiClient.get(`/admin/projects/${projectId}/milestones`).then((r) => r.data.data),
  addMilestone: (projectId: number, data: object) => apiClient.post(`/admin/projects/${projectId}/milestones`, data),
  updateMilestoneStatus: (milestoneId: number, status: string) =>
    apiClient.put(`/admin/milestones/${milestoneId}/status`, { status }),

  // Allocations (read-only for admin)
  getAllAllocations: () => apiClient.get('/admin/allocations').then((r) => r.data.data),

  // System Config
  getConfig: () => apiClient.get('/admin/config').then((r) => r.data.data),
  updateConfig: (data: object) => apiClient.put('/admin/config', data).then((r) => r.data.data),
};
