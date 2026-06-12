import { Role } from '../types/enums';

export interface User {
  id: number;
  roleId: number;
  role: Role;
  managerId: number | null;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  department: string | null;
  designation: string | null;
  forcePasswordChange: boolean;
  isActive: boolean;
  createdAt: Date;
}
