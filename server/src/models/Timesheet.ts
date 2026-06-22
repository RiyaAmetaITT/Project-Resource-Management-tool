export interface Timesheet {
  id: number;
  resourceId: number;
  weekStartDate: Date;
  status: 'SUBMITTED' | 'MISSED';
  reminderCount: number;
  lastReminderSentAt: Date | null;
  createdAt: Date;
}
