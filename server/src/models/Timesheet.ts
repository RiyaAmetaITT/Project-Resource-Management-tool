export interface Timesheet {
  id: number;
  resourceId: number;
  weekStartDate: Date;
  status: 'SUBMITTED' | 'MISSED';
  createdAt: Date;
}
