import apiClient from './baseClient';

export const employeeApi = {
  submitTimesheet: (data: object) => apiClient.post('/employee/timesheets', data),
  getMyTimesheets: () => apiClient.get('/employee/timesheets').then((r) => r.data.data),
  checkMissedTimesheet: () => apiClient.get('/employee/timesheets/missed-check').then((r) => r.data.data),
  getMyAllocations: () => apiClient.get('/employee/allocations').then((r) => r.data.data),
};
