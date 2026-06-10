import { Role } from '../types/enums';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: Role;
  forcePasswordChange: boolean;
  isActive: boolean;
  createdAt: Date;
}
