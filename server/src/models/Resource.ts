import { ResourceStatus } from '../types/enums';

export interface Resource {
  id: number;
  userId: number;
  status: ResourceStatus;
  totalUtilisation: number;
  timesheetAccessFrozen: boolean;
  timesheetFrozenWeekStart: Date | null;
  createdAt: Date;
}

export interface ResourceProfile extends Resource {
  fullName: string;
  email: string;
  department: string | null;
  designation: string | null;
  managerId: number | null;
  isActive: boolean;
}
