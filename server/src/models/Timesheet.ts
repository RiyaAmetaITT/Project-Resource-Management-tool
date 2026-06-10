export interface Timesheet {
  id: number;
  employeeId: number;
  weekStartDate: Date;
  status: 'SUBMITTED';
  createdAt: Date;
}
