import { ResourceStatus } from '../types/enums';

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  department?: string;
  designation?: string;
}

/** DTO for the Assign Manager operation (Screen 3.1.4). */
export interface AssignManagerDto {
  employeeUserId: number;
  managerId: number;
}

export interface EmployeeResponseDto {
  id: number;
  userId: number;
  managerId: number | null;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: ResourceStatus;
  totalUtilisation: number;
  isActive: boolean;
}
