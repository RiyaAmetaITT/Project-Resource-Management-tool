import { Role } from '../types/enums';

export interface LoginDto {
  username: string;
  password: string;
}

export interface ChangePasswordDto {
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponseDto {
  token: string;
  role: Role;
  userId: number;
  fullName: string;
  forcePasswordChange: boolean;
}
