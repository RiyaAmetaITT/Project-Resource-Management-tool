import { EmployeeStatus } from '../types/enums';

export interface Employee {
  id: number;
  userId: number;
  managerId: number | null;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: EmployeeStatus;
  totalUtilisation: number;
  isActive: boolean;
  createdAt: Date;
}
